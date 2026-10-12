import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  PLATFORM_ID,
  resource,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { blockCode } from 'virtual:ndop/blocks';
import { CodeFrames } from '../site/code-frames';
import { fitFrameToContent } from '../site/frame-height';
import { StaticHtml } from '../site/static-html';
import type { BlockSummary } from './block-data';

/** The tabs of a block card. */
type BlockTab = 'preview' | 'code';

/** The preview widths the viewport switcher offers (ADR-0022). */
const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop', icon: 'monitor', width: '100%' },
  { id: 'tablet', label: 'Tablet', icon: 'tablet', width: '768px' },
  { id: 'mobile', label: 'Mobile', icon: 'smartphone', width: '375px' },
] as const;

/**
 * The preview's least height, in pixels: what a block that fills the
 * viewport (`min-h-svh`) gets. Taller blocks make the frame taller.
 */
const MIN_HEIGHT = 720;

/** A preview width's id. */
type Viewport = (typeof VIEWPORTS)[number]['id'];

/**
 * One block in the gallery (ADR-0022): Preview and Code tabs, a viewport
 * switcher, its install command to copy, a link to open the preview alone,
 * and the components it uses.
 *
 * The preview is an iframe of `/blocks/<name>/preview`, so the block's
 * page-level layout and media queries see the frame's width, as they would
 * a phone's. It loads lazily, so a gallery of many blocks doesn't load
 * them all up front, and grows to the block's height, so it never scrolls
 * on its own: the wheel and touch always scroll the gallery. The code
 * loads the first time its tab opens.
 */
@Component({
  selector: 'docs-block-card',
  imports: [RouterLink, NdIcon, Button, StaticHtml, CodeFrames],
  host: { class: 'block' },
  template: `
    <article
      docsCodeFrames
      #frames="docsCodeFrames"
      class="scroll-mt-20"
      [attr.aria-labelledby]="heading() ? block().name + '-title' : null"
      [attr.aria-label]="heading() ? null : block().title"
    >
      @if (heading()) {
        <h2
          [id]="block().name + '-title'"
          class="text-xl font-semibold tracking-tight"
        >
          <a [routerLink]="'/blocks/' + block().name" class="hover:underline">{{
            block().title
          }}</a>
        </h2>
        <p class="mt-1 text-muted-foreground">{{ block().description }}</p>
      }

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          [attr.aria-label]="block().title"
          class="inline-flex gap-1 rounded-lg bg-muted p-1"
        >
          @for (tab of tabs; track tab.id) {
            <button
              type="button"
              role="tab"
              class="rounded-md px-3 py-1 text-sm font-medium text-foreground/70 aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              [id]="id(tab.id) + '-tab'"
              [attr.aria-controls]="id(tab.id)"
              [attr.aria-selected]="tab.id === current()"
              [tabIndex]="tab.id === current() ? 0 : -1"
              (click)="select(tab.id)"
              (keydown)="onTabKeydown($event)"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        <div
          role="group"
          aria-label="Preview width"
          class="hidden gap-1 rounded-lg border p-1 md:inline-flex"
        >
          @for (viewport of viewports; track viewport.id) {
            <button
              ndButton
              variant="ghost"
              size="icon-sm"
              [attr.aria-pressed]="viewport.id === width()"
              class="aria-pressed:bg-muted"
              [title]="viewport.label"
              (click)="setWidth(viewport.id)"
            >
              <svg [ndIcon]="viewport.icon"></svg>
              <span class="sr-only">{{ viewport.label }}</span>
            </button>
          }
        </div>

        <div class="ms-auto flex items-center gap-1">
          <button
            ndButton
            variant="outline"
            size="sm"
            class="font-mono text-xs"
            (click)="copy()"
          >
            <svg [ndIcon]="copied() ? 'check' : 'terminal'"></svg>
            {{ block().command }}
            <span class="sr-only">, copy</span>
          </button>
          <a
            ndButton
            variant="ghost"
            size="icon-sm"
            target="_blank"
            [href]="previewPath()"
            [title]="'Open ' + block().title + ' in a new tab'"
          >
            <svg ndIcon="external-link"></svg>
            <span class="sr-only">Open {{ block().title }} in a new tab</span>
          </a>
        </div>
      </div>

      <div
        role="tabpanel"
        [id]="id('preview')"
        [attr.aria-labelledby]="id('preview') + '-tab'"
        class="preview-backdrop mt-3 overflow-hidden rounded-xl border bg-muted/40"
        [hidden]="current() !== 'preview'"
      >
        <!-- Made in the browser only: hydration would set the server's
             src again, which Firefox and Safari take as a new
             navigation, cancelling the preview's scripts mid-load. -->
        @if (mounted()) {
          <iframe
            loading="lazy"
            class="mx-auto block max-w-full bg-background transition-[width] duration-200 ease-out motion-reduce:transition-none"
            [style.width]="frameWidth()"
            [style.height.px]="frameHeight()"
            [src]="frameSource()"
            [title]="block().title + ' preview'"
            (load)="fitToContent($event)"
          ></iframe>
        } @else {
          <div
            class="mx-auto max-w-full bg-background"
            [style.width]="frameWidth()"
            [style.height.px]="frameHeight()"
          ></div>
        }
      </div>

      <div
        role="tabpanel"
        [id]="id('code')"
        [attr.aria-labelledby]="id('code') + '-tab'"
        class="mt-3"
        [hidden]="current() !== 'code'"
      >
        @if (code.value(); as loaded) {
          @for (file of loaded.files; track file.target) {
            <div [docsHtml]="file.html"></div>
          }
        } @else if (code.error()) {
          <p class="text-sm text-destructive">The code couldn't load.</p>
        } @else {
          <p class="text-sm text-muted-foreground">Loading the code…</p>
        }
      </div>

      <dl class="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        @if (block().components.length) {
          <div class="flex flex-wrap gap-x-2">
            <dt class="text-muted-foreground">Uses</dt>
            <dd>
              <ul class="inline-flex flex-wrap gap-x-2">
                @for (
                  component of block().components;
                  track component.name;
                  let last = $last
                ) {
                  <li>
                    <a
                      class="underline-offset-4 hover:underline"
                      [routerLink]="'/docs/components/' + component.name"
                      >{{ component.title }}</a
                    >{{ last ? '' : ',' }}
                  </li>
                }
              </ul>
            </dd>
          </div>
        }
        @if (block().packages.length) {
          <div class="flex flex-wrap gap-x-2">
            <dt class="text-muted-foreground">Installs</dt>
            <dd class="font-mono text-xs leading-5">
              {{ block().packages.join(', ') }}
            </dd>
          </div>
        }
      </dl>

      <p class="sr-only" aria-live="polite">
        {{ announcement() || frames.announcement() }}
      </p>
    </article>
  `,
})
export class BlockCard {
  /** The block. */
  readonly block = input.required<BlockSummary>();
  /**
   * Whether the card shows the block's title as an `h2` and its
   * description; off where the page's own heading names it.
   */
  readonly heading = input(true);

