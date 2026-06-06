/** Roles allowed to sign in to staff panels */
export const PLATFORM_ROLES = ["super-admin", "admin", "editor"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const ADMIN_ROLES = ["super-admin", "admin"] as const;

export function isPlatformRole(roleSlug?: string): roleSlug is PlatformRole {
  return !!roleSlug && PLATFORM_ROLES.includes(roleSlug as PlatformRole);
}

/** Super Admin + Admin → `/admin` panel */
export function canAccessAdminPanel(
  _permissions: string[],
  roleSlug?: string,
): boolean {
  return roleSlug === "super-admin" || roleSlug === "admin";
}

/** Editor → `/editor` panel */
export function canAccessEditorPanel(
  _permissions: string[],
  roleSlug?: string,
): boolean {
  return roleSlug === "editor";
}

export function canSignIn(_permissions: string[], roleSlug?: string): boolean {
  return (
    canAccessAdminPanel(_permissions, roleSlug) ||
    canAccessEditorPanel(_permissions, roleSlug)
  );
}

/** Post-login landing route (no locale prefix). */
export function getPostLoginPath(roleSlug: string): string {
  if (roleSlug === "editor") return "/editor";
  if (roleSlug === "super-admin" || roleSlug === "admin") return "/admin";
  return "/login";
}

/** @deprecated Use getPostLoginPath */
export function getDefaultAdminPath(roleSlug: string): string {
  return getPostLoginPath(roleSlug);
}

export function getDashboardVariant(roleSlug: string): string {
  if (roleSlug === "super-admin") return "super-admin";
  if (roleSlug === "admin") return "admin";
  if (roleSlug === "editor") return "editor";
  return "default";
}
