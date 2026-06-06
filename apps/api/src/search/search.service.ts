import { Injectable } from "@nestjs/common";
import { ContentStatus, Locale } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async searchPublic(q: string, locale?: string) {
    const term = q.trim();
    if (!term || term.length < 2) {
      return { services: [], projects: [], posts: [] };
    }

    const loc = locale === "en" ? Locale.EN : Locale.AR;
    const contains = { contains: term };

    const [services, projects, posts] = await Promise.all([
      this.prisma.service.findMany({
        where: {
          deletedAt: null,
          status: ContentStatus.PUBLISHED,
          OR: [
            { titleAr: contains },
            { titleEn: contains },
            { summaryAr: contains },
            { summaryEn: contains },
          ],
        },
        take: 6,
        orderBy: { order: "asc" },
      }),
      this.prisma.project.findMany({
        where: {
          deletedAt: null,
          status: ContentStatus.PUBLISHED,
          OR: [
            { titleAr: contains },
            { titleEn: contains },
            { summaryAr: contains },
            { summaryEn: contains },
          ],
        },
        take: 6,
        orderBy: { order: "asc" },
      }),
      this.prisma.blogPost.findMany({
        where: {
          deletedAt: null,
          status: ContentStatus.PUBLISHED,
          locale: loc,
          OR: [{ title: contains }, { excerpt: contains }],
        },
        take: 6,
        orderBy: { publishedAt: "desc" },
        include: { category: true, coverMedia: true },
      }),
    ]);

    return {
      services: services.map((s) => ({
        type: "service" as const,
        slug: s.slug,
        titleAr: s.titleAr,
        titleEn: s.titleEn,
        summaryAr: s.summaryAr ?? "",
        summaryEn: s.summaryEn ?? "",
      })),
      projects: projects.map((p) => ({
        type: "project" as const,
        slug: p.slug,
        titleAr: p.titleAr,
        titleEn: p.titleEn,
        summaryAr: p.summaryAr ?? "",
        summaryEn: p.summaryEn ?? "",
      })),
      posts: posts.map((p) => ({
        type: "post" as const,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt ?? "",
        coverImageUrl: p.coverMedia?.url ?? "",
        publishedAt: p.publishedAt?.toISOString() ?? "",
      })),
    };
  }
}
