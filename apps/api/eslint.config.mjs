import { nestJsConfig } from "@umq/eslint-config/nest-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nestJsConfig,
  {
    ignores: ["dist/**", "node_modules/**"],
  },
];
