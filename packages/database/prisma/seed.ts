import { PrismaClient, Locale, ContentStatus } from "@prisma/client";
import {
  HOME_SECTION_KEYS,
  HOME_SECTION_DEFAULTS,
  hashPassword,
} from "@umq/shared";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { slug: "users:read", name: "Read Users", module: "users", action: "read" },
  {
    slug: "users:create",
    name: "Create Users",
    module: "users",
    action: "create",
  },
  {
    slug: "users:update",
    name: "Update Users",
    module: "users",
    action: "update",
  },
  {
    slug: "users:delete",
    name: "Delete Users",
    module: "users",
    action: "delete",
  },
  { slug: "roles:read", name: "Read Roles", module: "roles", action: "read" },
  {
    slug: "roles:manage",
    name: "Manage Roles",
    module: "roles",
    action: "manage",
  },
  {
    slug: "services:read",
    name: "Read Services",
    module: "services",
    action: "read",
  },
  {
    slug: "services:manage",
    name: "Manage Services",
    module: "services",
    action: "manage",
  },
  {
    slug: "projects:read",
    name: "Read Projects",
    module: "projects",
    action: "read",
  },
  {
    slug: "projects:manage",
    name: "Manage Projects",
    module: "projects",
    action: "manage",
  },
  { slug: "blog:read", name: "Read Blog", module: "blog", action: "read" },
  {
    slug: "blog:manage",
    name: "Manage Blog",
    module: "blog",
    action: "manage",
  },
  {
    slug: "settings:manage",
    name: "Manage Settings",
    module: "settings",
    action: "manage",
  },
  {
    slug: "audit:read",
    name: "Read Audit Logs",
    module: "audit",
    action: "read",
  },
  { slug: "cms:read", name: "Read CMS", module: "cms", action: "read" },
  { slug: "cms:manage", name: "Manage CMS", module: "cms", action: "manage" },
] as const;

async function assignPermissions(roleId: string, slugs: readonly string[]) {
  const permissions = await prisma.permission.findMany({
    where: { slug: { in: [...slugs] } },
  });
  await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({
      roleId,
      permissionId: permission.id,
    })),
    skipDuplicates: true,
  });
}

