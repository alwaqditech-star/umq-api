import { Controller, Get, Param, Query } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { CmsService } from "./cms.service";

@Controller()
@Public()
export class CmsPublicController {
  constructor(private readonly cms: CmsService) {}

  @Get("team-members")
  team() {
    return this.cms.listTeamPublic();
  }

  @Get("partners")
  partners() {
    return this.cms.listPartnersPublic();
  }

  @Get("home-sections")
  homeSections() {
    return this.cms.listHomeSectionsPublic();
  }

  @Get("settings/public")
  publicSettings() {
    return this.cms.getPublicSettings();
  }

  @Get("website-sections/:key")
  section(@Param("key") key: string, @Query("locale") locale?: string) {
    return this.cms.getSectionPublic(key, locale);
  }

  @Get("seo")
  seo(@Query("path") path: string, @Query("locale") locale?: string) {
    return this.cms.getSeoPublic(path, locale);
  }
}
