import { Controller, Get, Query } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { SearchService } from "./search.service";

@Controller("search")
@Public()
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  query(@Query("q") q: string, @Query("locale") locale?: string) {
    return this.search.searchPublic(q ?? "", locale);
  }
}
