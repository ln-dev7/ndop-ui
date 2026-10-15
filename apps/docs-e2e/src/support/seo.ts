import type { APIRequestContext } from '@playwright/test';

/** The production origin every canonical link and sitemap entry uses. */
export const SITE = 'https://ndop.dev';

/**
 * Lists the sitemap's pages by path, read from the served `/sitemap.xml`.
 *
 * @param request - Playwright's request context, on the served site.
 * @returns Each `<loc>`'s path, such as `/` or `/docs/components/button`,
 *   in the sitemap's order.
 * @throws When a `<loc>` is not on {@link SITE}.
 */
export async function sitemapPaths(
  request: APIRequestContext,
): Promise<string[]> {
  const xml = await (await request.get('/sitemap.xml')).text();
  return [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map(([, loc = '']) => {
    if (!loc.startsWith(`${SITE}/`)) {
      throw new Error(`The sitemap lists ${loc}, outside ${SITE}`);
    }
    return loc.slice(SITE.length);
  });
}

/** What search engines read in a page's server-rendered HTML. */
export interface PageSeo {
  /** The `<html>` element's `lang`. */
  lang: string | undefined;
  /** The document title, decoded. */
  title: string;
  /** The meta description, decoded. */
  description: string | undefined;
  /** Every `<link rel="canonical">`'s `href`. */
  canonicals: string[];
  /** The `og:url`. */
  ogUrl: string | undefined;
  /** Whether a robots meta tag says `noindex`. */
  noindex: boolean;
  /** How many `<h1>` elements the page has. */
  h1s: number;
  /** Every JSON-LD script's content, parsed. */
  structuredData: unknown[];
}

/**
 * Decodes the entities Angular's server renderer writes.
 *
 * @param text - Text or an attribute's value.
 * @returns Its text.
 */
const decode = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(+code))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * An attribute of the first tag matching a pattern.
 *
 * @param html - The page.
 * @param tag - Matches the whole tag, such as `<meta name="description" …>`.
 * @param name - The attribute.
 * @returns Its decoded value, or `undefined`.
 */
const attribute = (html: string, tag: RegExp, name: string) => {
  const element = html.match(tag)?.[0];
  const value = element?.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  return value === undefined ? undefined : decode(value);
};

/**
 * Reads the parts of a server-rendered page that search engines index
 * by, without a browser, so it sees the HTML as a crawler first does.
 *
 * @param html - The page as the server sends it.
 * @returns Its title, description, canonical links and the rest.
 */
export function readSeo(html: string): PageSeo {
  const head = html.slice(0, html.indexOf('</head>'));
  return {
    lang: attribute(html, /<html\b[^>]*>/, 'lang'),
    title: decode(head.match(/<title>([^<]*)<\/title>/)?.[1] ?? '').trim(),
    description: attribute(
      head,
      /<meta\b[^>]*\bname="description"[^>]*>/,
      'content',
    ),
    canonicals: [...html.matchAll(/<link\b[^>]*\brel="canonical"[^>]*>/g)].map(
      ([tag]) => decode(tag.match(/\bhref="([^"]*)"/)?.[1] ?? ''),
    ),
    ogUrl: attribute(head, /<meta\b[^>]*\bproperty="og:url"[^>]*>/, 'content'),
    noindex: /noindex/.test(
      attribute(head, /<meta\b[^>]*\bname="robots"[^>]*>/, 'content') ?? '',
    ),
    h1s: html.match(/<h1[\s>]/g)?.length ?? 0,
    structuredData: [
      ...head.matchAll(
        /<script\b[^>]*type="application\/ld\+json"[^>]*>([^<]*)<\/script>/g,
      ),
    ].map(([, json = '']) => JSON.parse(json) as unknown),
  };
}
