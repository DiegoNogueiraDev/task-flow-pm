module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint'],
    extends: [
      'eslint:recommended',
      '@typescript-eslint/recommended',
      'airbnb-typescript/base',
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      'import/prefer-default-export': 'off',
      'class-methods-use-this': 'off',
      'no-console': 'off',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    },
    env: {
      node: true,
      es2022: true,
    },
    ignorePatterns: ['dist/', 'node_modules/', '*.js'],
  };