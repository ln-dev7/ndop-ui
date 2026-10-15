import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkStylesheets, colorFix } from './styles';

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ndop-verify-'));
  await mkdir(join(root, 'src/app/settings'), { recursive: true });
  await writeFile(
    join(root, 'ndop.json'),
    JSON.stringify({ tailwind: { css: 'src/styles.css' } }),
  );
});
afterEach(() => rm(root, { recursive: true, force: true }));

const STYLES = `@import 'tailwindcss';
@import '@ndop/core/styles.css';
@import './app/app.css';

:root {
  --background: oklch(1 0 0);
  --primary: oklch(0.205 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
}
`;

describe('checkStylesheets', () => {
  it('reports a palette and color literals in a stylesheet the Tailwind stylesheet imports', async () => {
    await writeFile(join(root, 'src/styles.css'), STYLES);
    await writeFile(
      join(root, 'src/app/app.css'),
      `@scope (app-root) {
  :scope {
    --ink: #18332d;
    --lime: #d7f36b;
  }
  .card {
    color: #fff;
    background: var(--ink);
  }
}
`,
    );
    const result = await checkStylesheets(root, []);
    expect(result.fix).toBe(
      "Use the theme's color tokens: as utilities (`bg-primary`, `text-muted-foreground`, `border-border`) in templates, as `var(--primary)` in CSS. This project's color tokens: background, primary.",
    );
    expect(
      result.problems.map(({ file, line, column, rule, message }) => ({
        file,
        line,
        column,
        rule,
        message,
      })),
    ).toEqual([
      {
        file: 'src/app/app.css',
        line: 3,
        column: 5,
        rule: 'ndop/no-raw-colors',
        message:
          "`--ink` defines its own color (`#18332d`), a palette beside the theme's; use the theme's tokens, such as `var(--primary)` or `bg-primary`, or add the color to the theme in the Tailwind stylesheet or a stylesheet it imports.",
      },
      expect.objectContaining({ line: 4, column: 5 }),
      {
        file: 'src/app/app.css',
        line: 7,
        column: 12,
        rule: 'ndop/no-raw-colors',
        message:
          "`#fff` is a color outside the theme's tokens; use a token: `bg-primary`, `text-muted-foreground` or `border-border` in classes, `var(--primary)` in CSS.",
      },
    ]);
    expect(result.problems.every((problem) => problem.fix === result.fix)).toBe(
      true,
    );
  });

  it("checks components' stylesheets and their imports, and the Tailwind stylesheet outside the theme's blocks", async () => {
    await writeFile(
      join(root, 'src/styles.css'),
      `${STYLES}\nbody { background: white; }\n`,
    );
    await writeFile(
      join(root, 'src/app/settings/settings.scss'),
      "// a comment with #fff\n@use './tokens';\n:host { border-color: var(--border); }\n",
    );
    await writeFile(
      join(root, 'src/app/settings/_tokens.scss'),
      '.x { @apply bg-zinc-900; }\n',
    );
    const result = await checkStylesheets(root, [
      'src/app/settings/settings.scss',
    ]);
    expect(
      result.problems.map(({ file, line, message }) => [
        file,
        line,
        message.split(' ')[0],
      ]),
    ).toEqual([
      ['src/styles.css', 15, '`white`'],
      ['src/app/settings/_tokens.scss', 1, '`bg-zinc-900`'],
    ]);
  });

  it('passes stylesheets that use only tokens', async () => {
    await writeFile(join(root, 'src/styles.css'), STYLES);
    await writeFile(
      join(root, 'src/app/app.css'),
      ':host { color: var(--foreground); background: color-mix(in oklch, var(--primary) 10%, transparent); }\n',
    );
    expect((await checkStylesheets(root, [])).problems).toEqual([]);
  });

  it('allows the theme split into a stylesheet the Tailwind stylesheet imports', async () => {
    await writeFile(
      join(root, 'src/styles.css'),
      "@import 'tailwindcss';\n@import './theme.css';\n@import './app/app.css';\n",
    );
    await writeFile(
      join(root, 'src/theme.css'),
      `@theme inline {
  --color-brand: var(--brand);
}
:root {
  --brand: #1e3170;
  --primary: oklch(0.205 0 0);
}
.dark {
  --brand: #8ea2e8;
}
.badge {
  color: #1e3170;
}
`,
    );
    await writeFile(
      join(root, 'src/app/app.css'),
      '@scope (app-root) { :scope { --ink: #18332d; } }\n',
    );
    await writeFile(
      join(root, 'src/app/settings/settings.css'),
      "@import '../../theme.css';\n:host { color: var(--brand); }\n",
    );
    const result = await checkStylesheets(root, [
      'src/app/settings/settings.css',
    ]);
    expect(
      result.problems.map(({ file, line, message }) => [
        file,
        line,
        message.split(' ')[0],
      ]),
    ).toEqual([
      ['src/theme.css', 12, '`#1e3170`'],
      ['src/app/app.css', 1, '`--ink`'],
    ]);
    expect(result.fix).toContain(
      "This project's color tokens: brand, primary.",
    );
  });

  it("follows the project's setting for each stylesheet", async () => {
    await writeFile(join(root, 'src/styles.css'), STYLES);
    await writeFile(join(root, 'src/app/app.css'), ':host { color: #fff }\n');
    await writeFile(join(root, 'src/app/a.css'), ':host { color: red }\n');
    const result = await checkStylesheets(
      root,
      ['src/app/a.css'],
      async (file) => (file.endsWith('app.css') ? 'warning' : 'off'),
    );
    expect(
      result.problems.map(({ file, severity }) => [file, severity]),
    ).toEqual([['src/app/app.css', 'warning']]);
  });

  it('still checks component stylesheets without ndop.json', async () => {
    await rm(join(root, 'ndop.json'));
    await writeFile(join(root, 'src/app/a.css'), ':host { color: red }\n');
    const result = await checkStylesheets(root, ['src/app/a.css']);
    expect(result.problems).toHaveLength(1);
    expect(result.fix).toBe(colorFix([]));
  });
});
