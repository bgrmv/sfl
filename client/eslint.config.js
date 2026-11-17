// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

// FSD (S3.17, S3.8, ADR 0016): imports go only down the layers, a slice is imported through its index.ts,
// slices of one layer do not import each other (entities: only the `@x` notation).
const slicePattern = layer => ({
  group: [`@${layer}/*/*`, `!@${layer}/*/@x`, `!@${layer}/*/@x/*`],
  message: `Import a slice only through its index.ts: @${layer}/<slice>.`,
});
const upwardPattern = layers => ({
  group: layers.map(l => `@${l}`).concat(layers.map(l => `@${l}/*`)),
  message: 'FSD: a layer imports only from the layers below it.',
});
const sameLayerPattern = layer => ({
  regex: `^@${layer}/[^/]+$`,
  message: `FSD: slices of the ${layer} layer do not import each other.`,
});
const layerRule = patterns => ({
  'no-restricted-imports': ['error', { patterns }],
});
function fsdBoundaries() {
  return [
    {
      files: ['**/*.ts'],
      rules: layerRule([
        slicePattern('entities'),
        slicePattern('features'),
        slicePattern('pages'),
      ]),
    },
    {
      files: ['src/shared/**/*.ts'],
      rules: layerRule([
        upwardPattern(['app', 'pages', 'features', 'entities']),
      ]),
    },
    {
      files: ['src/entities/**/*.ts'],
      rules: layerRule([
        slicePattern('entities'),
        upwardPattern(['app', 'pages', 'features']),
        sameLayerPattern('entities'),
      ]),
    },
    {
      files: ['src/features/**/*.ts'],
      rules: layerRule([
        slicePattern('entities'),
        upwardPattern(['app', 'pages']),
        sameLayerPattern('features'),
      ]),
    },
    {
      files: ['src/pages/**/*.ts'],
      rules: layerRule([
        slicePattern('entities'),
        slicePattern('features'),
        upwardPattern(['app']),
        sameLayerPattern('pages'),
      ]),
    },
  ];
}

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
    },
  },
  ...fsdBoundaries(),
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {},
  },
);
