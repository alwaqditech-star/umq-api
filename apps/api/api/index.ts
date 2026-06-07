import type { VercelRequest, VercelResponse } from "@vercel/node";
import serverlessExpress from "@codegenie/serverless-express";
import { createApp } from "../dist/bootstrap-app";

type ServerlessHandler = (
  req: VercelRequest,
  res: VercelResponse,
) => void | Promise<void>;

let cachedHandler: ServerlessHandler | undefined;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (!cachedHandler) {
    const app = await createApp();
    await app.init();
    const expressApp = app.getHttpAdapter().getInstance();
    cachedHandler = serverlessExpress({
      app: expressApp,
    }) as ServerlessHandler;
  }

  return cachedHandler(req, res);
}
