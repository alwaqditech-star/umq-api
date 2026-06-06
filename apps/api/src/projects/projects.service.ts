import { Injectable, NotFoundException } from "@nestjs/common";
import { ContentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

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
  }) {
    return {
      id: project.id,
      slug: project.slug,
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
      include: { category: true, coverMedia: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return items.map((p) => this.mapProject(p));
  }

  async findPublishedBySlug(slug: string) {
    const project = await this.prisma.project.findFirst({
      where: { slug, deletedAt: null, status: ContentStatus.PUBLISHED },
      include: { category: true, coverMedia: true },
    });
    if (!project) throw new NotFoundException("Project not found");
    return this.mapProject(project);
  }

  async findAllAdmin() {
    const items = await this.prisma.project.findMany({
      where: { deletedAt: null },
      include: { category: true, coverMedia: true },
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
  }) {
    const categoryId = await this.resolveCategoryId(data.categorySlug);
    const project = await this.prisma.project.create({
      data: {
        slug: data.slug,
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
      },
      include: { category: true },
    });
    return this.mapProject(project);
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
    }>,
  ) {
    const { status, categorySlug, technologies, ...rest } = data;
    const categoryId =
      categorySlug !== undefined
        ? await this.resolveCategoryId(categorySlug)
        : undefined;

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        ...(technologies !== undefined
          ? { technologies: this.parseTechnologies(technologies) }
          : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(status !== undefined ? { status: this.parseStatus(status) } : {}),
      },
      include: { category: true },
    });
    return this.mapProject(project);
  }

  async removeAdmin(id: string) {
    await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Project deleted successfully" };
  }
}
