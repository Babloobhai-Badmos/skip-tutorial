import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      // Spec section 5: horrorLevel is managed ONLY by the HorrorDirector.
      'no-restricted-properties': [
        'error',
        {
          property: 'setHorrorLevel',
          message: 'Only src/core/horrorDirector.ts may change horrorLevel.',
        },
      ],
    },
  },
  {
    files: ['src/core/horrorDirector.ts', 'tests/**'],
    rules: { 'no-restricted-properties': 'off' },
  },
);
