import { readFile, stat } from 'node:fs/promises';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, normalize, sep } from 'node:path';
import { promisify } from 'node:util';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { CUSTOM_THEME_PATH, customThemeResponse } from '@ndop/schema/theme';

const brotli = promisify(brotliCompress);
const gzipped = promisify(gzip);

/**
 * A running static site.
 */
export interface SiteServer {
  /** Base URL, such as `http://localhost:4400`. */
  url: string;
  /** Stops the server. */
  close(): Promise<void>;
}

/** Content types by file extension; anything else is binary. */
const TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

/** A `_headers` rule: the paths it matches and the headers it sets. */
interface HeaderRule {
  pattern: RegExp;
  headers: [name: string, value: string][];
}

/**
 * Parses a Cloudflare Pages `_headers` file: a path pattern on its own
 * line, with one splat (`*`) or `:placeholder`s, then its headers indented
 * below it.
 *
 * @param text - The file.
 * @returns Its rules, in order.
 */
export function parseHeaders(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      const source = line
        .trim()
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/:\w+/g, '[^/]+');
      rules.push({ pattern: new RegExp(`^${source}$`), headers: [] });
      continue;
    }
    const separator = line.indexOf(':');
    rules
      .at(-1)
      ?.headers.push([
        line.slice(0, separator).trim().toLowerCase(),
        line.slice(separator + 1).trim(),
      ]);
  }
  return rules;
}

/**
 * The file a request path names, the way Cloudflare Pages resolves it:
 * the file itself, then `<path>.html`, then `<path>/index.html`.
 *
 * @param root - The site's folder.
 * @param path - The request path, decoded.
 * @returns The file's absolute path, or `undefined`.
 */
async function resolveFile(
  root: string,
  path: string,
): Promise<string | undefined> {
  const base = normalize(join(root, path));
  if (base !== root && !base.startsWith(root + sep)) return undefined;
  const candidates = path.endsWith('/')
    ? [join(base, 'index.html')]
    : [base, `${base}.html`, join(base, 'index.html')];
  for (const candidate of candidates) {
    const stats = await stat(candidate).catch(() => undefined);
    if (stats?.isFile()) return candidate;
  }
  return undefined;
}

/**
 * Serves a built static site locally the way Cloudflare Pages, which hosts
 * the docs (ADR-0016), serves it: routes resolve to their prerendered
 * `index.html`, content types follow the file extension, text is
 * compressed with Brotli or gzip, the site's `_headers` rules apply, and
 * anything else is a 404. Theme URLs (`/r/themes/custom.json?t=…`) are
 * answered by the same code as the site's Pages Function (ADR-0023). The registry install test, the docs' end-to-end
 * tests and Lighthouse use it.
 *
 * @param folder - Absolute folder to serve.
 * @param port - Port to listen on; a free one by default.
 * @returns The running server.
 */
export async function serveSite(folder: string, port = 0): Promise<SiteServer> {
  const root = normalize(folder);
  const rules = parseHeaders(
    await readFile(join(root, '_headers'), 'utf-8').catch(() => ''),
  );
  // The site doesn't change while it's served, so each file is compressed
  // once, off the event loop, at a level close to Cloudflare's on-the-fly
  // compression; under parallel tests, synchronous maximum-level Brotli
  // stalled the server until connections reset.
  const cache = new Map<string, Promise<Buffer>>();
  const compressed = (
    file: string,
    encoding: 'br' | 'gzip',
    body: Buffer,
  ): Promise<Buffer> => {
    const key = `${encoding}:${file}`;
    let result = cache.get(key);
    if (!result) {
      result =
        encoding === 'br'
          ? brotli(body, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } })
          : gzipped(body);
      cache.set(key, result);
    }
    return result;
  };
  const server: Server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    const path = decodeURIComponent(url.pathname);
    // Pages doesn't apply `_headers` to a Function's responses, so neither
    // does this.
    if (path === CUSTOM_THEME_PATH) {
      const theme = customThemeResponse(url.searchParams.get('t'));
      response.writeHead(theme.status, theme.headers).end(theme.body);
      return;
    }
    const file = await resolveFile(root, path);
    if (!file) {
      response
        .writeHead(404, { 'content-type': 'text/plain' })
        .end('Not found');
      return;
    }
    const headers: Record<string, string> = {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    };
    for (const rule of rules) {
      if (!rule.pattern.test(path)) continue;
      for (const [name, value] of rule.headers) headers[name] = value;
    }
    let body: Buffer = await readFile(file);
    // Text is compressed, as Cloudflare does, so Lighthouse measures the
    // bytes readers actually download.
    const accepted = String(request.headers['accept-encoding'] ?? '');
    if (
      /^(text\/|application\/(json|xml|manifest\+json)|image\/svg)/.test(
        headers['content-type'] ?? '',
      )
    ) {
      headers['vary'] = 'accept-encoding';
      const encoding = /\bbr\b/.test(accepted)
        ? 'br'
        : /\bgzip\b/.test(accepted)
          ? 'gzip'
          : undefined;
      if (encoding) {
        body = await compressed(file, encoding, body);
        headers['content-encoding'] = encoding;
      }
    }
    response.writeHead(200, headers).end(body);
  });
  await new Promise<void>((resolve) =>
    server.listen(port, 'localhost', resolve),
  );
  const { port: listening } = server.address() as AddressInfo;
  return {
    url: `http://localhost:${listening}`,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  };
}
