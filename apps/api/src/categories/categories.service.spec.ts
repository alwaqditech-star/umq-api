import { CategoriesService } from "./categories.service";

describe("CategoriesService", () => {
  const prisma = {
    projectCategory: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: "1",
          slug: "enterprise",
          nameAr: "مؤسسي",
          nameEn: "Enterprise",
          order: 1,
        },
      ]),
    },
  } as unknown as ConstructorParameters<typeof CategoriesService>[0];

  it("lists project categories", async () => {
    const service = new CategoriesService(prisma);
    const rows = await service.listProject();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.slug).toBe("enterprise");
  });
});
