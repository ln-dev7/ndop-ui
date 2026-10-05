import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vitest.config.{js,ts,mjs,mts}',
          ],
          // The CLI's registry client is bundled into the server (ADR-0009),
          // so the CLI isn't a run-time dependency.
          ignoredDependencies: ['@ndop/cli'],
        },
      ],
    },
  },
];
