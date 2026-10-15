import { NgComponentOutlet } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { blockComponents, blocks } from 'virtual:ndop/blocks';
import { PageMeta } from '../../../site/page-meta';
import { Preferences } from '../../../site/preferences';

/**
 * A block alone (`/blocks/<name>/preview`), as the whole page, for the
 * gallery's iframes (ADR-0022). The site's header and footer stay off it,
 * search engines skip it, and it follows the theme and direction the
 * gallery around it switches to. Its links are placeholders, so following
 * one does nothing: `#account` resolves against `<base href="/">` and
 * would load the site's home page into the frame.
 */
@Component({
  selector: 'docs-block-preview-page',
  imports: [NgComponentOutlet],
  host: { '(click)': 'stayOnPage($event)' },
  template: `
    @if (block.value(); as component) {
      <ng-container *ngComponentOutlet="component" />
    } @else if (!block.isLoading()) {
      <main id="main" class="mx-auto max-w-3xl p-8">
        <h1 class="text-2xl font-semibold">No block named {{ name() }}</h1>
      </main>
    }
  `,
})
export default class BlockPreviewPage {
  protected readonly name = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => params.get('name') ?? ''),
    ),
    { requireSync: true },
  );
  private readonly meta = inject(PageMeta);

  protected readonly block = resource({
    params: () => this.name(),
    loader: async ({ params }) => {
      const summary = blocks.find((block) => block.name === params);
      this.meta.exclude(`${summary?.title ?? params} preview · Ndop UI`);
      return blockComponents[params]?.();
    },
  });

  constructor() {
    inject(Preferences).follow();
  }

  /**
   * Keeps a click on one of the block's links from navigating the frame.
   *
   * @param event - A click inside the block.
   */
  protected stayOnPage(event: MouseEvent): void {
    if ((event.target as Element).closest('a[href]')) {
      event.preventDefault();
    }
  }
}
