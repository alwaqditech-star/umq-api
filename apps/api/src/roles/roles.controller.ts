import { Controller, Get, Param } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";

@Controller("roles")
@RequirePermissions("roles:read")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  @Get("permissions/list")
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.rolesService.findOne(id);
  }
}
