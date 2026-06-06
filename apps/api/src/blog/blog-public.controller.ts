import { Controller, Get, Param, Query } from "@nestjs/common";
import { BlogService } from "./blog.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("blog/posts")
@Public()
export class BlogPublicController {
  constructor(private readonly blogService: BlogService) {}

  @Get()
  findAll(@Query("locale") locale?: string) {
    return this.blogService.findPublished(locale);
  }

  @Get(":slug/related")
  related(
    @Param("slug") slug: string,
    @Query("locale") locale?: string,
    @Query("limit") limit?: string,
  ) {
    return this.blogService.findRelated(
      slug,
      locale,
      limit ? Number(limit) : 3,
    );
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string, @Query("locale") locale?: string) {
    return this.blogService.findPublishedBySlug(slug, locale);
  }
}
