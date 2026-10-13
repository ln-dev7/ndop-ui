import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { encodeTheme } from '@ndop/schema/theme';
import { parseHeaders, serveSite, type SiteServer } from './serve-site';

describe('parseHeaders', () => {
  it('reads patterns and their headers', () => {
    const [markdown, registry] = parseHeaders(
      '# Types\n/*.md\n  Content-Type: text/markdown\n/r/:name\n  X-A: 1\n',
    );
    expect(markdown?.headers).toEqual([['content-type', 'text/markdown']]);
    expect(markdown?.pattern.test('/docs/components/dialog.md')).toBe(true);
    expect(markdown?.pattern.test('/docs/components/dialog')).toBe(false);
    expect(registry?.headers).toEqual([['x-a', '1']]);
    expect(registry?.pattern.test('/r/dialog')).toBe(true);
    expect(registry?.pattern.test('/r/ui/dialog')).toBe(false);
  });
});

describe('serveSite', () => {
  let folder: string;
  let site: SiteServer;

  beforeAll(async () => {
    folder = await mkdtemp(join(tmpdir(), 'serve-site-'));
    await mkdir(join(folder, 'docs/intro'), { recursive: true });
    await writeFile(join(folder, 'index.html'), '<h1>Home</h1>');
    await writeFile(join(folder, 'docs/intro/index.html'), '<h1>Intro</h1>');
    await writeFile(join(folder, 'docs/intro.md'), '# Intro');
    await mkdir(join(folder, 'r'));
    await writeFile(join(folder, 'r/dialog.json'), '{"name":"dialog"}');
    await writeFile(join(folder, 'manifest.webmanifest'), '{"name":"Ndop UI"}');
    await writeFile(
      join(folder, '_headers'),
      '/*.md\n  Content-Type: text/markdown; charset=utf-8\n',
    );
    site = await serveSite(folder);
  });

  afterAll(async () => {
    await site.close();
    await rm(folder, { recursive: true, force: true });
  });

  it('serves routes from their index.html, without a redirect', async () => {
    const response = await fetch(`${site.url}/docs/intro`, {
      redirect: 'manual',
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('<h1>Intro</h1>');
    expect((await fetch(`${site.url}/`)).status).toBe(200);
  });

  it('applies _headers rules', async () => {
    const response = await fetch(`${site.url}/docs/intro.md`);
    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    );
  });

  it('compresses text for clients that accept it', async () => {
    const response = await fetch(`${site.url}/docs/intro`, {
      headers: { 'accept-encoding': 'br' },
    });
    expect(response.headers.get('content-encoding')).toBe('br');
    expect(await response.text()).toBe('<h1>Intro</h1>');
  });

  it('serves registry JSON as JSON', async () => {
    const response = await fetch(`${site.url}/r/dialog.json`);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({ name: 'dialog' });
  });

  it('serves the web app manifest with its own type', async () => {
    const response = await fetch(`${site.url}/manifest.webmanifest`);
    expect(response.headers.get('content-type')).toBe(
      'application/manifest+json',
    );
    expect(await response.json()).toEqual({ name: 'Ndop UI' });
  });

  it('answers theme URLs as the Pages Function does', async () => {
    const t = encodeTheme({
      theme: {},
      light: { primary: 'oklch(0.5 0.2 260)' },
      dark: {},
    });
    const good = await fetch(`${site.url}/r/themes/custom.json?t=${t}`);
    expect(good.status).toBe(200);
    expect(good.headers.get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(await good.json()).toMatchObject({
      name: 'custom',
      type: 'registry:theme',
      cssVars: { light: { primary: 'oklch(0.5 0.2 260)' } },
    });
    const bad = await fetch(`${site.url}/r/themes/custom.json?t=nope`);
    expect(bad.status).toBe(400);
    expect(bad.headers.get('content-type')).toContain('text/plain');
  });

  it('answers 404 for missing files and paths outside the folder', async () => {
    expect((await fetch(`${site.url}/nope`)).status).toBe(404);
    expect((await fetch(`${site.url}/..%2f..%2fetc%2fpasswd`)).status).toBe(
      404,
    );
  });
});
