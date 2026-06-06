import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RefreshDto } from "./dto/refresh.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { RequestUser } from "../common/types/request-user";
import {
  clearAuthCookies,
  REFRESH_COOKIE,
  setAuthCookies,
} from "./auth-cookies";

function requestMeta(req: Request) {
  return {
    userAgent: req.headers["user-agent"],
    ipAddress: req.ip,
  };
}

@Controller("auth")
@Throttle({ default: { limit: 20, ttl: 60_000 } })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post("login")
  @Throttle({ default: { limit: 8, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { session, tokens } = await this.authService.login(
      dto,
      requestMeta(req),
    );
    setAuthCookies(res, this.config, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessMaxAgeMs: tokens.accessMaxAgeMs,
      refreshMaxAgeMs: tokens.refreshMaxAgeMs,
    });
    return session;
  }

  @Public()
  @Post("refresh")
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken =
      req.cookies?.[REFRESH_COOKIE] ?? dto.refreshToken ?? undefined;
    const { session, tokens } = await this.authService.refresh(
      refreshToken,
      requestMeta(req),
    );
    setAuthCookies(res, this.config, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessMaxAgeMs: tokens.accessMaxAgeMs,
      refreshMaxAgeMs: tokens.refreshMaxAgeMs,
    });
    return session;
  }

  @Post("logout")
  async logout(
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: { refreshToken?: string },
  ) {
    const refreshToken =
      req.cookies?.[REFRESH_COOKIE] ?? body.refreshToken ?? undefined;
    await this.authService.logout(refreshToken, user.id);
    clearAuthCookies(res, this.config);
    return { ok: true };
  }

  @Get("me")
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.id);
  }

  @Public()
  @Post("forgot-password")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post("reset-password")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @Post("change-password")
  async changePassword(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.changePassword(user.id, dto);
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    await this.authService.logout(refreshToken, user.id);
    clearAuthCookies(res, this.config);
    return result;
  }

  @Get("sessions")
  listSessions(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.authService.listSessions(
      user.id,
      req.cookies?.[REFRESH_COOKIE],
    );
  }

  @Delete("sessions/:id")
  revokeSession(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.authService.revokeSession(user.id, id);
  }

  @Post("sessions/revoke-others")
  revokeOtherSessions(@CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.authService.revokeOtherSessions(
      user.id,
      req.cookies?.[REFRESH_COOKIE],
    );
  }
}
