import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { BlogService } from "./blog.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";

@Controller("admin/blog/posts")
@RequirePermissions("blog:read")
export class BlogAdminController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  findAll() {
    return this.blogService.findAllAdmin();
  }

  @Post()
  @RequirePermissions("blog:manage")
  create(@Body() body: Record<string, unknown>) {
    return this.blogService.createAdmin(
      body as Parameters<BlogService["createAdmin"]>[0],
    );
  }

  @Patch(":id")
  @RequirePermissions("blog:manage")
  update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    return this.blogService.updateAdmin(
      id,
      body as Parameters<BlogService["updateAdmin"]>[1],
    );
  }

  @Delete(":id")
  @RequirePermissions("blog:manage")
  remove(@Param("id") id: string) {
    return this.blogService.removeAdmin(id);
  }
}
