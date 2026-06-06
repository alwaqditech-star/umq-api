import { Body, Controller, Delete, Get, Param, Patch } from "@nestjs/common";
import { ContactsService } from "./contacts.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";

@Controller("admin/contacts")
@RequirePermissions("users:read")
export class ContactsAdminController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  findAll() {
    return this.contactsService.findAllAdmin();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.contactsService.findOne(id);
  }

  @Patch(":id")
  @RequirePermissions("users:update")
  update(@Param("id") id: string, @Body() body: { status?: string }) {
    return this.contactsService.updateAdmin(id, body);
  }

  @Delete(":id")
  @RequirePermissions("users:delete")
  remove(@Param("id") id: string) {
    return this.contactsService.deleteAdmin(id);
  }
}
