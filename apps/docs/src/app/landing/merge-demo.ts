import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/tabs/tabs';
import { landing } from 'virtual:ndop/landing';
import { CodeFrames } from '../site/code-frames';
import { StaticHtml } from '../site/static-html';
import { InstallCommand } from './install-command';
import type { LandingStep } from './landing-data';

/** How long each step of the demo shows before the next, in milliseconds. */
const STEP = 1800;

/**
 * The update demo of the landing page (ADR-0026, section 2): a real merge
 * from the update suite's Button fixture, in three tabs (your edit,
 * upstream's fix, the merged file), each highlighted at build time. The
 * server renders the merged file, which is the point, for readers without
 * scripts; once hydrated in view, it plays the steps in order unless the
 * reader prefers less motion, and stops as soon as they pick a tab.
 */
@Component({
  selector: 'docs-merge-demo',
  imports: [
    RouterLink,
    NdIcon,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    CodeFrames,
    StaticHtml,
    InstallCommand,
  ],
  host: { class: 'block' },
  template: `
    <div
      ndTabs
      orientation="vertical"
      class="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12"
      [value]="step()"
      (valueChange)="pick($event)"
    >
      <div class="grid gap-6">
        <div
          ndTabsList
          aria-label="Update steps"
          class="h-auto w-full flex-col items-stretch gap-1 rounded-none bg-transparent p-0"
        >
          @for (item of steps; track item.id; let index = $index) {
            <button
              ndTabsTrigger
              [value]="item.id"
              class="h-auto items-start justify-start gap-3 rounded-xl border-transparent p-4 text-start whitespace-normal text-muted-foreground data-[state=active]:border-border data-[state=active]:bg-muted/50 data-[state=active]:shadow-none dark:data-[state=active]:bg-muted/40"
            >
              <span
                class="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums"
                aria-hidden="true"
                >{{ index + 1 }}</span
              >
              <span class="grid gap-1">
                <span class="text-sm font-medium text-foreground">{{
                  item.title
                }}</span>
                <span class="text-sm font-normal text-muted-foreground">{{
                  item.description
                }}</span>
              </span>
            </button>
          }
        </div>
        <div class="grid gap-3 px-4">
          <docs-install-command command="npx @ndop/cli update button" />
          <p class="text-sm text-muted-foreground">
            Conflicts get markers and a non-zero exit, never a silent overwrite.
          </p>
          <a
            routerLink="/docs/getting-started/cli"
            fragment="updating"
            class="inline-flex w-fit items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
          >
            How updates work
            <svg ndIcon="arrow-right" class="size-4 rtl:rotate-180"></svg>
          </a>
        </div>
      </div>
      <div
        class="merge-demo overflow-hidden rounded-2xl border bg-muted/30 lg:col-start-2 lg:row-span-2 lg:row-start-1"
        docsCodeFrames
        #frames="docsCodeFrames"
      >
        <div
          class="flex h-11 items-center gap-3 border-b px-4 text-sm"
          dir="ltr"
        >
          <span class="truncate font-mono text-foreground">{{ file }}</span>
          <span
            class="ms-auto flex shrink-0 items-center gap-3 text-xs text-muted-foreground"
          >
            <span class="flex items-center gap-1.5"
              ><span class="merge-swatch mine"></span>Yours</span
            >
            <span class="flex items-center gap-1.5"
              ><span class="merge-swatch theirs"></span>Upstream</span
            >
          </span>
        </div>
        @for (item of steps; track item.id) {
          <div
            ndTabsContent
            [value]="item.id"
            class="rounded-none"
            [docsHtml]="item.html"
          ></div>
        }
        <p class="sr-only" aria-live="polite">
          {{ frames.announcement() }}
        </p>
      </div>
    </div>
  `,
})
export class MergeDemo {
  protected readonly steps = landing.merge.steps;
  protected readonly file = landing.merge.file;

  /** The shown step; the merged file until the demo plays. */
  protected readonly step = signal<LandingStep['id']>('merged');

  private readonly timers: ReturnType<typeof setTimeout>[] = [];

  constructor() {
    const view = inject(DOCUMENT).defaultView;
    inject(DestroyRef).onDestroy(() => this.stop());
    // Only in the browser, where this hydrates as it scrolls into view.
    afterNextRender(() => {
      if (view?.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
      }
      this.step.set('edit');
      this.timers.push(
        setTimeout(() => this.step.set('upstream'), STEP),
        setTimeout(() => this.step.set('merged'), STEP * 2),
      );
    });
  }

  /**
   * Shows the step the reader picked, and stops the demo playing.
   *
   * @param value - The step's id.
   */
  protected pick(value: string | null): void {
    if (!value || value === this.step()) return;
    this.stop();
    this.step.set(value as LandingStep['id']);
  }

  private stop(): void {
    this.timers.forEach(clearTimeout);
    this.timers.length = 0;
  }
}
