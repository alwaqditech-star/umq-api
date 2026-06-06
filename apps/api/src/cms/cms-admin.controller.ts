import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CmsService } from "./cms.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import type { RequestUser } from "../common/types/request-user";

@Controller("admin/testimonials")
@RequirePermissions("cms:manage")
export class TestimonialsAdminController {
  constructor(private readonly cms: CmsService) {}

  @Get()
  list() {
    return this.cms.listTestimonialsAdmin();
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.cms.createTestimonial(
      body as Parameters<CmsService["createTestimonial"]>[0],
    );
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.cms.updateTestimonial(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.cms.removeTestimonial(id);
  }
}

@Controller("admin/team-members")
@RequirePermissions("cms:manage")
export class TeamAdminController {
  constructor(private readonly cms: CmsService) {}

  @Get()
  list() {
    return this.cms.listTeamAdmin();
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.cms.createTeam(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.cms.updateTeam(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.cms.removeTeam(id);
  }
}

@Controller("admin/partners")
@RequirePermissions("cms:manage")
export class PartnersAdminController {
  constructor(private readonly cms: CmsService) {}

  @Get()
  list() {
    return this.cms.listPartnersAdmin();
  }

  @Post()
  create(@Body() body: Record<string, unknown>) {
    return this.cms.createPartner(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.cms.updatePartner(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.cms.removePartner(id);
  }
}

@Controller("admin/settings")
@RequirePermissions("settings:manage")
export class SettingsAdminController {
  constructor(private readonly cms: CmsService) {}

  @Get()
  list() {
    return this.cms.listSettings();
  }

  @Post()
  upsert(@Body() body: { key: string; value: unknown; group?: string }) {
    return this.cms.upsertSetting(body.key, body.value, body.group);
  }
}

@Controller("admin/website-sections")
@RequirePermissions("cms:manage")
export class WebsiteSectionsAdminController {
  constructor(private readonly cms: CmsService) {}

  /** Homepage section visibility, labels, and sort order */
  @Get()
  listHomeSections() {
    return this.cms.listHomeSectionsAdmin();
  }

  @Patch("reorder")
  reorder(@Body() body: { items: { id: string; sortOrder: number }[] }) {
    return this.cms.reorderHomeSections(body.items ?? []);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body()
    body: Partial<{
      labelAr: string;
      labelEn: string;
      isEnabled: boolean;
      sortOrder: number;
    }>,
  ) {
    return this.cms.updateHomeSection(id, body);
  }

  @Get("content")
  listContent() {
    return this.cms.listSectionsAdmin();
  }

  @Post("content")
  upsertContent(@Body() body: Record<string, unknown>) {
    return this.cms.upsertSection(
      body as Parameters<CmsService["upsertSection"]>[0],
    );
  }

  @Delete("content/:id")
  removeContent(@Param("id") id: string) {
    return this.cms.removeSection(id);
  }
}

@Controller("admin/seo-pages")
@RequirePermissions("cms:manage")
export class SeoAdminController {
  constructor(private readonly cms: CmsService) {}

  @Get()
  list() {
    return this.cms.listSeoAdmin();
  }

  @Post()
  upsert(@Body() body: Record<string, unknown>) {
    return this.cms.upsertSeo(body as Parameters<CmsService["upsertSeo"]>[0]);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.cms.removeSeo(id);
  }
}

@Controller("admin/audit-logs")
@RequirePermissions("audit:read")
export class AuditLogsController {
  constructor(private readonly cms: CmsService) {}

  @Get()
  list(@Query("limit") limit?: string) {
    return this.cms.listAuditLogs(limit ? Number(limit) : 50);
  }
}

@Controller("admin/dashboard")
export class DashboardController {
  constructor(private readonly cms: CmsService) {}

  @Get("stats")
  stats(@CurrentUser() user: RequestUser) {
    return this.cms.getDashboardStats(user.permissions);
  }
}
