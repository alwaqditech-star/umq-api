import "reflect-metadata";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Application } from "express";
import { createApp } from "../dist/bootstrap-app";

let expressApp: Application | undefined;
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
    if (!expressApp) {
      if (!process.env.DATABASE_URL) {
        throw new Error(
          "DATABASE_URL is not set in Vercel Environment Variables",
        );
      }

      const app = await createApp();
      await app.init();
      expressApp = app.getHttpAdapter().getInstance() as Application;
    }

    expressApp(req, res);
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
