// @ts-check
// The lint step of the coding-rulebook's React tool gate: `eslint . --max-warnings 0`.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

export default defineConfig([
  // Next's rules, React's, the React Hooks rules (the React Compiler's diagnostics among them) and import's.
  ...nextVitals,
  globalIgnores([".next/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
  {
    files: ["**/*.{ts,tsx,mts}"],
    extends: [tseslint.configs.strictTypeChecked],
    // No circular imports: the settings let the rule find, read and follow a `.ts` or `.tsx` file
    // imported without its extension.
    plugins: { "import-x": importX },
    settings: {
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
      // Accessibility: the whole recommended set, where Next turns on only a few of its rules.
      ...jsxA11y.flatConfigs.recommended.rules,
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
