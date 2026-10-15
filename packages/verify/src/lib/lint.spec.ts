import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { lintFiles, stylesheetRuleSetting } from './lint';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ndop-verify-lint-'));
  await mkdir(join(root, 'src/app'), { recursive: true });
});
afterEach(() => rm(root, { recursive: true, force: true }));

const config = (body: string) =>
  writeFile(join(root, 'eslint.config.mjs'), `export default ${body};\n`);
const setting = async (file: string) =>
  (await stylesheetRuleSetting(root, 'ndop/no-raw-colors'))(join(root, file));

describe('stylesheetRuleSetting', () => {
  it('is an error without a project config', async () => {
    expect(await setting('src/styles.css')).toBe('error');
  });

  it("is an error when the project's config doesn't set the rule", async () => {
    await config("[{ rules: { 'no-console': 'warn' } }]");
    expect(await setting('src/styles.css')).toBe('error');
  });

  it.each([
    ["'warn'", 'warning'],
    ['1', 'warning'],
    ["['warn']", 'warning'],
    ["'off'", 'off'],
    ['0', 'off'],
    ["'error'", 'error'],
  ])('reads %s as %s', async (value, expected) => {
    await config(`[{ rules: { 'ndop/no-raw-colors': ${value} } }]`);
    expect(await setting('src/app/app.scss')).toBe(expected);
  });

  it('follows file-scoped entries', async () => {
    await config(
      "[{ files: ['src/legacy/**/*.css'], rules: { 'ndop/no-raw-colors': 'off' } }, { files: ['**/*.ts'], rules: { 'ndop/no-raw-colors': 'off' } }]",
    );
    expect(await setting('src/legacy/old.css')).toBe('off');
    expect(await setting('src/styles.css')).toBe('error');
  });

  it("is off for stylesheets the project's config ignores", async () => {
    await config("[{ ignores: ['src/vendor/**'] }]");
    expect(await setting('src/vendor/theme.css')).toBe('off');
    expect(await setting('src/styles.css')).toBe('error');
  });

  it("falls back to an error when the project's config can't be loaded", async () => {
    await writeFile(join(root, 'eslint.config.mjs'), 'export default [;\n');
    expect(await setting('src/styles.css')).toBe('error');
  });
});

describe('lintFiles', () => {
  it("lets the project's config set the severity of Ndop's rules", async () => {
    await config("[{ rules: { 'ndop/no-raw-colors': 'warn' } }]");
    await writeFile(
      join(root, 'src/app/card.html'),
      '<div class="bg-red-500"></div>\n',
    );
    const result = await lintFiles(root, [join(root, 'src/app/card.html')]);
    expect(
      result.problems.map(({ rule, severity }) => [rule, severity]),
    ).toEqual([['ndop/no-raw-colors', 'warning']]);
  });
});
