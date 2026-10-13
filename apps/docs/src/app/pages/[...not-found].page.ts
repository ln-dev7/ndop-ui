import { Component, DestroyRef, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';

/**
 * The page for any path the site doesn't have. It is prerendered as the
 * top-level `/404.html`, which Cloudflare Pages serves with a 404 status
 * for unknown paths; without it, Pages would answer them with the home
 * page (ADR-0016, "Hosting"). In the app, the router shows it for any
 * route that matches no page. Search engines skip it.
 */
@Component({
  selector: 'docs-not-found-page',
  imports: [RouterLink, NdIcon, Button],
  template: `
    <main
      id="main"
      class="mx-auto flex min-h-[calc(100svh-12rem)] max-w-md flex-col items-center justify-center px-4 py-24 text-center"
    >
      <div
        class="flex size-12 items-center justify-center rounded-xl border bg-muted/60 text-muted-foreground"
      >
        <svg ndIcon="file-question-mark" class="size-5"></svg>
      </div>
      <h1 class="mt-6 text-3xl font-semibold tracking-tight">Page not found</h1>
      <p class="mt-3 text-balance text-muted-foreground">
        There's no page at this address. It may have moved, or the link may have
        a typo.
      </p>
      <div class="mt-8 flex flex-wrap justify-center gap-3">
        <a ndButton routerLink="/">Go to the home page</a>
        <a ndButton variant="outline" routerLink="/docs">Read the docs</a>
      </div>
    </main>
  `,
})
export default class NotFoundPage {
  constructor() {
    const meta = inject(Meta);
    const title = inject(Title);
    title.setTitle('Page not found · Ndop UI');
    meta.updateTag({ name: 'robots', content: 'noindex' });
    // The pages linked from here set their own title, but not robots.
    inject(DestroyRef).onDestroy(() => {
      meta.removeTag('name="robots"');
      title.setTitle('Ndop UI');
    });
  }
}
