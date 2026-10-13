import { Component, computed, effect, inject, input } from '@angular/core';
import { PageMeta } from '../site/page-meta';
import { RouterLink } from '@angular/router';
import { BLOCK_CATEGORIES } from '@/categories';
import { blocks } from 'virtual:ndop/blocks';
import { BlockCard } from './block-card';

/**
 * The blocks gallery (ADR-0022): every block at `/blocks`, one category's
 * at `/blocks/<category>`, or one block at `/blocks/<name>`, with the
 * categories as links so prerendering finds every page.
 */
@Component({
  selector: 'docs-blocks-gallery',
  imports: [RouterLink, BlockCard],
  host: { class: 'block' },
  template: `
    <!-- Named, since each preview frame holds its block's own main. -->
    <main
      id="main"
      aria-labelledby="blocks-title"
      class="mx-auto max-w-[1440px] px-4 py-10 lg:px-6"
    >
      @if (block(); as only) {
        <p class="text-sm">
          <a
            [routerLink]="'/blocks/' + only.category"
            class="text-muted-foreground hover:text-foreground"
            >{{ categoryTitle(only.category) }}</a
          >
        </p>
        <h1
          id="blocks-title"
          class="mt-2 text-3xl font-semibold tracking-tight"
        >
          {{ only.title }}
        </h1>
        <p class="mt-2 max-w-2xl text-muted-foreground">
          {{ only.description }}
        </p>
        @if (only.route; as route) {
          <p class="mt-2 max-w-3xl text-sm text-muted-foreground">
            {{ route }}
          </p>
        }
        <docs-block-card class="mt-6" [block]="only" [heading]="false" />
      } @else if (shown(); as list) {
        <h1 id="blocks-title" class="text-3xl font-semibold tracking-tight">
          {{ category()?.title ?? 'Blocks' }}
        </h1>
        <p class="mt-2 max-w-2xl text-muted-foreground">
          Whole pages and sections built from the components: copy one into your
          app with the CLI, route to it, and make it yours. Each one compiles
          with mock data, so you swap in your own when you're ready.
        </p>
        <nav aria-label="Block categories" class="mt-6">
          <ul class="flex flex-wrap gap-2">
            @for (link of links; track link.url) {
              <li>
                <a
                  [routerLink]="link.url"
                  class="inline-flex h-8 items-center rounded-full border px-3 text-sm hover:bg-muted aria-[current=page]:border-primary aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
                  [attr.aria-current]="link.slug === slug() ? 'page' : null"
                  >{{ link.title }}</a
                >
              </li>
            }
          </ul>
        </nav>
        <div class="mt-10 grid gap-16">
          @for (item of list; track item.name) {
            <docs-block-card [id]="item.name" [block]="item" />
          }
        </div>
      } @else {
        <h1 id="blocks-title" class="text-3xl font-semibold tracking-tight">
          No blocks named {{ slug() }}
        </h1>
        <p class="mt-2">
          <a routerLink="/blocks" class="underline underline-offset-4"
            >See every block</a
          >
        </p>
      }
    </main>
  `,
})
export class BlocksGallery {
  /** A category slug or a block name; empty for every block. */
  readonly slug = input('');

  protected readonly links = [
    { slug: '', title: 'All', url: '/blocks' },
    ...BLOCK_CATEGORIES.filter((category) =>
      blocks.some((block) => block.category === category.slug),
    ).map((category) => ({
      slug: category.slug as string,
      title: category.title as string,
      url: `/blocks/${category.slug}`,
    })),
  ];

  protected readonly category = computed(() =>
    BLOCK_CATEGORIES.find((category) => category.slug === this.slug()),
  );

  protected readonly block = computed(() =>
    blocks.find((block) => block.name === this.slug()),
  );

  protected readonly shown = computed(() => {
    const slug = this.slug();
    if (slug === '') return blocks;
    return this.category()
      ? blocks.filter((block) => block.category === slug)
      : undefined;
  });

  constructor() {
    const meta = inject(PageMeta);
    effect(() => {
      const block = this.block();
      const name = block?.title ?? this.category()?.title;
      meta.set({
        title: name ?? 'Blocks',
        ...(name ? { section: 'Blocks' } : {}),
        description:
          block?.description ??
          'Pages and sections built from Ndop UI components, to copy into your Angular app.',
        path: this.slug() ? `/blocks/${this.slug()}` : '/blocks',
      });
    });
  }

  /**
   * A category's title.
   *
   * @param slug - Its slug.
   * @returns The title.
   */
  protected categoryTitle(slug: string): string {
    return (
      BLOCK_CATEGORIES.find((category) => category.slug === slug)?.title ?? slug
    );
  }
}
