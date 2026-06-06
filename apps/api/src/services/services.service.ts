import { Injectable, NotFoundException } from "@nestjs/common";
import { ContentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

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

  private mapService(service: {
    id: string;
    slug: string;
    titleAr: string;
    titleEn: string;
    summaryAr: string | null;
    summaryEn: string | null;
    contentAr: string | null;
    contentEn: string | null;
    icon: string | null;
    order: number;
    featured: boolean;
    status: ContentStatus;
  }) {
    return {
      id: service.id,
      slug: service.slug,
      titleAr: service.titleAr,
      titleEn: service.titleEn,
      summaryAr: service.summaryAr ?? "",
      summaryEn: service.summaryEn ?? "",
      contentAr: service.contentAr ?? "",
      contentEn: service.contentEn ?? "",
      icon: service.icon ?? "layers",
      order: service.order,
      featured: service.featured,
      status: this.mapStatus(service.status),
    };
  }

  async findPublished() {
    const items = await this.prisma.service.findMany({
      where: { deletedAt: null, status: ContentStatus.PUBLISHED },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return items.map((s) => this.mapService(s));
  }

  async findPublishedBySlug(slug: string) {
    const service = await this.prisma.service.findFirst({
      where: { slug, deletedAt: null, status: ContentStatus.PUBLISHED },
    });
    if (!service) throw new NotFoundException("Service not found");
    return this.mapService(service);
  }

  async findAllAdmin() {
    const items = await this.prisma.service.findMany({
      where: { deletedAt: null },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return items.map((s) => this.mapService(s));
  }

  async createAdmin(data: {
    slug: string;
    titleAr: string;
    titleEn: string;
    summaryAr?: string;
    summaryEn?: string;
    contentAr?: string;
    contentEn?: string;
    icon?: string;
    order?: number;
    featured?: boolean;
    status?: string;
  }) {
    const service = await this.prisma.service.create({
      data: {
        slug: data.slug,
        titleAr: data.titleAr,
        titleEn: data.titleEn,
        summaryAr: data.summaryAr,
        summaryEn: data.summaryEn,
        contentAr: data.contentAr,
        contentEn: data.contentEn,
        icon: data.icon,
        order: data.order ?? 0,
        featured: data.featured ?? false,
        status: this.parseStatus(data.status) ?? ContentStatus.DRAFT,
      },
    });
    return this.mapService(service);
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
      icon: string;
      order: number;
      featured: boolean;
      status: string;
    }>,
  ) {
    const { status, ...rest } = data;
    const service = await this.prisma.service.update({
      where: { id },
      data: {
        ...rest,
        ...(status !== undefined ? { status: this.parseStatus(status) } : {}),
      },
    });
    return this.mapService(service);
  }

  async removeAdmin(id: string) {
    await this.prisma.service.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Service deleted successfully" };
  }
}
