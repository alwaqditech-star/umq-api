import {
  BadRequestException,
  Injectable,
  NotFoundException,
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

  private publicBaseUrl(): string {
    const port = this.config.get<string>("API_PORT") ?? "4001";
    const explicit = this.config.get<string>("PUBLIC_API_URL");
    if (explicit) return explicit.replace(/\/$/, "");
    return `http://127.0.0.1:${port}/api/v1`;
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

    const ext = path.extname(file.originalname) || "";
    const storageKey = `${meta.folder ?? "general"}/${randomUUID()}${ext}`;
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

    return this.prisma.mediaLibrary.create({
      data: {
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey,
        url: this.fileUrl(storageKey),
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

    const absolutePath = path.join(this.uploadDir, item.storageKey);
    if (existsSync(absolutePath)) {
      await unlink(absolutePath).catch(() => undefined);
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
