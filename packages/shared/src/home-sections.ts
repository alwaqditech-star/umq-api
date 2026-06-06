/** Registry keys for homepage / global section visibility */
export const HOME_SECTION_KEYS = [
  "hero",
  "services",
  "projects",
  "blog",
  "testimonials",
  "partners",
  "team",
  "statistics",
  "faq",
  "contact_cta",
] as const;

export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

export const HOME_SECTION_DEFAULTS: Record<
  HomeSectionKey,
  { labelAr: string; labelEn: string; sortOrder: number }
> = {
  hero: { labelAr: "الواجهة الرئيسية", labelEn: "Hero", sortOrder: 0 },
  services: { labelAr: "الخدمات", labelEn: "Services", sortOrder: 10 },
  projects: { labelAr: "المشاريع", labelEn: "Projects", sortOrder: 20 },
  blog: { labelAr: "المدونة", labelEn: "Blog", sortOrder: 30 },
  testimonials: {
    labelAr: "آراء العملاء",
    labelEn: "Testimonials",
    sortOrder: 40,
  },
  partners: { labelAr: "الشركاء", labelEn: "Partners", sortOrder: 50 },
  team: { labelAr: "الفريق", labelEn: "Team", sortOrder: 60 },
  statistics: { labelAr: "الإحصائيات", labelEn: "Statistics", sortOrder: 70 },
  faq: { labelAr: "الأسئلة الشائعة", labelEn: "FAQ", sortOrder: 80 },
  contact_cta: {
    labelAr: "دعوة للتواصل",
    labelEn: "Contact CTA",
    sortOrder: 90,
  },
};

export function isHomeSectionKey(key: string): key is HomeSectionKey {
  return (HOME_SECTION_KEYS as readonly string[]).includes(key);
}
