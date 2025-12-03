import globals from 'globals';
import prettierRecommendedConfig from 'eslint-plugin-prettier/recommended';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';
import js from '@eslint/js';

export default defineConfig(js.configs.recommended, tseslint.configs.recommended, prettierRecommendedConfig, [
  {
    files: ['src/**/*.ts'],
    ignores: ['/dist/*', '/node_modules'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: {},
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-var-requires': 'warn',
      'no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'no-console': 'warn',
      'lines-between-class-members': 'warn',
      'no-case-declarations': 'off',
      'prettier/prettier': 'warn',
    },
  },
]);
