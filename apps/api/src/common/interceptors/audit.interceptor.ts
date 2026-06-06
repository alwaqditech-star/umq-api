import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { PrismaService } from "../../prisma/prisma.service";
import type { RequestUser } from "../types/request-user";

const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<{
      method: string;
      user?: RequestUser;
      route?: { path?: string };
      url?: string;
      ip?: string;
      headers: { "user-agent"?: string };
      params?: Record<string, string>;
      body?: Record<string, unknown>;
    }>();

    const method = request.method?.toUpperCase() ?? "GET";
    if (!MUTATING.has(method)) {
      return next.handle();
    }

    const path = request.route?.path ?? request.url ?? "";
    if (path.includes("/auth/") || path.includes("/health")) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const user = request.user;
        const entity = this.resolveEntity(path);
        const entityId =
          request.params?.id ??
          (typeof request.body?.id === "string" ? request.body.id : null);

        void this.prisma.auditLog
          .create({
            data: {
              userId: user?.id,
              action: `${method} ${path}`,
              entity,
              entityId: entityId ?? undefined,
              ipAddress: request.ip,
              userAgent: request.headers["user-agent"],
              newValue: this.safeBody(request.body),
            },
          })
          .catch(() => undefined);
      }),
    );
  }

  private resolveEntity(path: string): string {
    const match = path.match(/\/([\w-]+)(?:\/|$)/);
    return match?.[1] ?? "unknown";
  }

  private safeBody(body?: Record<string, unknown>): object | undefined {
    if (!body) return undefined;
    const clone = { ...body };
    for (const key of [
      "password",
      "currentPassword",
      "newPassword",
      "refreshToken",
    ]) {
      if (key in clone) clone[key] = "[redacted]";
    }
    return clone;
  }
}
