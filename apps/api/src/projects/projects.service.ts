import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ContentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

const projectInclude = {
  category: true,
  coverMedia: true,
  images: {
    include: { media: true },
    orderBy: { sortOrder: "asc" as const },
  },
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseTechnologies(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    return [];
  }

  private parseImageMediaIds(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) {
          return parsed.filter((item): item is string => typeof item === "string");
        }
      } catch {
        return value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    return [];
  }

  private mapStatus(status: ContentStatus): "published" | "draft" | "inactive" {
    if (status === ContentStatus.PUBLISHED) return "published";
    if (status === ContentStatus.DRAFT) return "draft";
    return "inactive";
  }

  private parseStatus(status?: string): ContentStatus | undefined {
    if (status === "published") return ContentStatus.PUBLISHED;
    if (status === "draft") return ContentStatus.DRAFT;
    if (status === "inactive") return ContentStatus.ARCHIVED;
    return undefined;
  }

  private async resolveCategoryId(categorySlug?: string) {
    if (!categorySlug) return null;
    const cat = await this.prisma.projectCategory.findFirst({
      where: { slug: categorySlug, deletedAt: null },
    });
    return cat?.id ?? null;
  }

  private async syncProjectImages(projectId: string, mediaIds: string[]) {
    await this.prisma.projectImage.deleteMany({ where: { projectId } });
    if (mediaIds.length === 0) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { coverMediaId: null },
      });
      return;
    }

    await this.prisma.projectImage.createMany({
      data: mediaIds.map((mediaId, sortOrder) => ({
        id: randomUUID(),
        projectId,
        mediaId,
        sortOrder,
      })),
    });

    await this.prisma.project.update({
      where: { id: projectId },
      data: { coverMediaId: mediaIds[0] },
    });
  }

  private async releaseSoftDeletedSlug(slug: string) {
    const existing = await this.prisma.project.findUnique({
      where: { slug },
      select: { id: true, deletedAt: true },
    });
    if (!existing?.deletedAt) return;
    await this.prisma.project.update({
      where: { id: existing.id },
      data: { slug: `${slug}__archived__${existing.id.slice(0, 8)}` },
    });
  }
  private handleWriteError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictException("Project slug already exists");
    }
    throw error;
  }

  private mapProject(project: {
    id: string;
    slug: string;
    titleAr: string;
    titleEn: string;
    summaryAr: string | null;
    summaryEn: string | null;
    contentAr: string | null;
    contentEn: string | null;
    clientName: string | null;
    technologies: unknown;
    order: number;
    featured: boolean;
    status: ContentStatus;
    categoryId: string | null;
    category: { nameAr: string; nameEn: string; slug: string } | null;
    coverMedia?: { url: string } | null;
    images?: { mediaId: string; media: { url: string } }[];
  }) {
    const imageUrls =
      project.images?.map((img) => img.media.url).filter(Boolean) ?? [];
    const imageMediaIds =
      project.images?.map((img) => img.mediaId).filter(Boolean) ?? [];
    const coverImageUrl =
      imageUrls[0] ?? project.coverMedia?.url ?? "";

    return {
      id: project.id,
      slug: project.slug,
      coverImageUrl,
      imageUrls,
      imageMediaIds,
      titleAr: project.titleAr,
      titleEn: project.titleEn,
      summaryAr: project.summaryAr ?? "",
      summaryEn: project.summaryEn ?? "",
      contentAr: project.contentAr ?? "",
      contentEn: project.contentEn ?? "",
      clientName: project.clientName ?? "",
      technologies: this.parseTechnologies(project.technologies),
      category: project.category?.nameAr ?? "",
      categoryId: project.categoryId,
      featured: project.featured,
      order: project.order,
      status: this.mapStatus(project.status),
    };
  }

  async findPublished(category?: string) {
    const items = await this.prisma.project.findMany({
      where: {
        deletedAt: null,
        status: ContentStatus.PUBLISHED,
        ...(category ? { category: { slug: category, deletedAt: null } } : {}),
      },
      include: projectInclude,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return items.map((p) => this.mapProject(p));
  }

  async findPublishedBySlug(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: { slug, deletedAt: null, status: ContentStatus.PUBLISHED },
      include: projectInclude,
    });
    if (!project) throw new NotFoundException("Project not found");
    return this.mapProject(project);
  }

  async findAllAdmin() {
    const items = await this.prisma.project.findMany({
      where: { deletedAt: null },
      include: projectInclude,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return items.map((p) => this.mapProject(p));
  }

  async createAdmin(data: {
    slug: string;
    titleAr: string;
    titleEn: string;
    summaryAr?: string;
    summaryEn?: string;
    contentAr?: string;
    contentEn?: string;
    clientName?: string;
    technologies?: string[] | string;
    categorySlug?: string;
    order?: number;
    featured?: boolean;
    status?: string;
    imageMediaIds?: string[] | string;
    coverMediaId?: string;
  }) {
    try {
      const categoryId = await this.resolveCategoryId(data.categorySlug);
      const imageMediaIds = this.parseImageMediaIds(
        data.imageMediaIds ?? data.coverMediaId,
      );
      const slug = data.slug.trim();
      await this.releaseSoftDeletedSlug(slug);

      const project = await this.prisma.project.create({
        data: {
          slug,
          titleAr: data.titleAr,
          titleEn: data.titleEn,
          summaryAr: data.summaryAr,
          summaryEn: data.summaryEn,
          contentAr: data.contentAr,
          contentEn: data.contentEn,
          clientName: data.clientName,
          technologies: this.parseTechnologies(data.technologies),
          categoryId,
          order: data.order ?? 0,
          featured: data.featured ?? false,
          status: this.parseStatus(data.status) ?? ContentStatus.DRAFT,
          coverMediaId: imageMediaIds[0] ?? null,
        },
      });

      if (imageMediaIds.length > 0) {
        await this.syncProjectImages(project.id, imageMediaIds);
      }

      const refreshed = await this.prisma.project.findUniqueOrThrow({
        where: { id: project.id },
        include: projectInclude,
      });
      return this.mapProject(refreshed);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async updateAdmin(
    id: string,
    data: Partial<{
      slug: string;
      titleAr: string;
      titleEn: string;
      summaryAr: string;
      summaryEn: string;
      contentAr: string;
      contentEn: string;
      clientName: string;
      technologies: string[] | string;
      categorySlug: string;
      order: number;
      featured: boolean;
      status: string;
      imageMediaIds: string[] | string;
      coverMediaId: string | null;
    }>,
  ) {
    try {
      const { status, categorySlug, technologies, imageMediaIds, coverMediaId, ...rest } =
        data;
      const categoryId =
        categorySlug !== undefined
          ? await this.resolveCategoryId(categorySlug)
          : undefined;

      const parsedImageIds =
        imageMediaIds !== undefined
          ? this.parseImageMediaIds(imageMediaIds)
          : coverMediaId !== undefined
            ? this.parseImageMediaIds(coverMediaId ? [coverMediaId] : [])
            : undefined;

      if (rest.slug !== undefined) {
        const slug = rest.slug.trim();
        await this.releaseSoftDeletedSlug(slug);
        rest.slug = slug;
      }

      await this.prisma.project.update({
        where: { id },
        data: {
          ...rest,
          ...(technologies !== undefined
            ? { technologies: this.parseTechnologies(technologies) }
            : {}),
          ...(categoryId !== undefined ? { categoryId } : {}),
          ...(status !== undefined ? { status: this.parseStatus(status) } : {}),
          ...(parsedImageIds !== undefined
            ? { coverMediaId: parsedImageIds[0] ?? null }
            : {}),
        },
      });

      if (parsedImageIds !== undefined) {
        await this.syncProjectImages(id, parsedImageIds);
      }

      const refreshed = await this.prisma.project.findUniqueOrThrow({
        where: { id },
        include: projectInclude,
      });
      return this.mapProject(refreshed);
    } catch (error) {
      this.handleWriteError(error);
    }
  }

  async removeAdmin(id: string) {
    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Project deleted successfully" };
  }
}
