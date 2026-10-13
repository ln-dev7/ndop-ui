import { Component, DestroyRef, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';

/**
 * What the service worker answers with for a page that wasn't saved, when
 * the reader is offline (`/offline`, ADR-0027). It is prerendered with the
 * site but linked from nowhere, and search engines skip it. Served in
 * place of another page, it runs no scripts, so its one link is a plain
 * link to the home page, which is always saved.
 */
@Component({
  selector: 'docs-offline-page',
  imports: [RouterLink, NdIcon, Button],
  template: `
    <main
      id="main"
      class="mx-auto flex min-h-[calc(100svh-12rem)] max-w-md flex-col items-center justify-center px-4 py-24 text-center"
    >
      <div
        class="flex size-12 items-center justify-center rounded-xl border bg-muted/60 text-muted-foreground"
      >
        <svg ndIcon="wifi-off" class="size-5"></svg>
      </div>
      <h1 class="mt-6 text-3xl font-semibold tracking-tight">You're offline</h1>
      <p class="mt-3 text-balance text-muted-foreground">
        This page hasn't been saved for reading offline. Pages you've already
        opened are still here, and the rest load once you're back online.
      </p>
      <a ndButton class="mt-8" routerLink="/"> Go to the home page </a>
    </main>
  `,
})
export default class OfflinePage {
  constructor() {
    const meta = inject(Meta);
    const title = inject(Title);
    title.setTitle("You're offline · Ndop UI");
    meta.updateTag({ name: 'robots', content: 'noindex' });
    // The home page, the one page linked from here, sets neither.
    inject(DestroyRef).onDestroy(() => {
      meta.removeTag('name="robots"');
      title.setTitle('Ndop UI');
    });
  }
}
