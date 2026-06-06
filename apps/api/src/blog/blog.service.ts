import { Injectable, NotFoundException } from "@nestjs/common";
import { ContentStatus, Locale } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === "string");
}

@Injectable()
export class BlogService {
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

  private mapPost(post: {
    id: string;
    slug: string;
    title: string;
    content: string;
    excerpt: string | null;
    locale: Locale;
    publishedAt: Date | null;
    readingTime: number | null;
    status: ContentStatus;
    tags: unknown;
    category: { nameAr: string; nameEn: string; slug: string } | null;
    author: { firstName: string; lastName: string } | null;
    coverMedia: {
      id: string;
      url: string;
      altAr: string | null;
      altEn: string | null;
    } | null;
  }) {
    const authorName = post.author
      ? `${post.author.firstName} ${post.author.lastName}`.trim()
      : "UMQ";
    const loc = post.locale === Locale.EN ? ("en" as const) : ("ar" as const);
    const categoryAr = post.category?.nameAr ?? "";
    const categoryEn = post.category?.nameEn ?? categoryAr;

    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      content: post.content,
      excerpt: post.excerpt ?? "",
      locale: loc,
      titleAr: post.title,
      titleEn: post.title,
      excerptAr: post.excerpt ?? "",
      excerptEn: post.excerpt ?? "",
      category: loc === "ar" ? categoryAr : categoryEn,
      categoryAr,
      categoryEn,
      categorySlug: post.category?.slug ?? "",
      author: authorName,
      coverMediaId: post.coverMedia?.id ?? null,
      coverImageUrl: post.coverMedia?.url ?? "",
      coverAltAr: post.coverMedia?.altAr ?? "",
      coverAltEn: post.coverMedia?.altEn ?? "",
      tags: parseTags(post.tags),
      publishedAt: post.publishedAt?.toISOString() ?? "",
      readingTime: post.readingTime ?? 5,
      status: this.mapStatus(post.status),
    };
  }

  private postInclude() {
    return {
      category: true,
      author: true,
      coverMedia: true,
    } as const;
  }

  async findPublished(locale?: string) {
    const items = await this.prisma.blogPost.findMany({
      where: {
        deletedAt: null,
        status: ContentStatus.PUBLISHED,
        ...(locale === "en" ? { locale: Locale.EN } : { locale: Locale.AR }),
      },
      include: this.postInclude(),
      orderBy: { publishedAt: "desc" },
    });
    return items.map((p) => this.mapPost(p));
  }

  async findPublishedBySlug(slug: string, locale?: string) {
    const post = await this.prisma.blogPost.findFirst({
      where: {
        slug,
        deletedAt: null,
        status: ContentStatus.PUBLISHED,
        ...(locale === "en" ? { locale: Locale.EN } : { locale: Locale.AR }),
      },
      include: this.postInclude(),
    });
    if (!post) throw new NotFoundException("Post not found");
    return this.mapPost(post);
  }

  async findRelated(slug: string, locale?: string, limit = 3) {
    const current = await this.prisma.blogPost.findFirst({
      where: {
        slug,
        deletedAt: null,
        status: ContentStatus.PUBLISHED,
        ...(locale === "en" ? { locale: Locale.EN } : { locale: Locale.AR }),
      },
    });
    if (!current) return [];

    const items = await this.prisma.blogPost.findMany({
      where: {
        deletedAt: null,
        status: ContentStatus.PUBLISHED,
        locale: current.locale,
        slug: { not: slug },
        ...(current.categoryId ? { categoryId: current.categoryId } : {}),
      },
      include: this.postInclude(),
      orderBy: { publishedAt: "desc" },
      take: limit,
    });
    return items.map((p) => this.mapPost(p));
  }

  async findAllAdmin() {
    const items = await this.prisma.blogPost.findMany({
      where: { deletedAt: null },
      include: this.postInclude(),
      orderBy: { createdAt: "desc" },
    });
    return items.map((p) => this.mapPost(p));
  }

  async createAdmin(data: {
    slug: string;
    title: string;
    content: string;
    excerpt?: string;
    locale?: string;
    readingTime?: number;
    publishedAt?: string;
    status?: string;
    categoryId?: string;
    authorId?: string;
    coverMediaId?: string;
    tags?: string[];
  }) {
    const post = await this.prisma.blogPost.create({
      data: {
        slug: data.slug,
        title: data.title,
        content: data.content,
        excerpt: data.excerpt,
        locale: data.locale === "en" ? Locale.EN : Locale.AR,
        readingTime: data.readingTime ?? 5,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
        status: this.parseStatus(data.status) ?? ContentStatus.DRAFT,
        categoryId: data.categoryId,
        authorId: data.authorId,
        coverMediaId: data.coverMediaId,
        tags: data.tags ?? [],
      },
      include: this.postInclude(),
    });
    return this.mapPost(post);
  }

  async updateAdmin(
    id: string,
    data: Partial<{
      slug: string;
      title: string;
      content: string;
      excerpt: string;
      locale: string;
      readingTime: number;
      publishedAt: string;
      status: string;
      categoryId: string | null;
      authorId: string | null;
      coverMediaId: string | null;
      tags: string[];
    }>,
  ) {
    const { status, publishedAt, locale, tags, ...rest } = data;
    const post = await this.prisma.blogPost.update({
      where: { id },
      data: {
        ...rest,
        ...(tags !== undefined ? { tags } : {}),
        ...(locale !== undefined
          ? { locale: locale === "en" ? Locale.EN : Locale.AR }
          : {}),
        ...(publishedAt !== undefined
          ? { publishedAt: publishedAt ? new Date(publishedAt) : null }
          : {}),
        ...(status !== undefined ? { status: this.parseStatus(status) } : {}),
      },
      include: this.postInclude(),
    });
    return this.mapPost(post);
  }

  async removeAdmin(id: string) {
    await this.prisma.blogPost.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Post deleted successfully" };
  }
}
