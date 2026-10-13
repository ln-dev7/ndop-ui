import { isCacheable, strategyFor, withoutScripts } from './routes';

const origin = 'https://ndop.dev';

/**
 * A request's strategy.
 *
 * @param path - Path or URL.
 * @param mode - Request mode.
 * @param method - HTTP method.
 * @returns The strategy.
 */
function strategy(path: string, mode = 'cors', method = 'GET') {
  return strategyFor({ url: new URL(path, origin).href, method, mode }, origin);
}

describe('strategyFor', () => {
  it('serves built files from the cache first', () => {
    expect(strategy('/assets/main-abc.js', 'cors')).toBe('asset');
    expect(strategy('/assets/geist-latin.woff2', 'cors')).toBe('asset');
  });

  it('loads pages from the network first', () => {
    expect(strategy('/', 'navigate')).toBe('page');
    expect(strategy('/docs/components/dialog', 'navigate')).toBe('page');
  });

  it('never caches the registry, the theme URL, the worker or other origins', () => {
    expect(strategy('/r/index.json')).toBe('network');
    expect(strategy('/r/themes/custom.json?t=abc')).toBe('network');
    expect(strategy('/r/index.json', 'navigate')).toBe('network');
    expect(strategy('/sw.js')).toBe('network');
    expect(strategy('https://github.com/ndop-ui/ui', 'navigate')).toBe(
      'network',
    );
    expect(strategy('https://cdn.example/assets/a.js')).toBe('network');
  });

  it('leaves other requests to the browser', () => {
    expect(strategy('/docs/components/dialog.md')).toBe('network');
    expect(strategy('/llms.txt')).toBe('network');
    expect(strategy('/assets/main-abc.js', 'cors', 'POST')).toBe('network');
  });
});

describe('isCacheable', () => {
  it('accepts pages and built files of the site only', () => {
    expect(isCacheable('/docs/components/dialog', origin)).toBe(true);
    expect(isCacheable(`${origin}/assets/a-1.js`, origin)).toBe(true);
    expect(isCacheable('/r/index.json', origin)).toBe(false);
    expect(isCacheable('/llms.txt', origin)).toBe(false);
    expect(isCacheable('https://example.com/', origin)).toBe(false);
  });
});

describe('withoutScripts', () => {
  it('drops module scripts and preloads, and keeps inline classic scripts and styles', () => {
    const html =
      '<head><style>a{}</style><script>try{}catch(e){}</script>' +
      '<link rel="modulepreload" href="/assets/a.js">' +
      '<script type="module">import("/assets/main.js")</script></head>';
    expect(withoutScripts(html)).toBe(
      '<head><style>a{}</style><script>try{}catch(e){}</script></head>',
    );
  });
});
