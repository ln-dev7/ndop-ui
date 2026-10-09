import { Component, computed, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Badge } from '@/ui/badge/badge';
import { primitivePages } from 'virtual:ndop/primitives';
import { ApiReference } from '../../../components/api-reference';
import type { PrimitivePageData } from '../../../components/component-data';
import { KeyboardTable } from '../../../components/keyboard-table';
import { CodeFrames } from '../../../site/code-frames';
import { OnThisPage, type PageHeading } from '../../../site/on-this-page';
import { StaticHtml } from '../../../site/static-html';

/** Classes of the section headings (`h2`). */
const H2 = 'scroll-mt-20 text-xl font-semibold tracking-tight';

/** Classes of the subsection headings (`h3`). */
const H3 = 'scroll-mt-20 text-base font-semibold';

/**
 * A headless primitive's reference (`/docs/primitives/<name>`, ADR-0016
 * amendment 12), for people building their own design system on
 * `@ndop/primitives`: the import, the `spec.md` contract, and every part's
 * inputs, models, outputs and data attributes. Built at build time from
 * what `primitives:api` extracts.
 */
@Component({
  selector: 'docs-primitive-page',
  imports: [
    RouterLink,
    NdIcon,
    Badge,
    ApiReference,
    KeyboardTable,
    CodeFrames,
    OnThisPage,
    StaticHtml,
  ],
  template: `
    <div class="flex gap-10 py-8">
      <main id="main" class="mx-auto w-full max-w-[640px] min-w-0">
        @if (page.value(); as item) {
          <article docsCodeFrames #frames="docsCodeFrames">
            <header>
              <h1 class="text-3xl font-semibold tracking-tight">
                {{ item.title }} primitive
              </h1>
              <p
                class="mt-2 text-[1.05rem] text-muted-foreground sm:text-base sm:text-balance"
              >
                {{ item.description }}
              </p>
              <ul class="mt-4 flex flex-wrap gap-2" aria-label="Facts">
                <li ndBadge variant="outline">
                  <code>{{ item.importPath }}</code>
                </li>
                @if (item.pattern; as pattern) {
                  <li ndBadge variant="outline">
                    <a [href]="pattern.url" class="hover:underline"
                      >WAI-ARIA: {{ pattern.name }}</a
                    >
                  </li>
                }
              </ul>
            </header>

            <section class="mt-10" aria-labelledby="import">
              <h2 id="import" [class]="h2">Import</h2>
              <p class="prose mt-3">
                Primitives ship in the
                <code class="inline-code">&#64;ndop/primitives</code> package
                and have no styles. Their state is on data attributes for you to
                style.
                @if (item.component; as component) {
                  The styled
                  <a [routerLink]="'/docs/components/' + component.name">{{
                    component.title
                  }}</a>
                  is built on this one.
                }
              </p>
              <div class="mt-4" [docsHtml]="item.importHtml"></div>
            </section>

            <section class="mt-12" aria-labelledby="accessibility">
              <h2 id="accessibility" [class]="h2">Accessibility</h2>
              @if (item.pattern; as pattern) {
                <p class="prose mt-4">
                  Implements the
                  <a [href]="pattern.url">{{ pattern.name }}</a> pattern of the
                  WAI-ARIA Authoring Practices.
                </p>
              }
              @if (item.accessibility.keyboard.length) {
                <h3 id="keyboard" [class]="h3 + ' mt-8 mb-3'">Keyboard</h3>
                <docs-keyboard-table [rows]="item.accessibility.keyboard" />
              }
              @if (item.accessibility.focusHtml.length) {
                <h3 id="focus" [class]="h3 + ' mt-8'">Focus</h3>
                <div class="prose mt-3">
                  <ul>
                    @for (rule of item.accessibility.focusHtml; track $index) {
                      <li [docsHtml]="rule"></li>
                    }
                  </ul>
                </div>
              }
              @if (item.accessibility.rtlHtml; as rtl) {
                <h3 id="right-to-left" [class]="h3 + ' mt-8'">Right-to-left</h3>
                <p class="prose mt-3" [docsHtml]="rtl"></p>
              }
            </section>

            <section class="mt-12" aria-labelledby="api-reference">
              <h2 id="api-reference" [class]="h2">API reference</h2>
              @for (part of item.parts; track part.name) {
                <h3 [id]="'api-' + part.name" [class]="h3 + ' mt-8 mb-3'">
                  {{ part.name }}
                </h3>
                <docs-api-reference [part]="part" />
              }
            </section>

            <p aria-live="polite" class="sr-only">
              {{ frames.announcement() }}
            </p>
          </article>
          <footer class="mt-12 border-t pt-6 text-muted-foreground">
            <a
              [href]="item.source"
              class="flex items-center gap-1.5 hover:text-foreground"
            >
              <svg ndIcon="code" class="size-3.5"></svg>
              View source
            </a>
          </footer>
        } @else if (page.status() === 'resolved') {
          <h1 class="text-3xl font-semibold">Page not found</h1>
        }
      </main>
      <div
        class="sticky top-22 hidden h-fit max-h-[calc(100dvh-5.5rem)] w-[220px] shrink-0 overflow-y-auto xl:block"
      >
        @defer (on immediate; hydrate on idle) {
          <docs-on-this-page [headings]="headings()" />
        }
      </div>
    </div>
  `,
})
export default class PrimitivePage {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, {
    requireSync: true,
  });
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly h2 = H2;
  protected readonly h3 = H3;

  /** The page's data, prepared at build time. */
  protected readonly page = resource({
    params: () => ({ name: this.params().get('name') ?? '' }),
    loader: async ({ params }): Promise<PrimitivePageData | undefined> => {
      const load = primitivePages[params.name];
      if (!load) return undefined;
      const data = (await load()).default;
      this.title.setTitle(`${data.title} primitive · Ndop UI`);
      this.meta.updateTag({ name: 'description', content: data.description });
      return data;
    },
  });

  protected readonly headings = computed<PageHeading[]>(() =>
    this.page.value()
      ? [
          { id: 'import', text: 'Import', level: 2 },
          { id: 'accessibility', text: 'Accessibility', level: 2 },
          { id: 'api-reference', text: 'API reference', level: 2 },
        ]
      : [],
  );
}
