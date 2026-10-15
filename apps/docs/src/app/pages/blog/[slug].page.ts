import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { BlogShell } from '../../blog/blog-shell';
import { AUTHORS, blogPosting, loadPost, readableDate } from '../../blog/posts';
import { CodeFrames } from '../../site/code-frames';
import {
  OnThisPage,
  pageHeadings,
  type PageHeading,
} from '../../site/on-this-page';
import { BLOG_FEED, PageMeta } from '../../site/page-meta';
import { StaticHtml } from '../../site/static-html';

/**
 * A blog post (`/blog/<slug>`) from `src/blog/<slug>.md`, rendered and
 * highlighted at build time like a guide, with a byline (author and
 * date) and an "On this page" rail.
 */
@Component({
  selector: 'docs-blog-post-page',
  imports: [RouterLink, NdIcon, BlogShell, CodeFrames, OnThisPage, StaticHtml],
  template: `
    <docs-blog-shell>
      @if (post.value(); as value) {
        <article docsCodeFrames #frames="docsCodeFrames">
          <a
            routerLink="/blog"
            class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <svg ndIcon="arrow-left" class="size-4 rtl:rotate-180"></svg>
            Blog
          </a>
          <h1 class="mt-6 text-3xl font-semibold tracking-tight text-balance">
            {{ value.attributes.title }}
          </h1>
          <p
            class="mt-2 text-[1.05rem] text-muted-foreground sm:text-base sm:text-balance"
          >
            {{ value.attributes.description }}
          </p>
          <p class="mt-4 text-sm text-muted-foreground">
            @if (authorUrl(); as url) {
              <a
                [href]="url"
                rel="author"
                class="font-medium text-foreground underline-offset-4 hover:underline"
                >{{ value.attributes.author }}</a
              >
            } @else {
              <span class="font-medium text-foreground">{{
                value.attributes.author
              }}</span>
            }
            <span aria-hidden="true"> · </span>
            <span class="sr-only">, </span>
            <time [attr.datetime]="value.attributes.date">{{
              date(value.attributes.date)
            }}</time>
          </p>
          <div class="prose mt-8 border-t pt-8" [docsHtml]="value.html"></div>
          <p aria-live="polite" class="sr-only">
            {{ frames.announcement() }}
          </p>
        </article>
        <nav aria-label="Blog" class="mt-16 border-t pt-6 text-sm">
          <a routerLink="/blog" class="flex items-center gap-2 hover:underline">
            <svg ndIcon="arrow-left" class="size-4 rtl:rotate-180"></svg>
            All posts
          </a>
        </nav>
      } @else if (post.status() === 'resolved') {
        <h1 class="text-3xl font-semibold">Post not found</h1>
      }
      <div rail>
        <!-- Soon after load: its scroll-spy follows the reader. -->
        @defer (on immediate; hydrate on idle) {
          <docs-on-this-page [headings]="headings()" />
        }
      </div>
    </docs-blog-shell>
  `,
})
export default class BlogPostPage {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, {
    requireSync: true,
  });
  private readonly meta = inject(PageMeta);
  protected readonly date = readableDate;

  /** The post, its Markdown already rendered to HTML at build time. */
  protected readonly post = resource({
    params: () => ({ slug: this.params().get('slug') ?? '' }),
    loader: async ({ params }) => {
      const post = await loadPost(params.slug);
      if (post) {
        this.meta.set({
          title: post.attributes.title,
          description: post.attributes.description,
          path: post.url,
          structuredData: blogPosting(post),
          feed: BLOG_FEED,
        });
      }
      return post;
    },
  });

  protected readonly authorUrl = computed(
    () => AUTHORS[this.post.value()?.attributes.author ?? ''],
  );

  protected readonly headings = computed<PageHeading[]>(() =>
    pageHeadings(this.post.value()?.html ?? ''),
  );
}
