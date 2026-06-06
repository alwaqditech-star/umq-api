import { Injectable } from "@nestjs/common";
import { ContentStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class TestimonialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublished() {
    const items = await this.prisma.testimonial.findMany({
      where: { deletedAt: null, status: ContentStatus.PUBLISHED },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    });
    return items.map((t) => ({
      id: t.id,
      authorAr: t.authorAr,
      authorEn: t.authorEn,
      companyAr: t.companyAr ?? "",
      companyEn: t.companyEn ?? "",
      contentAr: t.contentAr,
      contentEn: t.contentEn,
      rating: t.rating ?? 5,
    }));
  }
}
