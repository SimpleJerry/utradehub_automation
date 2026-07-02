import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "dist/**",
      "build/**",
      "web/dist/**",
      "playwright-browsers/**",
      "packaging/**",
      "data/**",
      "logs/**",
      "resources/**",
      ".venv/**",
      ".idea/**",
      "openspec/**",
      ".claude/**",
      "app/**",
      "desktop/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ["scripts/**/*.mjs", ".codex/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["web/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
);
