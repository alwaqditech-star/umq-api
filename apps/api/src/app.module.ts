import { Module } from "@nestjs/common";

import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";

import { ConfigModule } from "@nestjs/config";

import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";

import { AppController } from "./app.controller";

import { AppService } from "./app.service";

import { HealthModule } from "./health/health.module";

import { PrismaModule } from "./prisma/prisma.module";

import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";

import { PermissionsGuard } from "./common/guards/permissions.guard";

import { AuthModule } from "./auth/auth.module";

import { UsersModule } from "./users/users.module";

import { RolesModule } from "./roles/roles.module";

import { ServicesModule } from "./services/services.module";

import { ProjectsModule } from "./projects/projects.module";

import { BlogModule } from "./blog/blog.module";

import { ContactsModule } from "./contacts/contacts.module";

import { TestimonialsModule } from "./testimonials/testimonials.module";
import { CategoriesModule } from "./categories/categories.module";
import { CmsModule } from "./cms/cms.module";
import { MediaModule } from "./media/media.module";
import { SearchModule } from "./search/search.module";
import { AuditInterceptor } from "./common/interceptors/audit.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,

      envFilePath: [".env", "../../.env"],
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),

    PrismaModule,

    HealthModule,

    AuthModule,

    UsersModule,

    RolesModule,

    ServicesModule,

    ProjectsModule,

    BlogModule,

    ContactsModule,

    TestimonialsModule,

    CategoriesModule,

    CmsModule,

    MediaModule,

    SearchModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    { provide: APP_GUARD, useClass: ThrottlerGuard },

    { provide: APP_GUARD, useClass: JwtAuthGuard },

    { provide: APP_GUARD, useClass: PermissionsGuard },

    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
