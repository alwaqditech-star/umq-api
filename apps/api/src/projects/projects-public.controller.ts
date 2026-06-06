import { Controller, Get, Param, Query } from "@nestjs/common";
import { ProjectsService } from "./projects.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("projects")
@Public()
export class ProjectsPublicController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(@Query("category") category?: string) {
    return this.projectsService.findPublished(category);
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.projectsService.findPublishedBySlug(slug);
  }
}
