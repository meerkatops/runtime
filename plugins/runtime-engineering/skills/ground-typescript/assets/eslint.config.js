// @ts-check
// The lint step of the coding-rulebook's TypeScript tool gate: `eslint . --max-warnings 0`.
import { defineConfig } from "eslint/config";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist/"] },
  {
    files: ["**/*.{ts,js,mjs}"],
    extends: [tseslint.configs.strictTypeChecked],
    // T21, no circular imports: the settings let the rule read and follow `.ts` files.
    plugins: { "import-x": importX },
    settings: {
      "import-x/extensions": [".ts", ".js", ".mjs"],
      "import-x/parsers": { "@typescript-eslint/parser": [".ts"] },
      // "source" is the condition package.json's `imports` maps to src, so a cycle through `#lib` is seen unbuilt.
      "import-x/resolver-next": [createNodeResolver({ conditionNames: ["source", "import", "default"] })],
    },
    languageOptions: {
      parserOptions: {
        // This file sits outside tsconfig.json's `include`, so it is typed by the default project.
        projectService: { allowDefaultProject: ["eslint.config.js"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "import-x/no-cycle": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
    },
  },
);