async function main() {
  console.log("Seeding UMQ platform database...");

  const permissions = await Promise.all(
    PERMISSIONS.map((p) =>
      prisma.permission.upsert({
        where: { slug: p.slug },
        update: { name: p.name, module: p.module, action: p.action },
        create: {
          slug: p.slug,
          name: p.name,
          module: p.module,
          action: p.action,
        },
      }),
    ),
  );

  const allSlugs = permissions.map((p) => p.slug);

  const superAdminRole = await prisma.role.upsert({
    where: { slug: "super-admin" },
    update: { name: "Super Admin", description: "Full platform access" },
    create: {
      name: "Super Admin",
      slug: "super-admin",
      description: "Full platform access",
      isSystem: true,
    },
  });

  await prisma.rolePermission.deleteMany({
    where: { roleId: superAdminRole.id },
  });
  await assignPermissions(superAdminRole.id, allSlugs);

  const adminRole = await prisma.role.upsert({
    where: { slug: "admin" },
    update: { name: "Admin", description: "CMS and content operations" },
    create: {
      name: "Admin",
      slug: "admin",
      description: "CMS and content operations",
      isSystem: true,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: adminRole.id } });
  await assignPermissions(adminRole.id, [
    "services:read",
    "services:manage",
    "projects:read",
    "projects:manage",
    "blog:read",
    "blog:manage",
    "cms:read",
    "cms:manage",
    "settings:manage",
  ]);

  const editorRole = await prisma.role.upsert({
    where: { slug: "editor" },
    update: { name: "Editor", description: "Content create and edit" },
    create: {
      name: "Editor",
      slug: "editor",
      description: "Content create and edit",
      isSystem: true,
    },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId: editorRole.id } });
  await assignPermissions(editorRole.id, [
    "blog:read",
    "blog:manage",
    "projects:read",
    "projects:manage",
    "cms:read",
    "cms:manage",
  ]);

  const seedPassword = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe123!";

  const roleUsers = [
    {
      email: "admin@umq.sa",
      firstName: "مدير",
      lastName: "النظام",
      roleId: superAdminRole.id,
    },
    {
      email: "operations@umq.sa",
      firstName: "مسؤول",
      lastName: "المحتوى",
      roleId: adminRole.id,
    },
    {
      email: "editor@umq.sa",
      firstName: "محرر",
      lastName: "المحتوى",
      roleId: editorRole.id,
    },
  ] as const;

  for (const user of roleUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        passwordHash: hashPassword(seedPassword),
        roleId: user.roleId,
        isActive: true,
      },
      create: {
        email: user.email,
        passwordHash: hashPassword(seedPassword),
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        locale: Locale.AR,
        isActive: true,
      },
    });
  }

  await prisma.setting.upsert({
    where: { key: "company.name" },
    update: {},
    create: {
      key: "company.name",
      group: "general",
      value: {
        ar: "عُمْق لتقنية المعلومات",
        en: "UMQ Information Technology",
      },
    },
  });

  const contactInfo = {
    email: "umqTech2026@gmail.com",
    phone: "+966 55 991 8514",
    whatsapp: "+966559918514",
    addressAr: "جدة، المملكة العربية السعودية",
    addressEn: "Riyadh, Kingdom of Saudi Arabia",
    hoursAr: "الأحد – الخميس، 9 ص – 6 م",
    hoursEn: "Sun – Thu, 9 AM – 6 PM",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3624.0!2d46.6753!3d24.7136!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjTCsDQyJzQ5LjAiTiA0NsKwNDAnMzEuMSJF!5e0!3m2!1sen!2ssa!4v1",
  };

  await prisma.setting.upsert({
    where: { key: "contact.info" },
    update: { value: contactInfo },
    create: {
      key: "contact.info",
      group: "contact",
      value: contactInfo,
    },
  });

  for (const key of HOME_SECTION_KEYS) {
    const d = HOME_SECTION_DEFAULTS[key];
    await prisma.homeSection.upsert({
      where: { key },
      update: { labelAr: d.labelAr, labelEn: d.labelEn },
      create: {
        key,
        labelAr: d.labelAr,
        labelEn: d.labelEn,
        sortOrder: d.sortOrder,
        isEnabled: true,
      },
    });
  }

  await prisma.websiteSection.upsert({
    where: {
      key_locale: { key: "contact.faq", locale: Locale.AR },
    },
    update: {},
    create: {
      key: "contact.faq",
      type: "faq",
      locale: Locale.AR,
      status: ContentStatus.PUBLISHED,
      content: {
        items: [
          {
            q: "كم يستغرق الرد على استفساري؟",
            a: "نرد عادةً خلال يوم عمل واحد.",
          },
          {
            q: "هل تقدمون دعماً بعد التسليم؟",
            a: "نعم، نقدم خطط دعم وتشغيل حسب الاتفاق.",
          },
        ],
      },
    },
  });

  await prisma.websiteSection.upsert({
    where: {
      key_locale: { key: "contact.faq", locale: Locale.EN },
    },
    update: {},
    create: {
      key: "contact.faq",
      type: "faq",
      locale: Locale.EN,
      status: ContentStatus.PUBLISHED,
      content: {
        items: [
          {
            q: "How fast do you respond?",
            a: "We typically reply within one business day.",
          },
          {
            q: "Do you offer post-launch support?",
            a: "Yes — support and operations plans are available.",
          },
        ],
      },
    },
  });

  await prisma.websiteSection.upsert({
    where: {
      key_locale: { key: "home.hero", locale: Locale.AR },
    },
    update: {},
    create: {
      key: "home.hero",
      type: "hero",
      locale: Locale.AR,
      status: ContentStatus.PUBLISHED,
      content: {
        headline: "عُمْق لتقنية المعلومات",
        subheadline: "حلول تقنية مؤسسية في المملكة العربية السعودية",
        ctaLabel: "تواصل معنا",
        ctaHref: "/contact",
      },
    },
  });

  await prisma.service.upsert({
    where: { slug: "web-development" },
    update: {},
    create: {
      slug: "web-development",
      titleAr: "تطوير المواقع والتطبيقات",
      titleEn: "Web & App Development",
      summaryAr: "حلول ويب وتطبيقات مؤسسية عالية الأداء.",
      summaryEn: "High-performance enterprise web and applications.",
      icon: "code",
      order: 1,
      featured: true,
      status: ContentStatus.PUBLISHED,
    },
  });

  await prisma.service.upsert({
    where: { slug: "digital-transformation" },
    update: {},
    create: {
      slug: "digital-transformation",
      titleAr: "التحول الرقمي",
      titleEn: "Digital Transformation",
      summaryAr: "استراتيجيات وتحول رقمي متكامل للمؤسسات.",
      summaryEn: "Integrated digital transformation for enterprises.",
      icon: "sparkles",
      order: 2,
      featured: true,
      status: ContentStatus.PUBLISHED,
    },
  });

  const projectCategory = await prisma.projectCategory.upsert({
    where: { slug: "enterprise" },
    update: {},
    create: {
      slug: "enterprise",
      nameAr: "مؤسسي",
      nameEn: "Enterprise",
      order: 1,
    },
  });

  await prisma.project.upsert({
    where: { slug: "umq-platform" },
    update: {},
    create: {
      slug: "umq-platform",
      titleAr: "منصة عُمْق",
      titleEn: "UMQ Platform",
      summaryAr: "منصة مؤسسية لإدارة المحتوى والخدمات.",
      summaryEn: "Enterprise platform for content and services.",
      clientName: "UMQ",
      technologies: ["Next.js", "NestJS", "MySQL"],
      categoryId: projectCategory.id,
      featured: true,
      status: ContentStatus.PUBLISHED,
    },
  });

  const blogCategory = await prisma.blogCategory.upsert({
    where: { slug: "insights" },
    update: {},
    create: {
      slug: "insights",
      nameAr: "رؤى تقنية",
      nameEn: "Tech Insights",
    },
  });

  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@umq.sa" },
  });

  const blogCoverMediaId = "11111111-1111-4111-8111-111111111101";
  const blogCoverUrl =
    "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80";

  await prisma.mediaLibrary.upsert({
    where: { id: blogCoverMediaId },
    update: {
      url: blogCoverUrl,
      altAr: "التحول الرقمي في السعودية",
      altEn: "Digital transformation in Saudi Arabia",
    },
    create: {
      id: blogCoverMediaId,
      filename: "digital-transformation-cover.jpg",
      mimeType: "image/jpeg",
      size: 0,
      storageKey: "seed/blog/digital-transformation-cover.jpg",
      url: blogCoverUrl,
      folder: "blog",
      altAr: "التحول الرقمي في السعودية",
      altEn: "Digital transformation in Saudi Arabia",
      uploadedById: adminUser?.id,
    },
  });

  await prisma.blogPost.upsert({
    where: {
      slug_locale: { slug: "digital-transformation-ksa", locale: Locale.AR },
    },
    update: { coverMediaId: blogCoverMediaId },
    create: {
      slug: "digital-transformation-ksa",
      locale: Locale.AR,
      title: "التحول الرقمي في السعودية",
      excerpt: "كيف تبني المؤسسات رحلة تحول رقمي ناجحة.",
      content: "<p>محتوى المقال التعريفي عن التحول الرقمي.</p>",
      categoryId: blogCategory.id,
      authorId: adminUser?.id,
      coverMediaId: blogCoverMediaId,
      readingTime: 6,
      publishedAt: new Date(),
      status: ContentStatus.PUBLISHED,
    },
  });

  await prisma.testimonial.createMany({
    data: [
      {
        authorAr: "أحمد العتيبي",
        authorEn: "Ahmed Al-Otaibi",
        companyAr: "شركة تقنية",
        companyEn: "Tech Corp",
        contentAr: "فريق عُمْق قدم لنا حلولاً متميزة ودعماً مستمراً.",
        contentEn: "UMQ delivered outstanding solutions and support.",
        rating: 5,
        order: 1,
        status: ContentStatus.PUBLISHED,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Seed completed.");
  console.log("Role users (shared password from SEED_ADMIN_PASSWORD):");
  for (const user of roleUsers) {
    const role = await prisma.role.findUnique({ where: { id: user.roleId } });
    console.log(`  ${role?.slug ?? "?"} → ${user.email}`);
  }
  console.log(`Password: ${seedPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
