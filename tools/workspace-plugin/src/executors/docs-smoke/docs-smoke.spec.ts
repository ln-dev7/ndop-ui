import type { ExecutorContext } from '@nx/devkit';
import {
  alwaysRevalidated,
  fetchChecks,
  maxAge,
  PAGE,
  waitForSite,
  type Fetcher,
} from './checks';
import executor from './docs-smoke';

const BASE = 'https://preview.ndop.pages.dev';

type Route = (url: URL) => Response | undefined;

/** A deployed site as Cloudflare Pages serves the docs, with overrides. */
function site(...overrides: Route[]): Fetcher {
  const html = (body: string, status = 200) =>
    new Response(body, {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
      },
    });
  const redirect = (location: string) =>
    new Response(null, { status: 308, headers: { location } });
  const pages: Route = ({ pathname, searchParams }) => {
    switch (pathname) {
      case '/':
      case PAGE:
        return html('<h1>Dialog</h1>');
      case `${PAGE}/`:
      case `${PAGE}.html`:
        return redirect(PAGE);
      case '/r/index.json':
        return Response.json(
          { name: 'ndop', items: [{ name: 'button' }] },
          {
            headers: {
              'cache-control': 'public, max-age=0, must-revalidate',
              'access-control-allow-origin': '*',
            },
          },
        );
      case '/r/themes/custom.json':
        return searchParams.get('t')
          ? Response.json({ name: 'custom', type: 'registry:theme' })
          : new Response('Add the theme as the t parameter', { status: 400 });
      case '/sw.js':
        return new Response('self.addEventListener', {
          headers: {
            'content-type': 'application/javascript',
            'cache-control': 'public, max-age=0, must-revalidate',
          },
        });
      default:
        return html('<h1>Page not found</h1>', 404);
    }
  };
  return (url) => {
    const parsed = new URL(url);
    for (const route of [...overrides, pages]) {
      const response = route(parsed);
      if (response) return Promise.resolve(response);
    }
    throw new Error('unreachable');
  };
}

/** The names of the failed checks, with their problems. */
async function failures(fetcher: Fetcher): Promise<string[]> {
  return (await fetchChecks(BASE, fetcher))
    .filter((result) => !result.ok)
    .map((result) => `${result.name}: ${result.problem}`);
}

