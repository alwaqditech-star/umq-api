import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "node:crypto";
import {
  canSignIn,
  hashPassword,
  validatePasswordPolicy,
  verifyPassword,
} from "@umq/shared";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AuthSessionResponse,
  AuthTokensResponse,
  AuthUserResponse,
  JwtPayload,
  SessionInfo,
} from "./auth.types";
import { LoginDto } from "./dto/login.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";

export type RequestMeta = {
  userAgent?: string;
  ipAddress?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private async buildUserResponse(userId: string): Promise<AuthUserResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: { permission: true },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException("User not found");

    const permissions = user.role.rolePermissions.map(
      (rp) => rp.permission.slug,
    );
    const isSuperAdmin = user.role.slug === "super-admin";

    return {
      id: user.id,
      email: user.email,
      name: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role.name,
      roleSlug: user.role.slug,
      permissions: isSuperAdmin ? ["*"] : permissions,
    };
  }

  private parseDurationMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value.trim());
    if (!match) return 15 * 60 * 1000;
    const amount = Number(match[1]);
    const unit = match[2] as "s" | "m" | "h" | "d";
    const multipliers = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    } as const;
    return amount * multipliers[unit];
  }

  private getRefreshDurationMs(rememberMe?: boolean): number {
    if (rememberMe) {
      return this.parseDurationMs(
        this.config.get<string>("JWT_REFRESH_REMEMBER_EXPIRES") ?? "30d",
      );
    }
    return this.parseDurationMs(
      this.config.get<string>("JWT_REFRESH_EXPIRES") ?? "7d",
    );
  }

  private async issueTokens(
    user: AuthUserResponse,
    meta: RequestMeta,
    rememberMe?: boolean,
  ): Promise<AuthTokensResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roleSlug: user.roleSlug,
      permissions: user.permissions,
    };

    const accessExpires =
      this.config.get<string>("JWT_ACCESS_EXPIRES") ?? "15m";
    const accessMs = this.parseDurationMs(accessExpires);
    const refreshMs = this.getRefreshDurationMs(rememberMe);
    const accessSeconds = Math.floor(accessMs / 1000);

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: accessSeconds,
    });

    const refreshToken = randomBytes(48).toString("base64url");

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        expiresAt: new Date(Date.now() + refreshMs),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessMs / 1000,
      accessMaxAgeMs: accessMs,
      refreshMaxAgeMs: refreshMs,
    };
  }

  private toSessionResponse(
    tokens: AuthTokensResponse,
    user: AuthUserResponse,
  ): AuthSessionResponse {
    return {
      user,
      expiresIn: tokens.expiresIn,
    };
  }

  private async recordFailedLogin(userId: string): Promise<void> {
    const maxFailed = Number(
      this.config.get<string>("AUTH_MAX_FAILED_LOGINS") ?? "5",
    );
    const lockoutMinutes = Number(
      this.config.get<string>("AUTH_LOCKOUT_MINUTES") ?? "15",
    );

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: { increment: 1 } },
      select: { failedLoginCount: true },
    });

    if (updated.failedLoginCount >= maxFailed) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + lockoutMinutes * 60_000),
        },
      });
    }
  }

  async login(
    dto: LoginDto,
    meta: RequestMeta,
  ): Promise<{ session: AuthSessionResponse; tokens: AuthTokensResponse }> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase(), deletedAt: null },
      include: {
        role: {
          include: {
            rolePermissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException("Account is temporarily locked");
    }

    if (!verifyPassword(dto.password, user.passwordHash)) {
      await this.recordFailedLogin(user.id);
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });

    const authUser = await this.buildUserResponse(user.id);
    if (!canSignIn(authUser.permissions, authUser.roleSlug)) {
      throw new ForbiddenException(
        "This account does not have access to the platform",
      );
    }

    const tokens = await this.issueTokens(authUser, meta, dto.rememberMe);
    return {
      session: this.toSessionResponse(tokens, authUser),
      tokens,
    };
  }

  async refresh(
    refreshToken: string | undefined,
    meta: RequestMeta,
  ): Promise<{ session: AuthSessionResponse; tokens: AuthTokensResponse }> {
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!stored) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const authUser = await this.buildUserResponse(stored.userId);
    const tokens = await this.issueTokens(authUser, meta);
    return {
      session: this.toSessionResponse(tokens, authUser),
      tokens,
    };
  }

  async logout(
    refreshToken: string | undefined,
    userId?: string,
  ): Promise<void> {
    if (refreshToken) {
      const tokenHash = this.hashToken(refreshToken);
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else if (userId) {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
  }

  async me(userId: string): Promise<AuthUserResponse> {
    return this.buildUserResponse(userId);
  }

  async forgotPassword(
    email: string,
  ): Promise<{ message: string; resetUrl?: string }> {
    const generic =
      "If an account exists for this email, a password reset link has been sent.";

    const user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase(), deletedAt: null, isActive: true },
    });

    if (!user) {
      return { message: generic };
    }

    const rawToken = randomBytes(32).toString("base64url");
    const resetMs = this.parseDurationMs(
      this.config.get<string>("PASSWORD_RESET_EXPIRES") ?? "1h",
    );

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(rawToken),
        expiresAt: new Date(Date.now() + resetMs),
      },
    });

    const webOrigin =
      this.config.get<string>("WEB_ORIGIN") ?? "http://localhost:3000";
    const resetUrl = `${webOrigin}/ar/reset-password?token=${encodeURIComponent(rawToken)}`;

    if (this.config.get<string>("NODE_ENV") !== "production") {
      return { message: generic, resetUrl };
    }

    return { message: generic };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const policyError = validatePasswordPolicy(newPassword);
    if (policyError) {
      throw new BadRequestException(policyError);
    }

    const tokenHash = this.hashToken(token);
    const record = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: hashPassword(newPassword),
          failedLoginCount: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: "Password updated. You can sign in now." };
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const policyError = validatePasswordPolicy(dto.newPassword);
    if (policyError) {
      throw new BadRequestException(policyError);
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
    });
    if (!user) throw new UnauthorizedException();

    if (!verifyPassword(dto.currentPassword, user.passwordHash)) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: hashPassword(dto.newPassword) },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: "Password changed. Please sign in again." };
  }

  async listSessions(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<SessionInfo[]> {
    const sessions = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });

    const currentHash = currentRefreshToken
      ? this.hashToken(currentRefreshToken)
      : null;

    return sessions.map((s) => ({
      id: s.id,
      createdAt: s.createdAt.toISOString(),
      expiresAt: s.expiresAt.toISOString(),
      userAgent: s.userAgent,
      ipAddress: s.ipAddress,
      current: currentHash === s.tokenHash,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) {
      throw new BadRequestException("Session not found");
    }
  }

  async revokeOtherSessions(
    userId: string,
    currentRefreshToken?: string,
  ): Promise<void> {
    const currentHash = currentRefreshToken
      ? this.hashToken(currentRefreshToken)
      : null;

    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(currentHash ? { tokenHash: { not: currentHash } } : {}),
      },
      data: { revokedAt: new Date() },
    });
  }
}
