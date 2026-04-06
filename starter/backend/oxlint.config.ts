import security from 'eslint-plugin-security';
import { defineConfig } from 'oxlint';

export default defineConfig({
  plugins: ['typescript', 'unicorn', 'oxc'],
  jsPlugins: ['eslint-plugin-security'],
  categories: {
    correctness: 'error',
    suspicious: 'warn',
  },
  rules: {
    ...security.configs.recommended.rules,
    'security/detect-object-injection': 'off',
    'import/no-cycle': 'error',
    'no-console': ['warn', { allow: ['error', 'warn'] }],
    'no-undef': 'off',
    'no-unused-vars': 'off',
    'oxc/no-async-endpoint-handlers': 'off',
    'typescript/no-explicit-any': 'error',
    'typescript/no-namespace': 'off',
    'typescript/no-require-imports': 'off',
    'typescript/no-unused-vars': 'off',
  },
  env: {
    builtin: true,
    node: true,
  },
  options: {
    reportUnusedDisableDirectives: 'error',
  },
  overrides: [
    {
      files: ['src/db/seed.ts'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
});
