import js from '@eslint/js'
import globals from 'globals'

export default [
  { ignores: ['node_modules/', '_site/'] },
  js.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: 'error',
    },
  },
]
