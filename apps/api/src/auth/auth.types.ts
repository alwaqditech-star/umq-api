export interface JwtPayload {
  sub: string;

  email: string;

  roleSlug: string;

  permissions: string[];
}

export interface AuthTokensResponse {
  accessToken: string;

  refreshToken: string;

  expiresIn: number;

  accessMaxAgeMs: number;

  refreshMaxAgeMs: number;
}

export interface AuthUserResponse {
  id: string;

  email: string;

  name: string;

  role: string;

  roleSlug: string;

  permissions: string[];
}

export interface AuthSessionResponse {
  user: AuthUserResponse;

  expiresIn: number;
}

export interface SessionInfo {
  id: string;

  createdAt: string;

  expiresAt: string;

  userAgent: string | null;

  ipAddress: string | null;

  current: boolean;
}
