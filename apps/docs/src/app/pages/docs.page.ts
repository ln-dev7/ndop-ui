import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SiteNav } from '../site/site-nav';

/**
 * Layout of every `/docs` page: the navigation in a 260px column on large
 * screens, with a fading edge line, and the page beside it.
 */
@Component({
  selector: 'docs-layout',
  imports: [RouterOutlet, SiteNav],
  template: `
    <div class="mx-auto flex max-w-[1440px] gap-10 px-4 lg:px-6">
      <!-- The edge line fades out toward both ends, and the list fades
           where it scrolls in and out of view. -->
      <aside
        class="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-[260px] shrink-0 after:absolute after:inset-y-6 after:end-0 after:w-px after:bg-linear-to-b after:from-transparent after:via-border after:to-transparent lg:block"
      >
        <div class="fade-y h-full overflow-y-auto pe-4">
          <docs-site-nav />
        </div>
      </aside>
      <div class="min-w-0 flex-1">
        <router-outlet />
      </div>
    </div>
  `,
})
export default class DocsLayout {}
