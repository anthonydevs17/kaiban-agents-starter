// @ts-check
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    ignores: ['dist/**', 'node_modules/**'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        console: 'readonly',
        process: 'readonly',
        module: 'readonly',
      },
      parser: (await import('@typescript-eslint/parser')).default,
      parserOptions: {
        project: path.join(__dirname, 'tsconfig.json'),
        tsconfigRootDir: __dirname,
      },
    },
    plugins: {
      '@typescript-eslint': (await import('@typescript-eslint/eslint-plugin')).default,
      import: (await import('eslint-plugin-import')).default,
      n: (await import('eslint-plugin-n')).default,
      promise: (await import('eslint-plugin-promise')).default,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'import/order': ['warn', { 'newlines-between': 'always' }],
      'n/no-missing-import': 'off',
      'promise/always-return': 'off',
      'promise/catch-or-return': 'off',
    },
  },
  {
    // Prettier compatibility
    rules: {
      ...((await import('eslint-config-prettier')).default?.rules || {}),
    },
  },
];
