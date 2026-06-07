import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { AppModule } from "./app.module";

export async function createApp(): Promise<NestExpressApplication> {
  if (process.env.VERCEL && !process.env.UPLOAD_DIR) {
    process.env.UPLOAD_DIR = "/tmp/uploads";
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const httpApp = app.getHttpAdapter().getInstance() as {
    set: (key: string, value: unknown) => void;
  };
  httpApp.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production" ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cookieParser());

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    credentials: true,
  });

  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  return app;
}
