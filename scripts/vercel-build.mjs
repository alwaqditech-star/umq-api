import { execSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "mysql://build:build@127.0.0.1:3306/build?sslaccept=strict";
}

execSync("pnpm --filter @umq/database exec prisma generate", {
  stdio: "inherit",
  env: process.env,
});
execSync("pnpm --filter @umq/shared build", { stdio: "inherit" });
execSync("pnpm --filter @umq/api build", { stdio: "inherit" });
