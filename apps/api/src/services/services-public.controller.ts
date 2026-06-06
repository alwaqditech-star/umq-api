import { Controller, Get, Param } from "@nestjs/common";
import { ServicesService } from "./services.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("services")
@Public()
export class ServicesPublicController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get()
  findAll() {
    return this.servicesService.findPublished();
  }

  @Get(":slug")
  findOne(@Param("slug") slug: string) {
    return this.servicesService.findPublishedBySlug(slug);
  }
}
