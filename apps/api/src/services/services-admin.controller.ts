import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ServicesService } from "./services.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";

@Controller("admin/services")
@RequirePermissions("services:read")
export class ServicesAdminController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll() {
    return this.servicesService.findAllAdmin();
  }

  @Post()
  @RequirePermissions("services:manage")
  create(
    @Body()
    body: {
      slug: string;
      titleAr: string;
      titleEn: string;
      summaryAr?: string;
      summaryEn?: string;
      contentAr?: string;
      contentEn?: string;
      icon?: string;
      order?: number;
      featured?: boolean;
      status?: string;
    },
  ) {
    return this.servicesService.createAdmin(body);
  }

  @Patch(":id")
  @RequirePermissions("services:manage")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.servicesService.updateAdmin(
      id,
      body as Parameters<ServicesService["updateAdmin"]>[1],
    );
  }

  @Delete(":id")
  @RequirePermissions("services:manage")
  remove(@Param("id") id: string) {
    return this.servicesService.removeAdmin(id);
  }
}
