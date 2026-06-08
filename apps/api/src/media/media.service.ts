import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createReadStream, existsSync, mkdirSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { PrismaService } from "../prisma/prisma.service";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly uploadDir: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const configured =
      this.config.get<string>("UPLOAD_DIR") ??
      path.join(process.cwd(), "uploads");
    this.uploadDir = path.resolve(configured);
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  private blobToken(): string | undefined {
    return this.config.get<string>("BLOB_READ_WRITE_TOKEN")?.trim() || undefined;
  }

  private useBlobStorage(): boolean {
    return Boolean(this.blobToken());
  }

  /** Vercel serverless has no persistent local disk — uploads need Blob storage. */
  private requiresBlobStorage(): boolean {
    return process.env.VERCEL === "1";
  }

  private assertUploadStorageReady(): void {
    if (this.requiresBlobStorage() && !this.useBlobStorage()) {
      throw new ServiceUnavailableException(
        "Media uploads on Vercel require BLOB_READ_WRITE_TOKEN. " +
          "Create a Blob store in Vercel → Storage and link it to the API project, then redeploy.",
      );
    }
  }

  private fileUrl(storageKey: string): string {
    const encoded = storageKey
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `/api/v1/media/files/${encoded}`;
  }

  list() {
    return this.prisma.mediaLibrary.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async findByStorageKey(storageKey: string) {
    return this.prisma.mediaLibrary.findFirst({
      where: { storageKey, deletedAt: null },
    });
  }

  private normalizeFilename(originalname: string): string {
    let name = originalname;
    try {
      const utf8 = Buffer.from(originalname, "latin1").toString("utf8");
      if (utf8 && utf8 !== originalname && !utf8.includes("\uFFFD")) {
        name = utf8;
      }
    } catch {
      /* keep original */
    }

    const ext = path.extname(name).toLowerCase() || ".jpg";
    const base = path
      .basename(name, path.extname(name))
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);

    if (base && /^[a-zA-Z0-9._-]+$/.test(base)) {
      return `${base}${ext}`;
    }
    return `image-${randomUUID().slice(0, 8)}${ext}`;
  }

  async upload(
    file: Express.Multer.File,
    meta: { folder?: string; altAr?: string; altEn?: string },
    uploadedById?: string,
  ) {
    if (!file) throw new BadRequestException("No file provided");
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException("File type not allowed");
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException("File exceeds 10MB limit");
    }

    this.assertUploadStorageReady();

    const ext = path.extname(this.normalizeFilename(file.originalname)) || ".jpg";
    const storageKey = `${meta.folder ?? "general"}/${randomUUID()}${ext}`;

    let publicUrl: string;

    if (this.useBlobStorage()) {
      const buffer = file.buffer ?? (file.path ? await import("node:fs/promises").then((fs) => fs.readFile(file.path!)) : null);
      if (!buffer) throw new BadRequestException("Invalid upload payload");

      const { put } = await import("@vercel/blob");
      const blob = await put(storageKey, buffer, {
        access: "public",
        token: this.blobToken(),
        contentType: file.mimetype,
        addRandomSuffix: false,
      });
      publicUrl = blob.url;
    } else {
      const absolutePath = path.join(this.uploadDir, storageKey);
      await mkdir(path.dirname(absolutePath), { recursive: true });
      if (file.buffer) {
        await writeFile(absolutePath, file.buffer);
      } else if (file.path) {
        const { copyFile } = await import("node:fs/promises");
        await copyFile(file.path, absolutePath);
      } else {
        throw new BadRequestException("Invalid upload payload");
      }
      publicUrl = this.fileUrl(storageKey);
    }

    return this.prisma.mediaLibrary.create({
      data: {
        filename: this.normalizeFilename(file.originalname),
        mimeType: file.mimetype,
        size: file.size,
        storageKey,
        url: publicUrl,
        folder: meta.folder ?? "general",
        altAr: meta.altAr,
        altEn: meta.altEn,
        uploadedById,
      },
    });
  }

  async remove(id: string) {
    const item = await this.prisma.mediaLibrary.findFirst({
      where: { id, deletedAt: null },
    });
    if (!item) throw new NotFoundException("Media not found");

    if (item.url.includes("blob.vercel-storage.com") && this.blobToken()) {
      const { del } = await import("@vercel/blob");
      await del(item.url, { token: this.blobToken() }).catch(() => undefined);
    } else {
      const absolutePath = path.join(this.uploadDir, item.storageKey);
      if (existsSync(absolutePath)) {
        await unlink(absolutePath).catch(() => undefined);
      }
    }

    await this.prisma.mediaLibrary.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Media deleted" };
  }

  resolveFileStream(storageKey: string): {
    stream: Readable;
    mimeType: string;
  } {
    const safeKey = storageKey.replace(/\.\./g, "");
    const absolutePath = path.join(this.uploadDir, safeKey);
    if (!existsSync(absolutePath)) {
      throw new NotFoundException("File not found");
    }
    return {
      stream: createReadStream(absolutePath),
      mimeType: "application/octet-stream",
    };
  }
}
