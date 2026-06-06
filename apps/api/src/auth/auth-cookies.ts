import type { Response } from "express";
import type { ConfigService } from "@nestjs/config";

export const ACCESS_COOKIE = "umq_access";
export const REFRESH_COOKIE = "umq_refresh";

export function isSecureCookies(config: ConfigService): boolean {
  const explicit = config.get<string>("AUTH_COOKIE_SECURE");
  if (explicit === "true") return true;
  if (explicit === "false") return false;
  return config.get<string>("NODE_ENV") === "production";
}

function cookieBase(config: ConfigService) {
  return {
    httpOnly: true,
    secure: isSecureCookies(config),
    sameSite: "strict" as const,
    path: "/",
  };
}

export function setAuthCookies(
  res: Response,
  config: ConfigService,
  tokens: {
    accessToken: string;
    refreshToken: string;
    accessMaxAgeMs: number;
    refreshMaxAgeMs: number;
  },
): void {
  const base = cookieBase(config);
  res.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...base,
    maxAge: tokens.accessMaxAgeMs,
  });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...base,
    maxAge: tokens.refreshMaxAgeMs,
  });
}

export function clearAuthCookies(res: Response, config: ConfigService): void {
  const base = cookieBase(config);
  res.clearCookie(ACCESS_COOKIE, base);
  res.clearCookie(REFRESH_COOKIE, base);
}
