module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-native',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // ============================================================
    // ARCHITECTURE ENFORCEMENT RULES (CRITICAL)
    // ============================================================
    
    // Rule 1: NO API calls in UI layers (screens/components)
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@react-native-picker/picker',
            message:
              '🚫 Do not use inline Android Picker — it crashes when TextInputs on the same screen re-render. Use ModalDropdownField instead.',
          },
        ],
        patterns: [
          {
            group: ['**/core/api/*', '@core/api/*'],
            message: '🚫 API LAYER VIOLATION: Screens and components CANNOT import from core/api. Use hooks from core/hooks instead.',
          },
          {
            group: ['axios', 'fetch'],
            message: '🚫 API LAYER VIOLATION: Direct HTTP calls are forbidden in UI. Use core/api layer.',
          },
        ],
      },
    ],

    // Rule 2: NO domain imports in screens (but hooks CAN import domain)
    // This rule is overridden for specific file patterns below

    // Additional strict rules
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      },
    ],
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
  overrides: [
    // Screens: STRICT rules
    {
      files: ['src/platforms/*/screens/**/*.tsx', 'src/platforms/*/screens/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/core/api/*', '@core/api/*'],
                message: '🚫 SCREENS: Cannot import API layer. Use hooks.',
              },
              {
                group: ['**/core/domain/*', '@core/domain/*'],
                message: '🚫 SCREENS: Cannot import domain logic. Use hooks.',
              },
              {
                group: ['**/core/store/*', '@core/store/*'],
                message: '🚫 SCREENS: Cannot import store directly. Use hooks.',
              },
              {
                group: ['axios', 'fetch'],
                message: '🚫 SCREENS: No HTTP calls allowed.',
              },
            ],
          },
        ],
      },
    },
    
    // Components: Similar strict rules
    {
      files: ['src/platforms/*/components/**/*.tsx', 'src/platforms/*/components/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/core/api/*', '@core/api/*'],
                message: '🚫 COMPONENTS: Cannot import API layer. Use hooks or props.',
              },
              {
                group: ['**/core/domain/*', '@core/domain/*'],
                message: '🚫 COMPONENTS: Cannot import domain logic. Use hooks or props.',
              },
              {
                group: ['axios', 'fetch'],
                message: '🚫 COMPONENTS: No HTTP calls allowed.',
              },
            ],
          },
        ],
      },
    },

    // Hooks: Can import domain and API, but NOT store directly
    {
      files: ['src/core/hooks/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/platforms/*', '@platforms/*', '@mobile/*', '@web/*'],
                message: '🚫 HOOKS: Cannot import platform-specific code. Keep hooks platform-agnostic.',
              },
            ],
          },
        ],
      },
    },

    // Domain logic: Can ONLY import types and other domain logic
    {
      files: ['src/core/domain/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/platforms/*', '@platforms/*', '@mobile/*', '@web/*'],
                message: '🚫 DOMAIN: Cannot import platform code.',
              },
              {
                group: ['**/hooks/*', '@core/hooks/*'],
                message: '🚫 DOMAIN: Cannot import hooks.',
              },
              {
                group: ['react', 'react-native'],
                message: '🚫 DOMAIN: Business logic must be framework-agnostic.',
              },
            ],
          },
        ],
      },
    },

    // API layer: Can ONLY import types
    {
      files: ['src/core/api/**/*.ts'],
      rules: {
        'no-restricted-imports': [
          'error',
          {
            patterns: [
              {
                group: ['**/platforms/*', '@platforms/*', '@mobile/*', '@web/*'],
                message: '🚫 API: Cannot import platform code.',
              },
              {
                group: ['**/hooks/*', '@core/hooks/*'],
                message: '🚫 API: Cannot import hooks.',
              },
              {
                group: ['**/domain/*', '@core/domain/*'],
                message: '🚫 API: Cannot import domain logic.',
              },
              {
                group: ['react', 'react-native'],
                message: '🚫 API: Must be framework-agnostic.',
              },
            ],
          },
        ],
      },
    },
  ],
};
