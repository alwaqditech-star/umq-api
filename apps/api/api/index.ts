import "reflect-metadata";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverlessExpress from "@codegenie/serverless-express";
import { createApp } from "../dist/bootstrap-app";

type ServerlessHandler = (
  req: VercelRequest,
  res: VercelResponse,
) => void | Promise<void>;

let cachedHandler: ServerlessHandler | undefined;
let bootstrapError: Error | undefined;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (bootstrapError) {
    res.status(500).json({
      status: "error",
      message: "API bootstrap failed",
      hint: "Check Vercel env vars (DATABASE_URL, JWT_SECRET) and Runtime Logs",
      detail: bootstrapError.message,
    });
    return;
  }

  try {
    if (!cachedHandler) {
      if (!process.env.DATABASE_URL) {
        throw new Error(
          "DATABASE_URL is not set in Vercel Environment Variables",
        );
      }

      const app = await createApp();
      await app.init();
      const expressApp = app.getHttpAdapter().getInstance();

      cachedHandler = serverlessExpress({
        app: expressApp as any,
      }) as ServerlessHandler;
    }

    return cachedHandler(req, res);
  } catch (error) {
    bootstrapError =
      error instanceof Error ? error : new Error("Unknown bootstrap error");
    console.error("[Vercel] API bootstrap failed:", bootstrapError);

    res.status(500).json({
      status: "error",
      message: "API bootstrap failed",
      detail: bootstrapError.message,
    });
  }
}
