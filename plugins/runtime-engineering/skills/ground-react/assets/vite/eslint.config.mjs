// @ts-check
// The lint step for a page built with Vite, which has no eslint-config-next to bring the plugins:
// each one is registered here. Move this file to the app's root in place of the Next.js config.
import { defineConfig, globalIgnores } from "eslint/config";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

export default defineConfig([
  globalIgnores(["dist/**", "playwright-report/**", "test-results/**"]),
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [
      tseslint.configs.strictTypeChecked,
      // React's rules, for the JSX transform that needs no `React` in scope.
      react.configs.flat.recommended,
      react.configs.flat["jsx-runtime"],
      // The Rules of Hooks and the React Compiler's diagnostics.
      reactHooks.configs.flat.recommended,
      // Accessibility: the whole recommended set.
      jsxA11y.flatConfigs.recommended,
    ],
    // No circular imports: the settings let the rule find, read and follow a `.ts` or `.tsx` file
    // imported without its extension.
    plugins: { "import-x": importX },
    settings: {
      // Named, not "detect": the plugin's detection calls an API that ESLint 10 removed.
      react: { version: "19" },
      "import-x/extensions": SOURCE_EXTENSIONS,
      "import-x/parsers": { "@typescript-eslint/parser": [".ts", ".tsx", ".mts"] },
      "import-x/resolver-next": [createNodeResolver({ extensions: SOURCE_EXTENSIONS })],
    },
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // The TypeScript tool gate's rules; React code is TypeScript.
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "@typescript-eslint/explicit-module-boundary-types": "error",
      "@typescript-eslint/no-unsafe-type-assertion": "error",
      "@typescript-eslint/strict-boolean-expressions": "error",
      "import-x/no-cycle": "error",
      // Untrusted HTML never reaches the DOM as markup.
      "react/no-danger": "error",
      // One import per component keeps the dev server and the editor fast.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@mui/material", message: "Import each component from its own path: @mui/material/Button." },
            { name: "@mui/icons-material", message: "Import each icon from its own path." },
          ],
          patterns: [{ group: ["@mui/*/*/*"], message: "A path deeper than one level is private to the library." }],
        },
      ],
    },
  },
]);
