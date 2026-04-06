import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname
});

export default [
  {
    ignores: ['node_modules/**', 'dist/**', 'dist-electron/**', 'release/**', 'renderer/out/**']
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      '@next/next/no-html-link-for-pages': 'off'
    }
  }
];
