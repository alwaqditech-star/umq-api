import { Module } from "@nestjs/common";
import { ServicesService } from "./services.service";
import { ServicesPublicController } from "./services-public.controller";
import { ServicesAdminController } from "./services-admin.controller";

@Module({
  controllers: [ServicesPublicController, ServicesAdminController],
  providers: [ServicesService],
  exports: [ServicesService],
})
export class ServicesModule {}
