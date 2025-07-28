module.exports = {
    env: {
        es2021: true,
        node: true,
        jest: true,
    },
    extends: [
        'airbnb-base',
        'plugin:jest/recommended',
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
    },
    plugins: [
        'jest',
    ],
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        'prefer-const': 'error',
        'arrow-body-style': ['error', 'as-needed'],
        'prefer-arrow-callback': 'error',
        'no-var': 'error',
        'object-shorthand': 'error',
        'consistent-return': 'off',
        'no-underscore-dangle': ['error', { allow: ['_id'] }],
        'max-len': ['error', { code: 120, ignoreUrls: true }],
        'import/prefer-default-export': 'off',
        'no-param-reassign': ['error', { props: false }],
        'no-use-before-define': ['error', { functions: false }],
        'jest/no-disabled-tests': 'warn',
        'jest/no-focused-tests': 'error',
        'jest/no-identical-title': 'error',
        'jest/prefer-to-have-length': 'warn',
        'jest/valid-expect': 'error',
    },
    settings: {
        'import/resolver': {
            node: {
                extensions: ['.js', '.json'],
            },
        },
    },
};