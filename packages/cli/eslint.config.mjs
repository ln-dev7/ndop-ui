import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  // Fixtures are copies of generated Angular apps, not CLI source.
  { ignores: ['fixtures/**'] },
  {
    files: ['**/*.json'],
    rules: {
      '@nx/dependency-checks': [
        'error',
        {
          ignoredFiles: [
            '{projectRoot}/eslint.config.{js,cjs,mjs,ts,cts,mts}',
            '{projectRoot}/vitest.config.{js,ts,mjs,mts}',
            // Tests load the workspace's @angular/compiler; the CLI loads
            // the project's own at run time.
            '{projectRoot}/src/**/*.spec.ts',
            '{projectRoot}/src/testing/**',
          ],
          // Loaded by name at run time, from the project when it has it.
          ignoredDependencies: ['@ndop/verify'],
        },
      ],
    },
    languageOptions: {
      parser: await import('jsonc-eslint-parser'),
    },
  },
];
