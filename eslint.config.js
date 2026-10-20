import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import tseslint from "typescript-eslint";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  globalIgnores(["dist", "docs", "node_modules", ".agents", ".claude"]),
  {
    files: [
      "scripts/capture-discord.js",
      "src/features/preview/fixture/bootstrap.js",
      "src/features/preview/fixture/inspector.js",
      "src/features/preview/fixture/sample-content.js",
    ],
    extends: [js.configs.recommended],
    languageOptions: {
      globals: {
        ...globals.browser,
        createInspector: "readonly",
        inspectorTargetGroups: "readonly",
        addPreviewSamples: "readonly",
      },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "simple-import-sort/imports": "error",
      "react-hooks/set-state-in-effect": "off",
      "react-refresh/only-export-components": [
        "error",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: { "react-refresh/only-export-components": "off" },
  },
]);
