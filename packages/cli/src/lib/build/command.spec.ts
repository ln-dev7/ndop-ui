import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { createProgram } from '../program';

const scratch = join(import.meta.dirname, '../../../../../tmp');
let root: string;

beforeEach(async () => {
  // CI freezes snapshots by default, which these tests don't exercise.
  vi.stubEnv('CI', '');
  await mkdir(scratch, { recursive: true });
  root = await mkdtemp(join(scratch, 'ndop-build-command-'));
  await mkdir(join(root, 'lib'));
  await writeFile(join(root, 'lib/utils.ts'), 'export const a = 1;\n');
  await writeFile(
    join(root, 'registry.json'),
    JSON.stringify({
      name: 'acme',
      homepage: 'https://acme.dev',
      items: [
        {
          name: 'utils',
          type: 'registry:lib',
          version: '1.0.0',
          title: 'Utils',
          description: 'Helpers.',
          files: [
            {
              path: 'lib/utils.ts',
              type: 'registry:lib',
              target: '{lib}/utils.ts',
            },
          ],
        },
      ],
    }),
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  process.exitCode = undefined;
  vi.unstubAllEnvs();
});

/**
 * Runs `ndop` with arguments and captures what it prints.
 *
 * @param args - Command-line arguments after `ndop`.
 * @returns Printed output.
 */
async function run(...args: string[]): Promise<string> {
  let output = '';
  const program = createProgram('0.0.0').configureOutput({
    writeOut: (text) => (output += text),
  });
  await program.parseAsync(args, { from: 'user' });
  return stripVTControlCharacters(output);
}

describe('ndop build', () => {
  it('prints a machine-readable result with --json', async () => {
    const output = await run(
      'build',
      '--cwd',
      root,
      '--dry-run',
      '--json',
      '--no-compile',
    );
    expect(JSON.parse(output)).toEqual(
      expect.objectContaining({
        ok: true,
        items: [{ name: 'utils', version: '1.0.0', snapshot: 'created' }],
        files: ['r/index.json', 'r/utils.json', 'r/utils@1.0.0.json'],
      }),
    );
    expect(process.exitCode).toBeUndefined();
  });

  it('prints issues and exits with code 1 when the build fails', async () => {
    await rm(join(root, 'lib/utils.ts'));
    const output = await run('build', '--cwd', root, '--no-compile');
    expect(output).toContain('utils › lib/utils.ts: File not found.');
    expect(output).toContain('Build failed with 1 issue(s).');
    expect(process.exitCode).toBe(1);
  });
});
