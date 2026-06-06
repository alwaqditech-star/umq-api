import { Module } from "@nestjs/common";
import { CmsService } from "./cms.service";
import { CmsPublicController } from "./cms-public.controller";
import {
  AuditLogsController,
  DashboardController,
  PartnersAdminController,
  SeoAdminController,
  SettingsAdminController,
  TeamAdminController,
  TestimonialsAdminController,
  WebsiteSectionsAdminController,
} from "./cms-admin.controller";

@Module({
  controllers: [
    CmsPublicController,
    TestimonialsAdminController,
    TeamAdminController,
    PartnersAdminController,
    SettingsAdminController,
    WebsiteSectionsAdminController,
    SeoAdminController,
    AuditLogsController,
    DashboardController,
  ],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
