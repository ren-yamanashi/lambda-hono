import tsEslint from 'typescript-eslint';
import { FlatCompat } from '@eslint/eslintrc';
import eslintConfigPrettier from 'eslint-config-prettier';

const compat = new FlatCompat();

export default tsEslint.config({
  eslintConfigPrettier,
  ...compat.extends(
    'plugin:node/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
  ),
  files: ['**/*.ts', '**/*.js'],
  extends: [tsEslint.configs.base],
  rules: {
    'import/no-duplicates': 'error',
    'import/no-restricted-paths': [
      'error',
      {
        zones: [
          {
            from: './lib/**/*',
            target: './backend/**/*',
          },
          {
            from: './lib/construct/**/*',
            target: './lib/*.ts',
          },
        ],
      },
    ],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
        'newlines-between': 'always',
        // NOTE: 大文字小文字関係なくアルファベット順に並べる
        alphabetize: { order: 'asc', caseInsensitive: true },
        pathGroups: [
          { pattern: './backend/**', group: 'internal', position: 'before' },
          { pattern: './lib/*.ts', group: 'internal', position: 'before' },
          { pattern: './lib/construct/**', group: 'internal', position: 'before' },
        ],
        pathGroupsExcludedImportTypes: ['builtin'],
      },
    ],
  },
});
