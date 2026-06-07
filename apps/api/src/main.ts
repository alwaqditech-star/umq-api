import { createApp } from "./bootstrap-app";

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.API_PORT ?? 4001);
  await app.listen(port);
}

void bootstrap();
