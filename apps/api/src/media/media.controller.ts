import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Request, Response } from "express";
import { MediaService } from "./media.service";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Public } from "../common/decorators/public.decorator";
import type { RequestUser } from "../common/types/request-user";

@Controller("admin/media")
@RequirePermissions("cms:manage")
export class MediaAdminController {
  constructor(private readonly media: MediaService) {}

  @Get()
  list() {
    return this.media.list();
  }

  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @CurrentUser() user: RequestUser,
  ) {
    const body = req.body as {
      folder?: string;
      altAr?: string;
      altEn?: string;
    };
    return this.media.upload(
      file,
      {
        folder: body.folder,
        altAr: body.altAr,
        altEn: body.altEn,
      },
      user.id,
    );
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.media.remove(id);
  }
}

@Controller("media/files")
@Public()
export class MediaFilesController {
  constructor(private readonly media: MediaService) {}

  @Get("*")
  async serve(@Req() req: Request, @Res() res: Response) {
    const storageKey = decodeURIComponent(
      req.path.replace(/^\/api\/v1\/media\/files\/?/, ""),
    );
    try {
      const { stream } = this.media.resolveFileStream(storageKey);
      stream.pipe(res);
    } catch {
      const item = await this.media.findByStorageKey(storageKey);
      if (item?.url.startsWith("http")) {
        res.redirect(302, item.url);
        return;
      }
      res.status(404).json({ message: "File not found" });
    }
  }
}
