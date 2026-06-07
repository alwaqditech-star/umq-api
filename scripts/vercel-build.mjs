import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL =
    "mysql://build:build@127.0.0.1:3306/build?sslaccept=strict";
}

const run = (command) =>
  execSync(command, {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "development" },
    cwd: monorepoRoot,
  });

run("pnpm --filter @umq/database exec prisma generate");
run("pnpm --filter @umq/shared build");
run("pnpm --filter @umq/api build");
