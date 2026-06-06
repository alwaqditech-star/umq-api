import { Controller, Get } from "@nestjs/common";
import { TestimonialsService } from "./testimonials.service";
import { Public } from "../common/decorators/public.decorator";

@Controller("testimonials")
@Public()
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Get()
  findAll() {
    return this.testimonialsService.findPublished();
  }
}
