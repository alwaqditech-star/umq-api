import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ContentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

const projectInclude = {
  category: true,
  coverMedia: true,
  images: {
    orderBy: { sortOrder: "asc" as const },
    include: { media: true },
  },
} as const;

type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: typeof projectInclude;
}>;

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

  private parseImageMediaIds(value: unknown): string[] | undefined {
    if (value === undefined) return undefined;
    if (!Array.isArray(value)) return [];
    return value.filter((id): id is string => typeof id === "string" && id.trim().length > 0);
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

  /** External https URL or uploaded media id for a single cover fallback. */
  private async resolveCoverMediaId(opts: {
    coverMediaId?: string | null;
    coverExternalUrl?: string;
    existingCoverMediaId?: string | null;
  }): Promise<string | null | undefined> {
    if (opts.coverMediaId === null) return null;

    const external = opts.coverExternalUrl?.trim();
    if (external && /^https?:\/\//i.test(external)) {
      if (opts.existingCoverMediaId) {
        const existing = await this.prisma.mediaLibrary.findFirst({
          where: { id: opts.existingCoverMediaId, deletedAt: null },
        });
        if (existing) {
          await this.prisma.mediaLibrary.update({
            where: { id: existing.id },
            data: { url: external },
          });
          return existing.id;
        }
      }

      const media = await this.prisma.mediaLibrary.create({
        data: {
          filename: "project-cover.jpg",
          mimeType: "image/jpeg",
          size: 0,
          storageKey: `external/projects/${randomUUID()}`,
          url: external,
          folder: "projects",
        },
      });
      return media.id;
    }

    const uploaded = opts.coverMediaId?.trim();
    if (uploaded) return uploaded;

    return undefined;
  }

  private async syncProjectImages(projectId: string, mediaIds: string[]) {
    const unique = [...new Set(mediaIds.filter(Boolean))];

    await this.prisma.projectImage.deleteMany({
      where: {
        projectId,
        ...(unique.length > 0
          ? { mediaId: { notIn: unique } }
          : {}),
      },
    });

    for (let i = 0; i < unique.length; i++) {
      const mediaId = unique[i]!;
      await this.prisma.projectImage.upsert({
        where: { projectId_mediaId: { projectId, mediaId } },
        create: { projectId, mediaId, sortOrder: i },
        update: { sortOrder: i },
      });
    }
  }

  private async reloadProject(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: projectInclude,
    });
    if (!project) throw new NotFoundException("Project not found");
    return this.mapProject(project);
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

  private mapProject(project: ProjectWithRelations) {
    const galleryUrls =
      project.images
        ?.map((row) => row.media?.url)
        .filter((url): url is string => Boolean(url)) ?? [];
    const galleryIds =
      project.images
        ?.map((row) => row.media?.id)
        .filter((id): id is string => Boolean(id)) ?? [];

    const imageUrls =
      galleryUrls.length > 0
        ? galleryUrls
        : project.coverMedia?.url
          ? [project.coverMedia.url]
          : [];
    const imageMediaIds =
      galleryIds.length > 0
        ? galleryIds
        : project.coverMedia?.id
          ? [project.coverMedia.id]
          : [];

    return {
      id: project.id,
      slug: project.slug,
      coverMediaId: imageMediaIds[0] ?? null,
      coverImageUrl: imageUrls[0] ?? "",
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
    coverMediaId?: string | null;
    coverExternalUrl?: string;
    imageMediaIds?: string[];
  }) {
    try {
      const categoryId = await this.resolveCategoryId(data.categorySlug);
      const slug = data.slug.trim();
      await this.releaseSoftDeletedSlug(slug);

      const galleryIds = this.parseImageMediaIds(data.imageMediaIds) ?? [];
      let coverMediaId: string | null | undefined;

      if (galleryIds.length > 0) {
        coverMediaId = galleryIds[0]!;
      } else {
        coverMediaId = await this.resolveCoverMediaId({
          coverMediaId: data.coverMediaId,
          coverExternalUrl: data.coverExternalUrl,
        });
      }

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
          coverMediaId: coverMediaId ?? null,
        },
      });

      const idsToSync =
        galleryIds.length > 0
          ? galleryIds
          : coverMediaId
            ? [coverMediaId]
            : [];
      if (idsToSync.length > 0) {
        await this.syncProjectImages(project.id, idsToSync);
      }

      return this.reloadProject(project.id);
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
      coverMediaId: string | null;
      coverExternalUrl: string;
      imageMediaIds: string[];
    }>,
  ) {
    try {
      const {
        status,
        categorySlug,
        technologies,
        coverMediaId,
        coverExternalUrl,
        imageMediaIds,
        ...rest
      } = data;

      const categoryId =
        categorySlug !== undefined
          ? await this.resolveCategoryId(categorySlug)
          : undefined;

      const existing = await this.prisma.project.findUnique({
        where: { id },
        select: { coverMediaId: true },
      });

      const galleryIds = this.parseImageMediaIds(imageMediaIds);
      let resolvedCover: string | null | undefined;

      if (galleryIds !== undefined) {
        resolvedCover = galleryIds.length > 0 ? galleryIds[0]! : null;
      } else {
        resolvedCover = await this.resolveCoverMediaId({
          coverMediaId,
          coverExternalUrl,
          existingCoverMediaId: existing?.coverMediaId,
        });
      }

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
          ...(resolvedCover !== undefined ? { coverMediaId: resolvedCover } : {}),
        },
      });

      if (galleryIds !== undefined) {
        await this.syncProjectImages(id, galleryIds);
      } else if (resolvedCover && galleryIds === undefined) {
        const currentImages = await this.prisma.projectImage.count({
          where: { projectId: id },
        });
        if (currentImages === 0 && resolvedCover) {
          await this.syncProjectImages(id, [resolvedCover]);
        }
      }

      return this.reloadProject(id);
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
