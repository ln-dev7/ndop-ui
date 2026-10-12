import { themeItem } from './export';
import { decodeTheme } from './theme-url';

/** An HTTP response, as plain data, so any server can send it. */
export interface ThemeUrlResponse {
  /** Status code: 200, or 400 for a missing or unreadable theme. */
  status: number;
  /** Response headers, by name. */
  headers: Record<string, string>;
  /** Response body. */
  body: string;
}

/** The path the theme studio's theme URLs are served at (ADR-0023). */
export const CUSTOM_THEME_PATH = '/r/themes/custom.json';

/**
 * Answers a request for a theme URL, `/r/themes/custom.json?t=…`
 * (ADR-0023): the theme in `t` as a `registry:theme` item named `custom`,
 * so `ndop add`, `ndop init --theme` and the shadcn CLI install it. The
 * same URL always answers the same item, so a success is cached for a
 * year. Cloudflare Pages doesn't apply `_headers` to a Function's
 * responses, so the CORS header that `/r/*` has is set here too.
 *
 * @param t - The `t` parameter, or `null` when the request has none.
 * @returns The response to send.
 *
 * @example
 * ```ts
 * const url = new URL(request.url);
 * const { status, headers, body } = customThemeResponse(
 *   url.searchParams.get('t'),
 * );
 * ```
 */
export function customThemeResponse(t: string | null): ThemeUrlResponse {
  const problem = (message: string): ThemeUrlResponse => ({
    status: 400,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
    },
    body: `${message}\n`,
  });
  if (!t) {
    return problem(
      'Add the theme as the t parameter; the theme studio at https://ndop.dev/themes/studio makes theme URLs.',
    );
  }
  const decoded = decodeTheme(t);
  if ('problem' in decoded) return problem(decoded.problem);
  const item = themeItem(decoded.vars, {
    name: 'custom',
    title: 'Custom theme',
    description: 'A theme made in the Ndop theme studio.',
    version: '1.0.0',
  });
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Access-Control-Allow-Origin': '*',
    },
    body: `${JSON.stringify(item, null, 2)}\n`,
  };
}
