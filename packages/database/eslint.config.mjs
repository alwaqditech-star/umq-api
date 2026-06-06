import { config } from "@umq/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    ignores: ["prisma/migrations/**"],
  },
];