  private readonly sanitizer = inject(DomSanitizer);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));

  /** Whether the first render in the browser has happened. */
  protected readonly mounted = signal(false);

  protected readonly tabs: readonly { id: BlockTab; label: string }[] = [
    { id: 'preview', label: 'Preview' },
    { id: 'code', label: 'Code' },
  ];
  protected readonly viewports = VIEWPORTS;

  protected readonly current = signal<BlockTab>('preview');
  protected readonly width = signal<Viewport>('desktop');
  protected readonly copied = signal(false);
  protected readonly announcement = signal('');

  protected readonly previewPath = computed(
    () => `/blocks/${this.block().name}/preview`,
  );

  // The path is the site's own route, never reader input.
  protected readonly frameSource = computed(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(this.previewPath()),
  );

  protected readonly frameHeight = signal(MIN_HEIGHT);

  private stopFitting: (() => void) | undefined;

  protected readonly frameWidth = computed(
    () => VIEWPORTS.find((viewport) => viewport.id === this.width())?.width,
  );

  private readonly codeRequested = signal(false);

  protected readonly code = resource({
    params: () => (this.codeRequested() ? this.block().name : undefined),
    loader: async ({ params }) => (await blockCode[params]?.())?.default,
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopFitting?.());
    afterNextRender(() => this.mounted.set(true));
  }

  /**
   * Keeps the frame as tall as the block in it, from when its page loads.
   *
   * @param event - The frame's load event.
   */
  protected fitToContent(event: Event): void {
    this.stopFitting?.();
    this.stopFitting = fitFrameToContent(
      event.target as HTMLIFrameElement,
      MIN_HEIGHT,
      (height) => this.frameHeight.set(height),
    );
  }

  /**
   * Switches the preview's width. The frame first returns to its least
   * height: a block that fills the viewport is as tall as the frame, so it
   * would otherwise never shrink back.
   *
   * @param viewport - The width's id.
   */
  protected setWidth(viewport: Viewport): void {
    this.width.set(viewport);
    this.frameHeight.set(MIN_HEIGHT);
  }

  /**
   * An element id of this card.
   *
   * @param part - What the element is.
   * @returns The id.
   */
  protected id(part: string): string {
    return `${this.block().name}-${part}`;
  }

  /**
   * Shows a tab, loading the code the first time.
   *
   * @param tab - The tab.
   */
  protected select(tab: BlockTab): void {
    this.current.set(tab);
    if (tab === 'code') this.codeRequested.set(true);
  }

  /**
   * Arrow keys, Home and End move between the two tabs, which follow
   * focus (WAI-ARIA tabs, automatic activation).
   *
   * @param event - The keydown on a tab.
   */
  protected onTabKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const target: BlockTab =
      event.key === 'Home'
        ? 'preview'
        : event.key === 'End'
          ? 'code'
          : this.current() === 'preview'
            ? 'code'
            : 'preview';
    this.select(target);
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelector<HTMLElement>(`#${this.id(target)}-tab`)
      ?.focus();
  }

  /** Copies the install command and says so for two seconds. */
  protected async copy(): Promise<void> {
    if (!this.browser) return;
    try {
      await navigator.clipboard.writeText(this.block().command);
      this.copied.set(true);
      this.announcement.set('Copied the install command.');
      setTimeout(() => {
        this.copied.set(false);
        this.announcement.set('');
      }, 2000);
    } catch {
      this.announcement.set("Your browser didn't allow the copy.");
    }
  }
}
