import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ContentStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

const projectInclude = {
  category: true,
  coverMedia: true,
} as const;

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

  /** Same pattern as blog seed: external https URL or uploaded media id. */
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
    coverMedia?: {
      id: string;
      url: string;
      altAr: string | null;
      altEn: string | null;
    } | null;
  }) {
    return {
      id: project.id,
      slug: project.slug,
      coverMediaId: project.coverMedia?.id ?? null,
      coverImageUrl: project.coverMedia?.url ?? "",
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
  }) {
    try {
      const categoryId = await this.resolveCategoryId(data.categorySlug);
      const slug = data.slug.trim();
      await this.releaseSoftDeletedSlug(slug);

      const coverMediaId = await this.resolveCoverMediaId({
        coverMediaId: data.coverMediaId,
        coverExternalUrl: data.coverExternalUrl,
      });

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
        include: projectInclude,
      });
      return this.mapProject(project);
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
    }>,
  ) {
    try {
      const {
        status,
        categorySlug,
        technologies,
        coverMediaId,
        coverExternalUrl,
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

      const resolvedCover = await this.resolveCoverMediaId({
        coverMediaId,
        coverExternalUrl,
        existingCoverMediaId: existing?.coverMediaId,
      });

      if (rest.slug !== undefined) {
        const slug = rest.slug.trim();
        await this.releaseSoftDeletedSlug(slug);
        rest.slug = slug;
      }

      const project = await this.prisma.project.update({
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
        include: projectInclude,
      });
      return this.mapProject(project);
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
