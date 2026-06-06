import { Injectable } from "@nestjs/common";
import { ContentStatus, Locale } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapContentStatus(
    status: ContentStatus,
  ): "published" | "draft" | "inactive" {
    if (status === ContentStatus.PUBLISHED) return "published";
    if (status === ContentStatus.DRAFT) return "draft";
    return "inactive";
  }

  private parseContentStatus(status?: string): ContentStatus | undefined {
    if (status === "published") return ContentStatus.PUBLISHED;
    if (status === "draft") return ContentStatus.DRAFT;
    if (status === "inactive") return ContentStatus.ARCHIVED;
    return undefined;
  }

  // ─── Testimonials ─────────────────────────────────────────────────────────

  listTestimonialsAdmin() {
    return this.prisma.testimonial
      .findMany({
        where: { deletedAt: null },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      })
      .then((items) =>
        items.map((t) => ({
          id: t.id,
          authorAr: t.authorAr,
          authorEn: t.authorEn,
          companyAr: t.companyAr ?? "",
          companyEn: t.companyEn ?? "",
          contentAr: t.contentAr,
          contentEn: t.contentEn,
          rating: t.rating ?? 5,
          order: t.order,
          status: this.mapContentStatus(t.status),
        })),
      );
  }

  async createTestimonial(data: {
    authorAr: string;
    authorEn: string;
    companyAr?: string;
    companyEn?: string;
    contentAr: string;
    contentEn: string;
    rating?: number;
    order?: number;
    status?: string;
  }) {
    const t = await this.prisma.testimonial.create({
      data: {
        authorAr: data.authorAr,
        authorEn: data.authorEn,
        companyAr: data.companyAr,
        companyEn: data.companyEn,
        contentAr: data.contentAr,
        contentEn: data.contentEn,
        rating: data.rating ?? 5,
        order: data.order ?? 0,
        status: this.parseContentStatus(data.status) ?? ContentStatus.DRAFT,
      },
    });
    return {
      id: t.id,
      authorAr: t.authorAr,
      authorEn: t.authorEn,
      companyAr: t.companyAr ?? "",
      companyEn: t.companyEn ?? "",
      contentAr: t.contentAr,
      contentEn: t.contentEn,
      rating: t.rating ?? 5,
      order: t.order,
      status: this.mapContentStatus(t.status),
    };
  }

  async updateTestimonial(
    id: string,
    data: Partial<{
      authorAr: string;
      authorEn: string;
      companyAr: string;
      companyEn: string;
      contentAr: string;
      contentEn: string;
      rating: number;
      order: number;
      status: string;
    }>,
  ) {
    const { status, ...rest } = data;
    const t = await this.prisma.testimonial.update({
      where: { id },
      data: {
        ...rest,
        ...(status !== undefined
          ? { status: this.parseContentStatus(status) }
          : {}),
      },
    });
    return {
      id: t.id,
      authorAr: t.authorAr,
      authorEn: t.authorEn,
      companyAr: t.companyAr ?? "",
      companyEn: t.companyEn ?? "",
      contentAr: t.contentAr,
      contentEn: t.contentEn,
      rating: t.rating ?? 5,
      order: t.order,
      status: this.mapContentStatus(t.status),
    };
  }

  async removeTestimonial(id: string) {
    await this.prisma.testimonial.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Testimonial deleted" };
  }

  // ─── Team members ─────────────────────────────────────────────────────────

  listTeamAdmin() {
    return this.prisma.teamMember
      .findMany({
        where: { deletedAt: null },
        orderBy: [{ order: "asc" }],
      })
      .then((rows) =>
        rows.map((m) => ({
          id: m.id,
          nameAr: m.nameAr,
          nameEn: m.nameEn,
          roleAr: m.roleAr,
          roleEn: m.roleEn,
          bioAr: m.bioAr ?? "",
          bioEn: m.bioEn ?? "",
          order: m.order,
          status: this.mapContentStatus(m.status),
        })),
      );
  }

  listTeamPublic() {
    return this.prisma.teamMember
      .findMany({
        where: { deletedAt: null, status: ContentStatus.PUBLISHED },
        orderBy: [{ order: "asc" }],
      })
      .then((rows) =>
        rows.map((m) => ({
          id: m.id,
          nameAr: m.nameAr,
          nameEn: m.nameEn,
          roleAr: m.roleAr,
          roleEn: m.roleEn,
          bioAr: m.bioAr ?? "",
          bioEn: m.bioEn ?? "",
        })),
      );
  }

  async createTeam(data: Record<string, unknown>) {
    const m = await this.prisma.teamMember.create({
      data: {
        nameAr: String(data.nameAr),
        nameEn: String(data.nameEn),
        roleAr: String(data.roleAr),
        roleEn: String(data.roleEn),
        bioAr: data.bioAr ? String(data.bioAr) : undefined,
        bioEn: data.bioEn ? String(data.bioEn) : undefined,
        order: Number(data.order ?? 0),
        status:
          this.parseContentStatus(
            typeof data.status === "string" ? data.status : undefined,
          ) ?? ContentStatus.DRAFT,
      },
    });
    return {
      id: m.id,
      nameAr: m.nameAr,
      nameEn: m.nameEn,
      status: this.mapContentStatus(m.status),
    };
  }

  async updateTeam(id: string, data: Record<string, unknown>) {
    const status =
      typeof data.status === "string"
        ? this.parseContentStatus(data.status)
        : undefined;
    const m = await this.prisma.teamMember.update({
      where: { id },
      data: {
        ...(data.nameAr !== undefined ? { nameAr: String(data.nameAr) } : {}),
        ...(data.nameEn !== undefined ? { nameEn: String(data.nameEn) } : {}),
        ...(data.roleAr !== undefined ? { roleAr: String(data.roleAr) } : {}),
        ...(data.roleEn !== undefined ? { roleEn: String(data.roleEn) } : {}),
        ...(data.bioAr !== undefined ? { bioAr: String(data.bioAr) } : {}),
        ...(data.bioEn !== undefined ? { bioEn: String(data.bioEn) } : {}),
        ...(data.order !== undefined ? { order: Number(data.order) } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });
    return { id: m.id, status: this.mapContentStatus(m.status) };
  }

  async removeTeam(id: string) {
    await this.prisma.teamMember.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Team member deleted" };
  }

  // ─── Partners ─────────────────────────────────────────────────────────────

  listPartnersAdmin() {
    return this.prisma.partner
      .findMany({
        where: { deletedAt: null },
        orderBy: [{ order: "asc" }],
      })
      .then((rows) =>
        rows.map((p) => ({
          id: p.id,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          url: p.url ?? "",
          order: p.order,
          status: this.mapContentStatus(p.status),
        })),
      );
  }

  listPartnersPublic() {
    return this.prisma.partner
      .findMany({
        where: { deletedAt: null, status: ContentStatus.PUBLISHED },
        orderBy: [{ order: "asc" }],
      })
      .then((rows) =>
        rows.map((p) => ({
          id: p.id,
          nameAr: p.nameAr,
          nameEn: p.nameEn,
          url: p.url ?? "",
        })),
      );
  }

  async createPartner(data: Record<string, unknown>) {
    const p = await this.prisma.partner.create({
      data: {
        nameAr: String(data.nameAr),
        nameEn: String(data.nameEn),
        url: data.url ? String(data.url) : undefined,
        order: Number(data.order ?? 0),
        status:
          this.parseContentStatus(
            typeof data.status === "string" ? data.status : undefined,
          ) ?? ContentStatus.DRAFT,
      },
    });
    return { id: p.id, status: this.mapContentStatus(p.status) };
  }

  async updatePartner(id: string, data: Record<string, unknown>) {
    const status =
      typeof data.status === "string"
        ? this.parseContentStatus(data.status)
        : undefined;
    const p = await this.prisma.partner.update({
      where: { id },
      data: {
        ...(data.nameAr !== undefined ? { nameAr: String(data.nameAr) } : {}),
        ...(data.nameEn !== undefined ? { nameEn: String(data.nameEn) } : {}),
        ...(data.url !== undefined ? { url: String(data.url) } : {}),
        ...(data.order !== undefined ? { order: Number(data.order) } : {}),
        ...(status !== undefined ? { status } : {}),
      },
    });
    return { id: p.id, status: this.mapContentStatus(p.status) };
  }

  async removePartner(id: string) {
    await this.prisma.partner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Partner deleted" };
  }

  // ─── Settings ─────────────────────────────────────────────────────────────

  listSettings() {
    return this.prisma.setting.findMany({ orderBy: { key: "asc" } });
  }

  async upsertSetting(key: string, value: unknown, group?: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: { value: value as object, ...(group ? { group } : {}) },
      create: { key, value: value as object, group: group ?? "general" },
    });
  }

  getSetting(key: string) {
    return this.prisma.setting.findUnique({ where: { key } });
  }

  // ─── Home section registry (visibility / order / labels) ─────────────────

  listHomeSectionsPublic() {
    return this.prisma.homeSection
      .findMany({
        where: { isEnabled: true },
        orderBy: { sortOrder: "asc" },
      })
      .then((rows) =>
        rows.map((s) => ({
          key: s.key,
          labelAr: s.labelAr,
          labelEn: s.labelEn,
          sortOrder: s.sortOrder,
        })),
      );
  }

  listHomeSectionsAdmin() {
    return this.prisma.homeSection.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async updateHomeSection(
    id: string,
    data: Partial<{
      labelAr: string;
      labelEn: string;
      isEnabled: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.prisma.homeSection.update({ where: { id }, data });
  }

  async reorderHomeSections(items: { id: string; sortOrder: number }[]) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.homeSection.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    );
    return this.listHomeSectionsAdmin();
  }

  isHomeSectionEnabled(key: string) {
    return this.prisma.homeSection
      .findUnique({ where: { key } })
      .then((s) => s?.isEnabled ?? true);
  }

  getPublicSettings() {
    return this.prisma.setting
      .findMany({
        where: {
          key: {
            in: ["company.name", "contact.info"],
          },
        },
      })
      .then((rows) => {
        const map: Record<string, unknown> = {};
        for (const row of rows) {
          map[row.key] = row.value;
        }
        return map;
      });
  }

  // ─── Website sections (content blocks) ────────────────────────────────────

  listSectionsAdmin() {
    return this.prisma.websiteSection.findMany({
      where: { deletedAt: null },
      orderBy: { key: "asc" },
    });
  }

  getSectionPublic(key: string, locale?: string) {
    const loc =
      locale === "en" ? Locale.EN : locale === "ar" ? Locale.AR : undefined;
    return this.prisma.websiteSection.findFirst({
      where: {
        key,
        deletedAt: null,
        status: ContentStatus.PUBLISHED,
        ...(loc !== undefined ? { locale: loc } : {}),
      },
    });
  }

  async upsertSection(data: {
    key: string;
    type: string;
    content: object;
    locale?: string;
    status?: string;
  }) {
    const locale =
      data.locale === "en"
        ? Locale.EN
        : data.locale === "ar"
          ? Locale.AR
          : null;
    return this.prisma.websiteSection.upsert({
      where: {
        key_locale: { key: data.key, locale: locale ?? Locale.AR },
      },
      update: {
        type: data.type,
        content: data.content,
        status: this.parseContentStatus(data.status) ?? ContentStatus.PUBLISHED,
      },
      create: {
        key: data.key,
        type: data.type,
        content: data.content,
        locale: locale ?? Locale.AR,
        status: this.parseContentStatus(data.status) ?? ContentStatus.DRAFT,
      },
    });
  }

  async removeSection(id: string) {
    await this.prisma.websiteSection.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Section deleted" };
  }

  // ─── SEO pages ────────────────────────────────────────────────────────────

  listSeoAdmin() {
    return this.prisma.seoPage.findMany({
      where: { deletedAt: null },
      orderBy: [{ path: "asc" }],
    });
  }

  getSeoPublic(path: string, locale?: string) {
    return this.prisma.seoPage.findFirst({
      where: {
        path,
        deletedAt: null,
        locale: locale === "en" ? Locale.EN : Locale.AR,
      },
    });
  }

  async upsertSeo(data: {
    path: string;
    locale: string;
    title: string;
    description?: string;
    canonical?: string;
    robots?: string;
  }) {
    return this.prisma.seoPage.upsert({
      where: {
        path_locale: {
          path: data.path,
          locale: data.locale === "en" ? Locale.EN : Locale.AR,
        },
      },
      update: {
        title: data.title,
        description: data.description,
        canonical: data.canonical,
        robots: data.robots,
      },
      create: {
        path: data.path,
        locale: data.locale === "en" ? Locale.EN : Locale.AR,
        title: data.title,
        description: data.description,
        canonical: data.canonical,
        robots: data.robots ?? "index,follow",
      },
    });
  }

  async removeSeo(id: string) {
    await this.prisma.seoPage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "SEO entry deleted" };
  }

  // ─── Media (metadata) ─────────────────────────────────────────────────────

  listMedia() {
    return this.prisma.mediaLibrary.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  async createMedia(data: {
    filename: string;
    mimeType: string;
    size: number;
    storageKey: string;
    url: string;
    folder?: string;
    altAr?: string;
    altEn?: string;
    uploadedById?: string;
  }) {
    return this.prisma.mediaLibrary.create({ data });
  }

  async removeMedia(id: string) {
    await this.prisma.mediaLibrary.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Media deleted" };
  }

  // ─── Audit logs (read-only) ───────────────────────────────────────────────

  listAuditLogs(limit = 50) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, firstName: true, lastName: true } },
      },
    });
  }

  // ─── Dashboard stats ──────────────────────────────────────────────────────

  async getDashboardStats(permissions: string[]) {
    const all = permissions.includes("*");
    const can = (p: string) => all || permissions.includes(p);

    const stats: Record<string, number> = {};

    if (can("users:read")) {
      stats.users = await this.prisma.user.count({
        where: { deletedAt: null },
      });
    }
    if (can("projects:read")) {
      stats.projects = await this.prisma.project.count({
        where: { deletedAt: null },
      });
    }
    if (can("blog:read")) {
      stats.posts = await this.prisma.blogPost.count({
        where: { deletedAt: null },
      });
    }
    if (can("users:read")) {
      stats.contacts = await this.prisma.contact.count({
        where: { deletedAt: null },
      });
    }
    if (can("cms:read") || can("services:read")) {
      stats.testimonials = await this.prisma.testimonial.count({
        where: { deletedAt: null },
      });
    }

    return stats;
  }
}
