import { Location, ViewportScroller } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { injectCurrentPath } from './current-path';

/**
 * A heading listed in the "On this page" rail.
 */
export interface PageHeading {
  /** The heading's `id`. */
  id: string;
  /** Its text. */
  text: string;
  /** 2 or 3. */
  level: number;
}

/**
 * The right-hand "On this page" rail, sticky beside the page, with
 * scroll-spy: the section being read is marked with
 * `aria-current="location"` as the page scrolls. Links scroll smoothly
 * (instantly with `prefers-reduced-motion`) to just below the header.
 */
@Component({
  selector: 'docs-on-this-page',
  template: `
    @if (headings().length > 0) {
      <nav aria-labelledby="on-this-page" class="text-[0.8rem]">
        <h2
          id="on-this-page"
          class="mb-2 text-xs font-medium text-muted-foreground"
        >
          On this page
        </h2>
        <ul class="space-y-2">
          @for (heading of headings(); track heading.id) {
            <li [class.ps-3]="heading.level === 3">
              <a
                [href]="path() + '#' + heading.id"
                class="text-muted-foreground hover:text-foreground aria-[current=location]:font-medium aria-[current=location]:text-foreground"
                [attr.aria-current]="
                  active() === heading.id ? 'location' : null
                "
                (click)="go($event, heading.id)"
                >{{ heading.text }}</a
              >
            </li>
          }
        </ul>
      </nav>
    }
  `,
})
export class OnThisPage {
  /** Headings of the page, in order. */
  readonly headings = input.required<PageHeading[]>();

  protected readonly active = signal<string | null>(null);
  protected readonly path = injectCurrentPath();
  private readonly scroller = inject(ViewportScroller);
  private readonly location = inject(Location);

  constructor() {
    const destroyRef = inject(DestroyRef);
    // Browser only: there is no scrolling during SSR.
    afterNextRender(() => {
      let frame = 0;
      const update = () => {
        frame = 0;
        this.active.set(this.currentHeading());
      };
      const onScroll = () => {
        if (!frame) frame = requestAnimationFrame(update);
      };
      addEventListener('scroll', onScroll, { passive: true });
      update();
      destroyRef.onDestroy(() => {
        removeEventListener('scroll', onScroll);
        cancelAnimationFrame(frame);
      });
    });
  }

  /**
   * Scrolls to a heading and records it in the URL and history, without a
   * router navigation, whose own anchor scroll would jump instead.
   *
   * @param event - The link's click.
   * @param id - The heading's id.
   */
  protected go(event: MouseEvent, id: string): void {
    // Let modified clicks open the link in a new tab or window as usual.
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scroller.scrollToAnchor(id, { behavior: reduce ? 'auto' : 'smooth' });
    this.location.go(`${this.path()}#${id}`);
  }

  /**
   * The heading the reader is in: the last one that has scrolled up past
   * the line just below the sticky header, or the last heading once the
   * page can't scroll further.
   *
   * @returns Its id, or `null` above the first heading.
   */
  private currentHeading(): string | null {
    const ids = this.headings().map((heading) => heading.id);
    const atBottom =
      innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom && ids.length > 0) return ids[ids.length - 1] ?? null;
    let current: string | null = null;
    for (const id of ids) {
      const top = document.getElementById(id)?.getBoundingClientRect().top;
      // The anchor offset (80px) plus a little, so a heading counts as
      // current once a link to it would have scrolled it into place.
      if (top !== undefined && top <= 96) current = id;
    }
    return current;
  }
}
