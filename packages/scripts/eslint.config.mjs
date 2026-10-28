import baseConfig from '@vibru/config/eslint/base';

export default [
  ...baseConfig,
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
];
