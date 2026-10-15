import { Component } from '@angular/core';

/**
 * The frame every blog page shares: a 640px reading column, centred, and
 * from `xl` a 220px rail beside it. The rail sits outside the layout, so
 * the column is centred whether a page fills the rail or not, and moving
 * between the index and a post doesn't shift it. Content goes in the
 * column; an element with the `rail` attribute goes in the rail.
 */
@Component({
  selector: 'docs-blog-shell',
  template: `
    <div class="px-4 py-8 lg:px-6">
      <main id="main" class="relative mx-auto w-full max-w-[640px] min-w-0">
        <ng-content />
        <!-- As tall as the column, so the sticky rail follows the reader
             down the whole post. -->
        <div
          class="absolute inset-y-0 start-[calc(100%+2.5rem)] hidden w-[220px] xl:block"
        >
          <div
            class="sticky top-22 max-h-[calc(100dvh-5.5rem)] overflow-y-auto"
          >
            <ng-content select="[rail]" />
          </div>
        </div>
      </main>
    </div>
  `,
})
export class BlogShell {}
