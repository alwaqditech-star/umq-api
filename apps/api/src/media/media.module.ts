import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "../prisma/prisma.module";
import { MediaService } from "./media.service";
import { MediaAdminController, MediaFilesController } from "./media.controller";

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [MediaAdminController, MediaFilesController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
