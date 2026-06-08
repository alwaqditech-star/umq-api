import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const covers = [
  {
    id: "22222222-2222-4222-8222-222222222202",
    projectSlugs: ["umq-platform"],
  },
  {
    id: "33333333-3333-4333-8333-333333333303",
    projectSlugs: ["glorda-app", "Glorda App"],
  },
  {
    id: "44444444-4444-4444-8444-444444444404",
    projectSlugs: ["umq-digital", "jshdjs"],
  },
] as const;

async function main() {
  for (const cover of covers) {
    for (const slug of cover.projectSlugs) {
      const updated = await prisma.project.updateMany({
        where: { slug, deletedAt: null },
        data: { coverMediaId: cover.id },
      });
      if (updated.count > 0) {
        console.log(`Linked cover ${cover.id} → "${slug}"`);
      }
    }
  }

  const broken = await prisma.project.findMany({
    where: {
      deletedAt: null,
      coverMedia: {
        url: { startsWith: "/api/" },
      },
    },
    include: { coverMedia: true },
  });

  const fallbackCoverId = covers[0].id;
  for (const project of broken) {
    await prisma.project.update({
      where: { id: project.id },
      data: { coverMediaId: fallbackCoverId },
    });
    console.log(
      `Fixed broken cover for "${project.slug}" → seed cover ${fallbackCoverId}`,
    );
  }

  const projects = await prisma.project.findMany({
    where: { deletedAt: null, status: "PUBLISHED" },
    include: { coverMedia: true },
    orderBy: { order: "asc" },
  });

  console.log("\nPublished projects:");
  for (const p of projects) {
    console.log(
      `  ${p.slug} → ${p.coverMedia?.url?.slice(0, 70) ?? "(no cover)"}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