describe('fetchChecks', () => {
  it('passes a site served as Pages serves the docs', async () => {
    expect(await failures(site())).toEqual([]);
  });

  it('asks without following redirects or using caches', async () => {
    const fetcher = vi.fn(site());
    await fetchChecks(BASE, fetcher);
    for (const [, init] of fetcher.mock.calls) {
      expect(init).toMatchObject({
        redirect: 'manual',
        headers: { 'cache-control': 'no-cache' },
      });
    }
  });

  it('fails pages prerendered as index.html, which Pages redirects', async () => {
    const problems = await failures(
      site(({ pathname }) =>
        pathname === PAGE
          ? new Response(null, {
              status: 308,
              headers: { location: `${PAGE}/` },
            })
          : pathname === `${PAGE}/`
            ? new Response('<h1>Dialog</h1>', {
                headers: { 'content-type': 'text/html' },
              })
            : undefined,
      ),
    );
    expect(problems).toEqual([
      `GET ${PAGE} is the page, without a redirect: expected 200 text/html, got 308 to ${PAGE}/`,
      `GET ${PAGE}/ redirects to ${PAGE}: expected a permanent redirect to ${PAGE}, got 200 text/html`,
    ]);
  });

  it('fails a site without a 404 page, which Pages answers with home', async () => {
    const problems = await failures(
      site(({ pathname }) =>
        pathname.startsWith('/ndop-smoke-')
          ? new Response('<h1>Home</h1>', {
              headers: { 'content-type': 'text/html' },
            })
          : undefined,
      ),
    );
    expect(problems).toEqual([
      'An unknown path answers the 404 page with a 404: expected 404 text/html, got 200 text/html',
    ]);
  });

  it('fails a 404 that is not the site’s own page', async () => {
    const problems = await failures(
      site(({ pathname }) =>
        pathname.startsWith('/ndop-smoke-')
          ? new Response('Not found', {
              status: 404,
              headers: { 'content-type': 'text/html' },
            })
          : undefined,
      ),
    );
    expect(problems).toEqual([
      "An unknown path answers the 404 page with a 404: expected the site's not-found page, got another page",
    ]);
  });

  it('fails a registry index that caches may keep', async () => {
    const problems = await failures(
      site(({ pathname }) =>
        pathname === '/r/index.json'
          ? Response.json(
              { items: [{}] },
              {
                headers: {
                  'cache-control': 'public, max-age=31536000, immutable',
                  'access-control-allow-origin': '*',
                },
              },
            )
          : undefined,
      ),
    );
    expect(problems).toEqual([
      'GET /r/index.json is the registry, always fresh: expected caches to revalidate it, got Cache-Control: public, max-age=31536000, immutable',
    ]);
  });

  it('fails when the theme URL Function is missing', async () => {
    const problems = await failures(
      site(({ pathname }) =>
        pathname === '/r/themes/custom.json'
          ? new Response('<h1>Page not found</h1>', {
              status: 404,
              headers: { 'content-type': 'text/html' },
            })
          : undefined,
      ),
    );
    expect(problems).toEqual([
      'GET /r/themes/custom.json?t=… is a theme item: expected 200 application/json, got 404 text/html',
      'GET /r/themes/custom.json without a theme is a 400: expected 400, got 404 text/html',
    ]);
  });

  it('fails a service worker served as something else', async () => {
    const problems = await failures(
      site(({ pathname }) =>
        pathname === '/sw.js'
          ? new Response('<h1>Page not found</h1>', {
              status: 404,
              headers: { 'content-type': 'text/html' },
            })
          : undefined,
      ),
    );
    expect(problems).toEqual([
      'GET /sw.js is the service worker, always fresh: expected 200 JavaScript, got 404 text/html',
    ]);
  });

  it('reports a network error as a failed check, and runs the rest', async () => {
    const problems = await failures(
      site(({ pathname }) => {
        if (pathname === '/sw.js') throw new Error('fetch failed');
        return undefined;
      }),
    );
    expect(problems).toEqual([
      'GET /sw.js is the service worker, always fresh: fetch failed',
    ]);
  });
});

describe('Cache-Control', () => {
  it('reads max-age', () => {
    expect(maxAge('public, max-age=0, must-revalidate')).toBe(0);
    expect(maxAge('s-maxage=60')).toBeUndefined();
    expect(maxAge(null)).toBeUndefined();
  });

  it('accepts only values that make caches ask again', () => {
    expect(alwaysRevalidated('public, max-age=0, must-revalidate')).toBe(true);
    expect(alwaysRevalidated('no-cache')).toBe(true);
    expect(alwaysRevalidated('max-age=600')).toBe(false);
    expect(alwaysRevalidated('max-age=0, immutable')).toBe(false);
    expect(alwaysRevalidated(null)).toBe(false);
  });
});

describe('waitForSite', () => {
  it('tries again until the home page answers', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockRejectedValueOnce(new Error('getaddrinfo ENOTFOUND'))
      .mockResolvedValueOnce(new Response(null, { status: 522 }))
      .mockResolvedValue(new Response('<h1>Home</h1>'));
    await waitForSite(BASE, 1000, fetcher, 0);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('gives up after the timeout, with the last answer', async () => {
    const fetcher = vi
      .fn<Fetcher>()
      .mockResolvedValue(new Response(null, { status: 522 }));
    await expect(waitForSite(BASE, 0, fetcher, 0)).rejects.toThrow(
      `${BASE} didn't answer its home page within 0s: 522 without a content type`,
    );
  });
});

describe('docs-smoke executor', () => {
  const context = { root: '/workspace' } as ExecutorContext;

  afterEach(() => vi.unstubAllGlobals());

  it('succeeds when every check passes', async () => {
    vi.stubGlobal('fetch', vi.fn(site()));
    expect(
      await executor({ url: `${BASE}/some/page`, browser: false }, context),
    ).toEqual({ success: true });
  });

  it('fails when a check fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        site(({ pathname }) =>
          pathname === '/sw.js'
            ? new Response(null, { status: 404 })
            : undefined,
        ),
      ),
    );
    expect(await executor({ url: BASE, browser: false }, context)).toEqual({
      success: false,
    });
  });
});
