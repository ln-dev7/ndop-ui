import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { BlogShell } from '../../blog/blog-shell';
import { postEntries, readableDate } from '../../blog/posts';
import { BLOG_FEED, PageMeta } from '../../site/page-meta';

/**
 * The blog's index (`/blog`, ADR-0029): every post from `src/blog`, newest
 * first, with its date, author and description, and a link to the feed.
 */
@Component({
  selector: 'docs-blog-page',
  imports: [RouterLink, NdIcon, BlogShell],
  template: `
    <docs-blog-shell>
      <!-- Same rows as a post's header: a small link line, then the title,
           so the title doesn't move between the index and a post. -->
      <a
        [href]="feed.path"
        class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg ndIcon="rss" class="size-4"></svg>
        RSS<span class="sr-only"> feed</span>
      </a>
      <h1 class="mt-6 text-3xl font-semibold tracking-tight">Blog</h1>
      <p class="mt-2 text-muted-foreground sm:text-balance">
        {{ description }}
      </p>
      <ol class="mt-8 grid gap-10 border-t pt-8">
        @for (post of posts; track post.slug) {
          <li>
            <article [attr.aria-labelledby]="post.slug">
              <p class="text-sm text-muted-foreground">
                <time [attr.datetime]="post.attributes.date">{{
                  date(post.attributes.date)
                }}</time>
                <span aria-hidden="true"> · </span>
                <span class="sr-only">, by </span>
                {{ post.attributes.author }}
              </p>
              <h2
                [id]="post.slug"
                class="mt-2 text-xl font-semibold tracking-tight text-balance"
              >
                <a
                  [routerLink]="post.url"
                  class="underline-offset-4 hover:underline"
                  >{{ post.attributes.title }}</a
                >
              </h2>
              <p class="mt-2 text-muted-foreground">
                {{ post.attributes.description }}
              </p>
            </article>
          </li>
        }
      </ol>
    </docs-blog-shell>
  `,
})
export default class BlogPage {
  protected readonly posts = postEntries();
  protected readonly feed = BLOG_FEED;
  protected readonly date = readableDate;
  protected readonly description =
    'Write-ups on how Ndop UI works and the decisions behind it.';

  constructor() {
    inject(PageMeta).set({
      title: 'Blog',
      description: this.description,
      path: '/blog',
      feed: BLOG_FEED,
    });
  }
}
