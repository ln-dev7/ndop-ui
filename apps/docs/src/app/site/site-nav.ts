import { Component, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { cn } from '@ndop/core';
import { Navigation } from './navigation';

/**
 * The docs navigation: one list per section, with the current page marked
 * by `aria-current="page"`.
 */
@Component({
  selector: 'docs-site-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav aria-label="Docs" [class]="classes()">
      @for (section of navigation.sections(); track section.title) {
        <div class="mb-6">
          <h2
            class="flex h-8 items-center px-2 text-xs font-medium text-muted-foreground"
          >
            {{ section.title }}
          </h2>
          <ul class="space-y-1">
            @for (link of section.links; track link.url) {
              <li>
                <!-- The whole row is clickable; the hover and active
                     backgrounds, and the focus ring, hug the label. -->
                <a
                  class="group block text-[0.8rem] leading-none font-medium focus-visible:outline-none"
                  [routerLink]="link.url"
                  routerLinkActive
                  ariaCurrentWhenActive="page"
                  ><span
                    class="inline-block rounded-md p-2 group-hover:bg-accent group-hover:text-accent-foreground group-focus-visible:ring-[3px] group-focus-visible:ring-ring/50 group-aria-[current=page]:bg-accent"
                    >{{ link.title }}</span
                  ></a
                >
              </li>
            }
          </ul>
        </div>
      }
    </nav>
  `,
})
export class SiteNav {
  /** Extra classes for the `nav` element. */
  readonly class = input('');

  protected readonly navigation = inject(Navigation);

  protected classes(): string {
    return cn('text-sm', this.class());
  }
}
