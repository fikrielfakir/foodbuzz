// @ts-check
const { FlatCompat } = require('@eslint/eslintrc');
const js = require('@eslint/js');
const path = require('path');
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended
});

module.exports = [
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', '*.config.js']
  },
  ...compat.extends(
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:react-native/all',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ),
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      'react-native/no-raw-text': 'off',
      'react/react-in-jsx-scope': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/prop-types': 'off',
      'react-native/sort-styles': 'off'
    }
  },
  {
    settings: {
      react: {
        version: 'detect'
      }
    }
  }
];