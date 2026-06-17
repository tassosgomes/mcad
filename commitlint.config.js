module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'build',
        'chore',
        'ci',
        'docs',
        'feat',
        'fix',
        'perf',
        'refactor',
        'revert',
        'style',
        'test',
        'security',
      ],
    ],
    'subject-case': [0],
    'body-max-line-length': [1, 'always', 200],
    'footer-max-line-length': [1, 'always', 200],
  },
};
