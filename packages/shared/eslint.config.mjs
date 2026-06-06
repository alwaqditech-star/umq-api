import { config } from "@umq/eslint-config/base";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...config,
  {
    ignores: ["dist/**", "src/**/*.js", "src/**/*.d.ts"],
  },
];
