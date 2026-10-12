// @vitest-environment node
import { encodeTheme } from '@ndop/schema/theme';
import { onRequestGet, type ThemeRouteContext } from './[name]';

/**
 * A Pages Function context for a request.
 *
 * @param url - The request URL.
 * @param name - The `[name]` segment.
 * @returns The context, and the asset server's stand-in.
 */
function context(url: string, name: string) {
  const next = vi.fn(() => Promise.resolve(new Response('static')));
  const value: ThemeRouteContext = {
    request: new Request(url),
    params: { name },
    next,
  };
  return { value, next };
}

describe('the theme URL function', () => {
  it('answers custom.json with the theme item', async () => {
    const t = encodeTheme({
      theme: {},
      light: { primary: 'oklch(0.5 0.2 260)' },
      dark: {},
    });
    const { value } = context(
      `https://ndop.dev/r/themes/custom.json?t=${t}`,
      'custom.json',
    );
    const response = await onRequestGet(value);
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(await response.json()).toMatchObject({
      name: 'custom',
      cssVars: { light: { primary: 'oklch(0.5 0.2 260)' } },
    });
  });

  it('refuses a bad theme with a 400', async () => {
    const { value } = context(
      'https://ndop.dev/r/themes/custom.json?t=nope',
      'custom.json',
    );
    const response = await onRequestGet(value);
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toContain('text/plain');
  });

  it('leaves other files to the static site', async () => {
    const { value, next } = context(
      'https://ndop.dev/r/themes/other.json',
      'other.json',
    );
    expect(await (await onRequestGet(value)).text()).toBe('static');
    expect(next).toHaveBeenCalled();
  });
});
