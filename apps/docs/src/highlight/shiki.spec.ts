// @vitest-environment node
import { codeToHtml } from 'shiki';
import { commandFor, THEMES, transformers } from './shiki';

/**
 * Highlights a block the way the content pipeline does.
 *
 * @param code - Source.
 * @param meta - The fence's meta string, such as `title="a.ts" {2}`.
 * @returns The HTML.
 */
function highlight(code: string, meta = ''): Promise<string> {
  return codeToHtml(code, {
    lang: 'ts',
    themes: THEMES,
    defaultColor: false,
    meta: { __raw: meta },
    transformers: transformers(),
  });
}

describe('code frame', () => {
  it('wraps a plain block with a floating copy button', async () => {
    const html = await highlight('const a = 1;');
    expect(html).toMatch(
      /^<figure class="code-frame" data-language="ts"><button/,
    );
    expect(html).toContain('aria-label="Copy code"');
    expect(html).not.toContain('code-frame-header');
  });

  it('adds a header with the file name when the block has a title', async () => {
    const html = await highlight('const a = 1;', 'title="src/a.ts"');
    expect(html).toContain('class="code-frame code-frame-titled"');
    expect(html).toContain('<span class="code-frame-title">src/a.ts</span>');
    expect(html).toContain('<span class="code-frame-title">src/a.ts</span>');
    expect(html).toMatch(/code-frame-header">.*<button[^>]*data-code-copy/);
  });

  it('shows a pm block as one command per package manager, in tabs', async () => {
    const html = await codeToHtml('npx ndop add dialog', {
      lang: 'bash',
      themes: THEMES,
      meta: { __raw: 'pm' },
      transformers: transformers(),
    });
    expect(html).toContain('role="tablist"');
    expect(html).toMatch(/role="tab"[^>]*aria-selected="true"[^>]*>npm</);
    expect(html).toContain('<code>pnpm dlx ndop add dialog</code>');
    expect(html).toContain('<code>bunx ndop add dialog</code>');
    expect(html.match(/role="tabpanel"/g)).toHaveLength(4);
    expect(html.match(/role="tabpanel"[^>]*hidden/g)).toHaveLength(3);
  });

  it('numbers the lines of longer blocks, and ignores slashes in the title', async () => {
    const html = await highlight(
      'export const appConfig = {};\nconst app = 1;',
      'title="src/app/app.config.ts"',
    );
    expect(html).toContain('code-frame-numbered');
    expect(html).not.toContain('highlighted-word');
  });

  it('highlights lines and words from the meta, and marks diffs', async () => {
    const html = await highlight(
      'const a = 1;\nconst b = 2; // [!code ++]\nconst c = 3;',
      '{3} /const c/',
    );
    expect(html).toContain('class="line diff add"');
    expect(html).toContain('class="line highlighted"');
    expect(html).toContain('highlighted-word');
  });
});

describe('commandFor', () => {
  it('translates running a package', () => {
    expect(commandFor('pnpm', 'npx ndop init')).toBe('pnpm dlx ndop init');
    expect(commandFor('yarn', 'npx ndop init')).toBe('yarn dlx ndop init');
    expect(commandFor('bun', 'npx ndop init')).toBe('bunx ndop init');
    expect(commandFor('npm', 'npx ndop init')).toBe('npx ndop init');
  });

  it('translates installing packages and running scripts', () => {
    expect(commandFor('pnpm', 'npm install @ndop/core')).toBe(
      'pnpm add @ndop/core',
    );
    expect(commandFor('bun', 'npm i -D tailwindcss')).toBe(
      'bun add -D tailwindcss',
    );
    expect(commandFor('yarn', 'npm install')).toBe('yarn install');
    expect(commandFor('pnpm', 'npm run build')).toBe('pnpm run build');
  });

  it('leaves other commands alone', () => {
    expect(commandFor('pnpm', 'cd my-app')).toBe('cd my-app');
  });
});
