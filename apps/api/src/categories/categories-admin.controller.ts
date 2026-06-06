import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CategoryDto } from "./dto/category.dto";

@Controller("admin/project-categories")
@RequirePermissions("projects:manage")
export class ProjectCategoriesAdminController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.listProject();
  }

  @Post()
  create(@Body() body: CategoryDto) {
    return this.categories.createProject(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Partial<CategoryDto>) {
    return this.categories.updateProject(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.categories.removeProject(id);
  }
}

@Controller("admin/blog-categories")
@RequirePermissions("blog:manage")
export class BlogCategoriesAdminController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  list() {
    return this.categories.listBlog();
  }

  @Post()
  create(@Body() body: CategoryDto) {
    return this.categories.createBlog(body);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: Partial<CategoryDto>) {
    return this.categories.updateBlog(id, body);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.categories.removeBlog(id);
  }
}
