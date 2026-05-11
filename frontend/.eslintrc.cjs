module.exports = {
  root: true,
  env: {
    es2021: true,
  },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'script',
  },
  globals: {
    App: 'readonly',
    Component: 'readonly',
    Page: 'readonly',
    getApp: 'readonly',
    module: 'readonly',
    require: 'readonly',
    wx: 'readonly',
  },
  ignorePatterns: ['node_modules'],
};
