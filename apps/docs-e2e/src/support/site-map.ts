/**
 * What a crawl has found: routes still to visit, and the files and
 * `#fragments` that links point to, to check once the crawl is done.
 */
export class SiteMap {
  private readonly queue: string[];
  private readonly seen: Set<string>;

  /** Linked files, such as `/docs/components/dialog.md`. */
  readonly files = new Set<string>();
  /** Linked fragments, such as `/docs/getting-started/theming#tokens`. */
  readonly fragments = new Set<string>();

  /**
   * Starts a crawl.
   *
   * @param start - The first route to visit.
   */
  constructor(start: string) {
    this.queue = [start];
    this.seen = new Set([start]);
  }

  /**
   * How many routes were found.
   *
   * @returns The count, visited or not.
   */
  get size(): number {
    return this.seen.size;
  }

  /**
   * The next route to visit.
   *
   * @returns It, or `undefined` once every route was visited.
   */
  next(): string | undefined {
    return this.queue.shift();
  }

  /**
   * Records the internal links of a page: routes join the queue once,
   * files and fragments are kept for checking.
   *
   * @param links - `href`s starting with `/`.
   */
  add(links: readonly string[]): void {
    for (const link of links) {
      const url = new URL(link, 'http://localhost');
      if (url.hash) this.fragments.add(`${url.pathname}${url.hash}`);
      if (/\.\w+$/.test(url.pathname)) {
        this.files.add(url.pathname);
      } else if (!this.seen.has(url.pathname)) {
        this.seen.add(url.pathname);
        this.queue.push(url.pathname);
      }
    }
  }
}
