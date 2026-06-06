export const UMQ_PLATFORM_NAME = "UMQ Information Technology";

export { hashPassword, verifyPassword } from "./password";
export { validatePasswordPolicy } from "./password-policy";
export {
  HOME_SECTION_KEYS,
  HOME_SECTION_DEFAULTS,
  isHomeSectionKey,
  type HomeSectionKey,
} from "./home-sections";
export {
  ADMIN_ROLES,
  PLATFORM_ROLES,
  canAccessAdminPanel,
  canAccessEditorPanel,
  canSignIn,
  getDefaultAdminPath,
  getDashboardVariant,
  getPostLoginPath,
  isPlatformRole,
} from "./rbac";
