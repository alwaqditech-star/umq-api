import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";

@Controller("admin/projects")
@RequirePermissions("projects:read")
export class ProjectsAdminController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAllAdmin();
  }

  @Post()
  @RequirePermissions("projects:manage")
  create(@Body() body: Record<string, unknown>) {
    return this.projectsService.createAdmin(
      body as Parameters<ProjectsService["createAdmin"]>[0],
    );
  }

  @Patch(":id")
  @RequirePermissions("projects:manage")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.projectsService.updateAdmin(
      id,
      body as Parameters<ProjectsService["updateAdmin"]>[1],
    );
  }

  @Delete(":id")
  @RequirePermissions("projects:manage")
  remove(@Param("id") id: string) {
    return this.projectsService.removeAdmin(id);
  }
}
