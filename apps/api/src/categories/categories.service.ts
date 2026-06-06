import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type CategoryRecord = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  order: number;
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private map(row: {
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
    order: number;
  }): CategoryRecord {
    return {
      id: row.id,
      slug: row.slug,
      nameAr: row.nameAr,
      nameEn: row.nameEn,
      order: row.order,
    };
  }

  // ─── Project categories ───────────────────────────────────────────────────

  listProject() {
    return this.prisma.projectCategory
      .findMany({
        where: { deletedAt: null },
        orderBy: [{ order: "asc" }, { nameAr: "asc" }],
      })
      .then((rows) => rows.map((r) => this.map(r)));
  }

  async createProject(data: {
    slug: string;
    nameAr: string;
    nameEn: string;
    order?: number;
  }) {
    const row = await this.prisma.projectCategory.create({
      data: {
        slug: data.slug,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
        order: data.order ?? 0,
      },
    });
    return this.map(row);
  }

  async updateProject(
    id: string,
    data: Partial<{
      slug: string;
      nameAr: string;
      nameEn: string;
      order: number;
    }>,
  ) {
    try {
      const row = await this.prisma.projectCategory.update({
        where: { id },
        data,
      });
      return this.map(row);
    } catch {
      throw new NotFoundException("Category not found");
    }
  }

  async removeProject(id: string) {
    await this.prisma.projectCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Category deleted" };
  }

  // ─── Blog categories ──────────────────────────────────────────────────────

  listBlog() {
    return this.prisma.blogCategory
      .findMany({
        where: { deletedAt: null },
        orderBy: [{ nameAr: "asc" }],
      })
      .then((rows) => rows.map((r) => this.map({ ...r, order: 0 })));
  }

  async createBlog(data: { slug: string; nameAr: string; nameEn: string }) {
    const row = await this.prisma.blogCategory.create({ data });
    return this.map({ ...row, order: 0 });
  }

  async updateBlog(
    id: string,
    data: Partial<{ slug: string; nameAr: string; nameEn: string }>,
  ) {
    try {
      const row = await this.prisma.blogCategory.update({
        where: { id },
        data,
      });
      return this.map({ ...row, order: 0 });
    } catch {
      throw new NotFoundException("Category not found");
    }
  }

  async removeBlog(id: string) {
    await this.prisma.blogCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { message: "Category deleted" };
  }
}
