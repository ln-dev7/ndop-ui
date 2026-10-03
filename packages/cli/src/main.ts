import { createRequire } from 'node:module';
import { createProgram } from './lib/program';

// The published main.js sits next to its package.json; reading the version
// at runtime keeps it in sync with what was released.
const { version } = createRequire(import.meta.url)('./package.json') as {
  version: string;
};

await createProgram(version).parseAsync(process.argv);
