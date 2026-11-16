// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = tseslint.config(
  { ignores: ['dist/**', '.angular/**', 'projects/**'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'sfl', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: 'sfl', style: 'kebab-case' },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'always' },
      ],
      '@typescript-eslint/no-unused-expressions': [
        'error',
        { allowShortCircuit: true, allowTernary: true },
      ],
      // FSD: a slice is imported only through its index.ts (S3.17); `@x` is the entities cross-import (ADR 0016)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@entities/*/*', '!@entities/*/@x', '!@entities/*/@x/*'],
              message:
                'Import a slice only through its index.ts: @entities/<slice>.',
            },
            {
              group: ['@features/*/*'],
              message:
                'Import a slice only through its index.ts: @features/<slice>.',
            },
            {
              group: ['@pages/*/*'],
              message:
                'Import a slice only through its index.ts: @pages/<slice>.',
            },
          ],
        },
      ],
      // Angular 22 включает OnPush по умолчанию; миграция выставила Eager у существующих
      // компонентов, переход на OnPush — отдельная работа (S12.3)
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
