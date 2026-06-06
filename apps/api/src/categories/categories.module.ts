import { Module } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import {
  BlogCategoriesAdminController,
  ProjectCategoriesAdminController,
} from "./categories-admin.controller";

@Module({
  controllers: [
    ProjectCategoriesAdminController,
    BlogCategoriesAdminController,
  ],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
