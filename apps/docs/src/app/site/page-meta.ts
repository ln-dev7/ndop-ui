import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { CREATOR, OG_SIZE, ogImagePath, SITE } from './og-image';

export { CREATOR, OG_SIZE, ogImagePath, SITE } from './og-image';

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
}

/**
 * Sets a page's title, description and share card tags in one place, so
 * every page gets the same set: Open Graph (`og:title`, `og:description`,
 * `og:url`, `og:type`, `og:image` with its size and alt text) and
 * Twitter's large-image card, credited to {@link CREATOR}. The image is the one the build generates
 * for the page's path (see {@link ogImagePath}). Works on the server, so
 * prerendered pages carry the tags.
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
    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: page.description });
    for (const [property, content] of [
      ['og:site_name', 'Ndop UI'],
      ['og:type', home ? 'website' : 'article'],
      ['og:title', page.title],
      ['og:description', page.description],
      ['og:url', SITE + (home ? '/' : page.path)],
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
}
