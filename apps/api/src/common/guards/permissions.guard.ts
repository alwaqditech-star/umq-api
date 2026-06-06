import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSIONS_KEY } from "../decorators/permissions.decorator";
import type { RequestUser } from "../types/request-user";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException("Not authenticated");

    const hasAll = required.every(
      (perm) =>
        user.permissions.includes(perm) || user.permissions.includes("*"),
    );
    if (!hasAll) {
      throw new ForbiddenException("Insufficient permissions");
    }
    return true;
  }
}
