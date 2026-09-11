import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "android", "portaria-app", "coletor-portaria", "supabase/functions"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-empty": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "no-case-declarations": "warn",
      "no-useless-escape": "warn",
      "prefer-const": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "@typescript-eslint/ban-ts-comment": "warn",
      "no-constant-binary-expression": "warn",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
      "no-control-regex": "warn",
    },
  },
);
