import {
  Component,
  computed,
  inject,
  resource,
  signal,
  type Type,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { Badge } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';
import { examples, pages, templatePalette } from 'virtual:ndop/components';
import { ApiReference } from '../../../components/api-reference';
import { TrustHtmlPipe } from '../../../components/trust-html.pipe';
import type { PlaygroundHost } from '../../../playground/playground';
import { PlaygroundPanel } from '../../../playground/playground-panel';
import { playgrounds } from '../../../playground/hosts';
import type {
  ComponentPageData,
  PartData,
} from '../../../components/component-data';
import { ExamplePreview } from '../../../components/example-preview';
import { KeyboardTable } from '../../../components/keyboard-table';
import { commandFor, type PackageManager } from '../../../../highlight/shiki';
import { CodeFrames } from '../../../site/code-frames';
import { Navigation } from '../../../site/navigation';
import { OnThisPage, type PageHeading } from '../../../site/on-this-page';

/** A component page's data with its examples' components. */
interface LoadedPage {
  data: ComponentPageData;
  components: Record<string, Type<unknown> | undefined>;
  playground?: { host: PlaygroundHost; part: PartData };
}

/**
 * Loads a component page's data, its examples' components and its
 * playground together, so the prerendered previews hydrate against the
 * same components.
 *
 * @param name - Registry item name.
 * @returns The page, or `undefined` for an unknown name.
 */
async function loadPage(name: string): Promise<LoadedPage | undefined> {
  const load = pages[name];
  if (!load) return undefined;
  const data = (await load()).default;
  const components = Object.fromEntries(
    await Promise.all(
      data.examples.map(
        async (example) =>
          [example.name, await examples[example.name]?.()] as const,
      ),
    ),
  );
  const host = await playgrounds[name]?.();
  const part = data.parts.find((entry) => entry.name === host?.part);
  return {
    data,
    components,
    ...(host && part ? { playground: { host, part } } : {}),
  };
}

/** Classes of the section headings (`h2`). */
const H2 = 'scroll-mt-20 text-xl font-semibold tracking-tight';

/** Classes of the subsection headings (`h3`). */
const H3 = 'scroll-mt-20 text-lg font-semibold tracking-tight';

/**
 * A component's page (`/docs/components/<name>`), in the order RFC-0001's
 * "Component page anatomy" gives: header, hero preview, install, usage,
 * examples, accessibility, API reference, agent notes and footer. Its data
 * comes from the built registry at build time (`build/component-docs.ts`).
 */
@Component({
  selector: 'docs-component-page',
  imports: [
    RouterLink,
    NdIcon,
    Badge,
    Button,
    CodeFrames,
    OnThisPage,
    ExamplePreview,
    KeyboardTable,
    ApiReference,
    TrustHtmlPipe,
    PlaygroundPanel,
  ],
  template: `
    <div class="flex gap-10 py-8">
      <main id="main" class="mx-auto w-full max-w-[640px] min-w-0">
        @if (page.value(); as loaded) {
          @let item = loaded.data;
          <article docsCodeFrames #frames="docsCodeFrames">
            <header>
              <div class="flex items-start justify-between gap-4">
                <h1 class="text-3xl font-semibold tracking-tight">
                  {{ item.title }}
                </h1>
                <nav aria-label="Components" class="flex gap-2">
                  @if (neighbors().previous; as previous) {
                    <a
                      ndButton
                      variant="outline"
                      size="icon-sm"
                      [routerLink]="previous.url"
                      [attr.aria-label]="'Previous: ' + previous.title"
                      [attr.title]="previous.title"
                      ><svg ndIcon="arrow-left" class="rtl:rotate-180"></svg
                    ></a>
                  }
                  @if (neighbors().next; as next) {
                    <a
                      ndButton
                      variant="outline"
                      size="icon-sm"
                      [routerLink]="next.url"
                      [attr.aria-label]="'Next: ' + next.title"
                      [attr.title]="next.title"
                      ><svg ndIcon="arrow-right" class="rtl:rotate-180"></svg
                    ></a>
                  }
                </nav>
              </div>
              <p
                class="mt-2 text-[1.05rem] text-muted-foreground sm:text-base sm:text-balance"
              >
                {{ item.description }}
              </p>
              <ul class="mt-4 flex flex-wrap gap-2" aria-label="Facts">
                <li ndBadge variant="outline">v{{ item.version }}</li>
                @if (item.pattern; as pattern) {
                  <li ndBadge variant="outline">
                    <a [href]="pattern.url" class="hover:underline"
                      >WAI-ARIA: {{ pattern.name }}</a
                    >
                  </li>
                }
                @if (item.ssr) {
                  <li ndBadge variant="outline">SSR</li>
                }
                @if (item.zoneless) {
                  <li ndBadge variant="outline">Zoneless</li>
                }
                @if (item.bundleSize; as size) {
                  <li ndBadge variant="outline">{{ kilobytes(size) }} gzip</li>
                }
              </ul>
              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  ndButton
                  variant="outline"
                  size="sm"
                  (click)="copyInstall($event, frames)"
                >
                  <svg ndIcon="copy"></svg>
                  Copy install command
                </button>
                <a
                  ndButton
                  variant="outline"
                  size="sm"
                  [href]="item.links.source"
                >
                  <svg ndIcon="code"></svg>
                  View source
                </a>
                <a
                  ndButton
                  variant="outline"
                  size="sm"
                  [href]="item.links.issue"
                >
                  <svg ndIcon="bug"></svg>
                  Report issue
                </a>
              </div>
            </header>

            @if (item.examples[0]; as main) {
              <docs-example-preview
                class="mt-8 scroll-mt-20"
                [id]="main.name"
                [title]="main.title"
                [component]="loaded.components[main.name]"
                [codeHtml]="main.codeHtml"
              />
            }

            <div
              class="prose mt-8"
              [innerHTML]="item.introHtml | trustHtml"
            ></div>

            <section class="mt-12" aria-labelledby="installation">
              <h2 id="installation" [class]="h2">Installation</h2>
              <div
                role="tablist"
                aria-label="Installation"
                class="mt-4 inline-flex gap-1 rounded-lg bg-muted p-1"
              >
                @for (tab of installTabs; track tab.id) {
                  <button
                    type="button"
                    role="tab"
                    class="rounded-md px-3 py-1 text-sm font-medium text-muted-foreground aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                    [id]="'install-' + tab.id + '-tab'"
                    [attr.aria-controls]="'install-' + tab.id"
                    [attr.aria-selected]="install() === tab.id"
                    [tabIndex]="install() === tab.id ? 0 : -1"
                    (click)="install.set(tab.id)"
                    (keydown)="onInstallKeydown($event)"
                  >
                    {{ tab.label }}
                  </button>
                }
              </div>
              <div
                role="tabpanel"
                id="install-cli"
                aria-labelledby="install-cli-tab"
                class="prose"
                [hidden]="install() !== 'cli'"
                [innerHTML]="item.install.cliHtml | trustHtml"
              ></div>
              <div
                role="tabpanel"
                id="install-manual"
                aria-labelledby="install-manual-tab"
                class="mt-8"
                [hidden]="install() !== 'manual'"
              >
                <ol class="steps">
                  @if (item.install.dependenciesHtml; as dependencies) {
                    <li>
                      <h3 class="step-title">Install the dependencies</h3>
                      <div [innerHTML]="dependencies | trustHtml"></div>
                    </li>
                  }
                  <li>
                    <h3 class="step-title">Copy the code into your project</h3>
                    <p
                      class="mt-2 text-[0.9375rem] leading-7 text-muted-foreground"
                    >
                      At the paths your
                      <code class="inline-code">ndop.json</code>
                      aliases point to; these use the defaults.
                    </p>
                    @for (file of item.install.files; track file.target) {
                      <div [innerHTML]="file.html | trustHtml"></div>
                    }
                  </li>
                  <li>
                    <h3 class="step-title">
                      Update the import paths to match your project
                    </h3>
                    <p
                      class="mt-2 text-[0.9375rem] leading-7 text-muted-foreground"
                    >
                      The files import each other through the
                      <code class="inline-code">&#64;/ui</code> and
                      <code class="inline-code">&#64;/lib</code> aliases.
                    </p>
                  </li>
                </ol>
              </div>
            </section>

            <section class="mt-12" aria-labelledby="usage">
              <h2 id="usage" [class]="h2">Usage</h2>
              <div
                class="prose"
                [innerHTML]="item.usage.importsHtml | trustHtml"
              ></div>
              <div
                class="prose"
                [innerHTML]="item.usage.templateHtml | trustHtml"
              ></div>
            </section>

            @if (loaded.playground; as playground) {
              <section class="mt-12" aria-labelledby="playground">
                <h2 id="playground" [class]="h2">Playground</h2>
                <docs-playground
                  class="mt-4"
                  [host]="playground.host"
                  [part]="playground.part"
                  [palette]="palette"
                />
              </section>
            }

            @if (item.examples.length > 1) {
              <section class="mt-12" aria-labelledby="examples">
                <h2 id="examples" [class]="h2">Examples</h2>
                @for (example of item.examples.slice(1); track example.name) {
                  <h3 [id]="example.name" [class]="h3 + ' mt-8'">
                    {{ example.title }}
                  </h3>
                  <p
                    class="mt-2 text-[0.9375rem] leading-7 text-muted-foreground"
                    [innerHTML]="example.descriptionHtml"
                  ></p>
                  <docs-example-preview
                    class="mt-4"
                    [title]="example.title"
                    [component]="loaded.components[example.name]"
                    [codeHtml]="example.codeHtml"
                  />
                }
              </section>
            }

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
                      <li [innerHTML]="rule"></li>
                    }
                  </ul>
                </div>
              }
              @if (
                !item.pattern &&
                !item.accessibility.keyboard.length &&
                !item.accessibility.focusHtml.length
              ) {
                <p class="prose mt-4">
                  {{ item.title }} has no keyboard interaction or focus handling
                  of its own; it keeps the semantics of the element it's on.
                </p>
              }
              @if (item.accessibility.rtlHtml; as rtl) {
                <h3 id="right-to-left" [class]="h3 + ' mt-8'">Right-to-left</h3>
                <p class="prose mt-3" [innerHTML]="rtl"></p>
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

            <section class="mt-12" aria-labelledby="agent-notes">
              <h2 id="agent-notes" [class]="h2">Agent notes</h2>
              <div class="mt-4 grid gap-4 sm:grid-cols-2">
                <div class="rounded-lg border p-4">
                  <h3 class="text-sm font-semibold">Do</h3>
                  <div class="prose mt-2 text-sm">
                    <ul>
                      @for (note of item.agentNotes.doHtml; track $index) {
                        <li [innerHTML]="note"></li>
                      }
                    </ul>
                  </div>
                </div>
                <div class="rounded-lg border p-4">
                  <h3 class="text-sm font-semibold">Don't</h3>
                  <div class="prose mt-2 text-sm">
                    <ul>
                      @for (note of item.agentNotes.dontHtml; track $index) {
                        <li [innerHTML]="note"></li>
                      }
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            <p aria-live="polite" class="sr-only">
              {{ frames.announcement() }}
            </p>
          </article>

          <footer class="mt-16 border-t pt-6 text-sm">
            <nav aria-label="Pages" class="flex justify-between gap-4">
              @if (neighbors().previous; as previous) {
                <a
                  [routerLink]="previous.url"
                  class="flex items-center gap-2 hover:underline"
                >
                  <svg ndIcon="arrow-left" class="size-4 rtl:rotate-180"></svg>
                  {{ previous.title }}
                </a>
              }
              @if (neighbors().next; as next) {
                <a
                  [routerLink]="next.url"
                  class="ms-auto flex items-center gap-2 hover:underline"
                >
                  {{ next.title }}
                  <svg ndIcon="arrow-right" class="size-4 rtl:rotate-180"></svg>
                </a>
              }
            </nav>
            <div
              class="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground"
            >
              <a
                [href]="item.links.edit"
                class="flex items-center gap-1.5 hover:text-foreground"
              >
                <svg ndIcon="pencil" class="size-3.5"></svg>
                Edit this page
              </a>
              @if (item.lastUpdated; as date) {
                <span
                  >Last updated
                  <time [attr.datetime]="date">{{ date }}</time></span
                >
              }
              <span>Versions: {{ item.versions.join(', ') }}</span>
            </div>
          </footer>
        } @else if (page.status() === 'resolved') {
          <h1 class="text-3xl font-semibold">Page not found</h1>
        }
      </main>
      <aside
        class="sticky top-22 hidden h-fit max-h-[calc(100dvh-5.5rem)] w-[220px] shrink-0 overflow-y-auto xl:block"
      >
        <docs-on-this-page [headings]="headings()" />
      </aside>
    </div>
  `,
})
export default class ComponentPage {
  private readonly params = toSignal(inject(ActivatedRoute).paramMap, {
    requireSync: true,
  });
  private readonly navigation = inject(Navigation);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  protected readonly h2 = H2;
  protected readonly palette = templatePalette;
  protected readonly h3 = H3;
  protected readonly installTabs = [
    { id: 'cli', label: 'CLI' },
    { id: 'manual', label: 'Manual' },
  ] as const;
  protected readonly install = signal<'cli' | 'manual'>('cli');

  /** The page's data, prepared at build time. */
  protected readonly page = resource({
    params: () => ({ name: this.params().get('name') ?? '' }),
    loader: async ({ params }) => {
      const loaded = await loadPage(params.name);
      if (loaded) {
        this.title.setTitle(`${loaded.data.title} · Ndop UI`);
        this.meta.updateTag({
          name: 'description',
          content: loaded.data.description,
        });
      }
      return loaded;
    },
  });

  protected readonly headings = computed<PageHeading[]>(() => {
    const item = this.page.value()?.data;
    if (!item) return [];
    return [
      { id: 'installation', text: 'Installation', level: 2 },
      { id: 'usage', text: 'Usage', level: 2 },
      ...(this.page.value()?.playground
        ? [{ id: 'playground', text: 'Playground', level: 2 }]
        : []),
      ...(item.examples.length > 1
        ? [
            { id: 'examples', text: 'Examples', level: 2 },
            ...item.examples.slice(1).map((example) => ({
              id: example.name,
              text: example.title,
              level: 3,
            })),
          ]
        : []),
      { id: 'accessibility', text: 'Accessibility', level: 2 },
      { id: 'api-reference', text: 'API reference', level: 2 },
      { id: 'agent-notes', text: 'Agent notes', level: 2 },
    ];
  });

  protected readonly neighbors = computed(() => {
    const links = this.navigation.links();
    const url = `/docs/components/${this.params().get('name')}`;
    const index = links.findIndex((link) => link.url === url);
    return {
      previous: links[index - 1],
      next: index >= 0 ? links[index + 1] : undefined,
    };
  });

  /**
   * A size in kilobytes, with one decimal.
   *
   * @param bytes - Size in bytes.
   * @returns Such as `1.1 kB`.
   */
  protected kilobytes(bytes: number): string {
    return `${(bytes / 1000).toFixed(1)} kB`;
  }

  /**
   * Copies `ndop add` for the reader's package manager.
   *
   * @param event - The button's click.
   * @param frames - The page's code frames, which know the package manager.
   */
  protected async copyInstall(event: Event, frames: CodeFrames): Promise<void> {
    const command = commandFor(
      frames.packageManager() as PackageManager,
      `npx ndop add ${this.page.value()?.data.name}`,
    );
    await frames.copy(command, event.currentTarget as HTMLElement);
  }

  /**
   * Moves between the installation tabs with the arrow keys, Home and End,
   * selecting as focus moves (WAI-ARIA tabs pattern).
   *
   * @param event - A key press on a tab.
   */
  protected onInstallKeydown(event: KeyboardEvent): void {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = this.install() === 'cli' ? 'manual' : 'cli';
    const target =
      event.key === 'Home' ? 'cli' : event.key === 'End' ? 'manual' : next;
    this.install.set(target);
    (event.currentTarget as HTMLElement).parentElement
      ?.querySelector<HTMLElement>(`#install-${target}-tab`)
      ?.focus();
  }
}
