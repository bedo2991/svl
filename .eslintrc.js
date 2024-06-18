module.exports = {
  'extends': 'airbnb-base',
  'parser': '@babel/eslint-parser',
  'env': {
    'browser': true,
    'greasemonkey': true,
    'jquery': true,
    'es2020': true,
  },
  'globals': {
    'I18n': 'readonly',
    'W': 'readonly',
    'OpenLayers': 'readonly',
    'WazeWrap': 'readonly',
    'setZeroTimeout': 'readonly',
  },
  'rules': {
    'no-console': 'off',
    'wrap-iife': 'off',
    'no-alert': 'off',
    'dot-notation': 'off',
    'quote-props': [0, 'always'],
  },
  'plugins': ['@babel'],
};
