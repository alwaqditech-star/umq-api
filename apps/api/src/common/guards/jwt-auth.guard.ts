import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ACCESS_COOKIE } from "../../auth/auth-cookies";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import type { JwtPayload } from "../../auth/auth.types";
import type { RequestUser } from "../types/request-user";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      cookies?: Record<string, string>;
      user?: RequestUser;
    }>();

    const header = request.headers.authorization;
    const cookieToken = request.cookies?.[ACCESS_COOKIE];
    const raw =
      cookieToken ??
      (header?.startsWith("Bearer ") ? header.slice(7) : undefined);

    if (!raw) {
      throw new UnauthorizedException("Missing access token");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(raw);
      request.user = {
        id: payload.sub,
        email: payload.email,
        roleSlug: payload.roleSlug,
        permissions: payload.permissions ?? [],
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired access token");
    }
  }
}
