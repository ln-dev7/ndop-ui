import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { CREATOR, OG_SIZE, ogImagePath, pageUrl, SITE } from './og-image';

export { CREATOR, OG_SIZE, ogImagePath, pageUrl, SITE } from './og-image';

/** What a page tells {@link PageMeta}. */
export interface PageInfo {
  /** The page's own title, such as "Button"; the site's name is added. */
  title: string;
  /** One or two sentences, for search results and share cards. */
  description: string;
  /** The page's path, such as `/docs/components/button`. */
  path: string;
  /**
   * The part of the site it belongs to, when the document title should
   * say so, such as "Blocks" for "Login 01 · Blocks · Ndop UI".
   */
  section?: string;
  /**
   * Schema.org structured data for search engines, written as JSON-LD,
   * such as the home page's `WebSite`. Only what the page itself shows.
   */
  structuredData?: Record<string, unknown>;
}

/** Marks the JSON-LD script {@link PageMeta} owns, to find it again. */
const STRUCTURED_DATA = 'data-page-meta';

/**
 * Sets a page's title, description and share card tags in one place, so
 * every page gets the same set: Open Graph (`og:title`, `og:description`,
 * `og:url`, `og:type`, `og:image` with its size and alt text) and
 * Twitter's large-image card, credited to {@link CREATOR}. The image is the one the build generates
 * for the page's path (see {@link ogImagePath}). It also keeps one
 * `<link rel="canonical">` in the head, at the page's {@link pageUrl}, the
 * same address as `og:url` and the sitemap's entry, and the page's
 * structured data, if any (ADR-0016, amendment 15). Works on the server,
 * so prerendered pages carry the tags; in the browser it updates the
 * prerendered elements instead of adding new ones.
 *
 * @example
 * ```ts
 * inject(PageMeta).set({ title: 'Button', description: '…', path: '/docs/components/button' });
 * ```
 */
@Injectable({ providedIn: 'root' })
export class PageMeta {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  /**
   * Applies a page's tags, replacing the previous page's.
   *
   * @param page - Its title, description and path.
   */
  set(page: PageInfo): void {
    const home = page.path === '/';
    const title = home
      ? 'Ndop UI'
      : [page.title, page.section, 'Ndop UI'].filter(Boolean).join(' · ');
    const image = SITE + ogImagePath(page.path);
    const url = pageUrl(page.path);
    this.title.setTitle(title);
    this.canonical(url);
    this.structuredData(page.structuredData);
    this.meta.updateTag({ name: 'description', content: page.description });
    for (const [property, content] of [
      ['og:site_name', 'Ndop UI'],
      ['og:type', home ? 'website' : 'article'],
      ['og:title', page.title],
      ['og:description', page.description],
      ['og:url', url],
      ['og:image', image],
      ['og:image:type', 'image/jpeg'],
      ['og:image:width', String(OG_SIZE.width)],
      ['og:image:height', String(OG_SIZE.height)],
      ['og:image:alt', title],
    ] as const) {
      this.meta.updateTag({ property, content });
    }
    for (const [name, content] of [
      ['twitter:card', 'summary_large_image'],
      ['twitter:creator', CREATOR],
      ['twitter:title', title],
      ['twitter:description', page.description],
      ['twitter:image', image],
    ] as const) {
      this.meta.updateTag({ name, content });
    }
  }

  /**
   * Describes a page search engines must not index, such as the offline
   * and not-found pages: sets its title, marks it `noindex` and drops the
   * previous page's canonical link and structured data, which would
   * otherwise claim this page is that one. Google advises against a
   * canonical link on a `noindex` page.
   *
   * @param title - The whole document title, such as "Page not found · Ndop UI".
   *
   * @example
   * ```ts
   * inject(PageMeta).exclude("You're offline · Ndop UI");
   * ```
   */
  exclude(title: string): void {
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'robots', content: 'noindex' });
    this.canonical(undefined);
    this.structuredData(undefined);
  }

  /**
   * Points the head's one canonical link at a URL, creating it if needed.
   *
   * @param href - The page's absolute URL, or `undefined` to remove it.
   */
  private canonical(href: string | undefined): void {
    const head = this.document.head;
    let link = head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (href === undefined) {
      link?.remove();
      return;
    }
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  /**
   * Writes a page's structured data into the head's JSON-LD script.
   *
   * @param data - The data, or `undefined` to remove the script.
   */
  private structuredData(data: Record<string, unknown> | undefined): void {
    const head = this.document.head;
    let script = head.querySelector<HTMLScriptElement>(
      `script[${STRUCTURED_DATA}]`,
    );
    if (!data) {
      script?.remove();
      return;
    }
    if (!script) {
      script = this.document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute(STRUCTURED_DATA, '');
      head.appendChild(script);
    }
    // `<` as an escape, so no value can close the script element early.
    script.textContent = JSON.stringify(data).replace(/</g, '\\u003c');
  }
}
