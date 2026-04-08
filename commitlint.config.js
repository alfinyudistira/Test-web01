export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-case': [2, 'always', 'lower-case'],
    'scope-enum': [
      2,
      'always',
      [
        'ui', 
        'components',
        'modules',
        'store',  
        'hooks', 
        'lib',  
        'i18n', 
        'types',  
        'router',  
        'config', 
        'deps'    
      ],
    ],

    'subject-empty': [2, 'never'],
    'type-empty': [2, 'never'],
  },
};
