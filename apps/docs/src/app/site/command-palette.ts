import {
  ActiveDescendantKeyManager,
  type Highlightable,
} from '@angular/cdk/a11y';
import {
  afterRenderEffect,
  Component,
  computed,
  Directive,
  inject,
  Injector,
  input,
  output,
  signal,
  untracked,
  viewChildren,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { components } from 'virtual:ndop/components';
import { Button } from '@/ui/button/button';
import {
  DialogContent,
  DialogOverlay,
  DialogTitle,
  NdDialog,
  NdDialogPortal,
} from '@/ui/dialog/dialog';
import { commandFor, type PackageManager } from '../../highlight/shiki';
import type { SearchEntry } from '../search/search-entry';
import { score, search } from '../search/search';
import { savedPackageManager } from './code-frames';
import { injectCurrentPath } from './current-path';
import { copyPageMarkdown } from './page-actions';
import { Preferences } from './preferences';

/** One choice in the palette: a page to open or an action to run. */
interface PaletteItem {
  /** Unique, for the option's `id`. */
  id: string;
  /** What it's called. */
  title: string;
  /** Where it belongs, or what kind of action it is. */
  context: string;
  /** Runs it; the palette then closes. */
  run: () => void | Promise<void>;
}

/**
 * An option of the palette's listbox, highlighted by the CDK's
 * `ActiveDescendantKeyManager` while focus stays in the search field.
 */
@Directive({
  selector: '[docsPaletteOption]',
  host: {
    role: 'option',
    '[id]': 'item().id',
    '[attr.aria-selected]': 'active()',
    '[attr.data-active]': "active() ? '' : null",
    // Pointer only: keyboard users stay in the search field, which moves
    // the highlight (WAI-ARIA combobox with aria-activedescendant).
    '(click)': 'chosen.emit()',
    '(pointermove)': 'pointed.emit()',
  },
})
export class PaletteOption implements Highlightable {
  /** The choice it shows. */
  readonly item = input.required<PaletteItem>({ alias: 'docsPaletteOption' });
  /** Whether it is the highlighted option. */
  readonly active = signal(false);
  /** Emits when it is clicked. */
  readonly chosen = output();
  /** Emits when the pointer moves over it. */
  readonly pointed = output();

  /** Highlights it. */
  setActiveStyles(): void {
    this.active.set(true);
  }

  /** Removes its highlight. */
  setInactiveStyles(): void {
    this.active.set(false);
  }

  /**
   * Its label, for the key manager's typeahead.
   *
   * @returns The title.
   */
  getLabel(): string {
    return this.item().title;
  }
}

/**
 * The ⌘K / Ctrl+K command palette (ADR-0008): a WAI-ARIA combobox in a
 * dialog that searches a build-time index of guides, sections,
 * components, props and keyboard shortcuts, and runs actions. The index is
 * loaded the first time the palette opens.
 */
@Component({
  selector: 'docs-command-palette',
  imports: [
    NdIcon,
    Button,
    NdDialog,
    NdDialogPortal,
    DialogOverlay,
    DialogContent,
    DialogTitle,
    PaletteOption,
  ],
  host: { '(document:keydown)': 'onGlobalKeydown($event)' },
  template: `
    <button
      ndButton
      variant="outline"
      size="sm"
      class="w-9 justify-start px-0 text-muted-foreground sm:w-56 sm:px-3"
      aria-label="Search the docs"
      aria-keyshortcuts="Meta+K Control+K"
      (click)="open.set(true)"
    >
      <svg ndIcon="search" class="mx-auto sm:mx-0"></svg>
      <span class="hidden sm:inline">Search the docs…</span>
      <kbd
        class="ms-auto hidden h-5 items-center rounded border bg-muted px-1.5 font-mono text-[0.7rem] text-foreground/70 sm:inline-flex"
        >{{ shortcut() }}</kbd
      >
    </button>
    <ng-container ndDialog [(open)]="open">
      <ng-template ndDialogPortal>
        <div ndDialogOverlay></div>
        <div
          ndDialogContent
          class="top-[15%] translate-y-0 gap-0 overflow-hidden p-0"
        >
          <h2 ndDialogTitle class="sr-only">Search the docs</h2>
          <div class="flex items-center gap-2 border-b px-3">
            <svg
              ndIcon="search"
              class="size-4 shrink-0 text-muted-foreground"
            ></svg>
            <input
              class="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              role="combobox"
              aria-label="Search the docs"
              aria-autocomplete="list"
              aria-expanded="true"
              aria-controls="palette-results"
              autocomplete="off"
              spellcheck="false"
              placeholder="Search components, props, guides…"
              [attr.aria-activedescendant]="activeId()"
              [value]="query()"
              (input)="query.set(text($event))"
              (keydown)="onKeydown($event)"
            />
          </div>
          <div
            id="palette-results"
            role="listbox"
            aria-label="Results"
            class="max-h-[min(60vh,24rem)] overflow-y-auto p-2"
          >
            @for (group of groups(); track group.title) {
              <div role="group" [attr.aria-labelledby]="'palette-' + $index">
                <div
                  class="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground"
                  [id]="'palette-' + $index"
                >
                  {{ group.title }}
                </div>
                @for (item of group.items; track item.id) {
                  <div
                    class="flex cursor-pointer items-baseline gap-2 rounded-md px-2 py-1.5 text-sm data-active:bg-accent data-active:text-accent-foreground"
                    [docsPaletteOption]="item"
                    (pointed)="highlight(item)"
                    (chosen)="choose(item)"
                  >
                    <span class="truncate">{{ item.title }}</span>
                    <span
                      class="ms-auto shrink-0 truncate text-xs text-muted-foreground"
                      >{{ item.context }}</span
                    >
                  </div>
                }
              </div>
            } @empty {
              <p class="py-6 text-center text-sm text-muted-foreground">
                {{ entries() ? 'No results.' : 'Loading…' }}
              </p>
            }
          </div>
        </div>
      </ng-template>
    </ng-container>
    <p aria-live="polite" class="sr-only">{{ announcement() }}</p>
  `,
})
export class CommandPalette {
  /** Whether the palette is open. */
  readonly open = signal(false);

  protected readonly query = signal('');
  protected readonly entries = signal<SearchEntry[] | null>(null);
  protected readonly announcement = signal('');
  protected readonly shortcut = signal('Ctrl K');

  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly path = injectCurrentPath();
  private readonly preferences = inject(Preferences);
  private readonly options = viewChildren(PaletteOption);
  private readonly keys = new ActiveDescendantKeyManager(
    this.options,
    inject(Injector),
  )
    .withWrap()
    .withVerticalOrientation();

  /** Actions, searched like the index but listed last. */
  private readonly actions: PaletteItem[] = [
    {
      id: 'action-dark',
      title: 'Toggle dark theme',
      context: 'Action',
      run: () => this.preferences.toggleDark(),
    },
    {
      id: 'action-rtl',
      title: 'Toggle right-to-left',
      context: 'Action',
      run: () =>
        this.preferences.setDirection(
          this.preferences.direction() === 'rtl' ? 'ltr' : 'rtl',
        ),
    },
    {
      id: 'action-copy-page',
      title: 'Copy page for agent',
      context: 'Action',
      run: () => this.copyPage(),
    },
    ...components.map((component) => ({
      id: `action-install-${component.name}`,
      title: `Copy install command for ${component.title}`,
      context: 'Action',
      run: () => this.copyInstall(component.name),
    })),
  ];

  protected readonly groups = computed(() => {
    const entries = this.entries();
    if (!entries) return [];
    const query = this.query();
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    const actions = this.actions
      .filter(
        (action) =>
          !words.length ||
          score({ ...action, kind: 'page', description: '', url: '' }, words) >
            0,
      )
      .slice(0, words.length ? 6 : 2);
    return [
      ...search(entries, query).map((group) => ({
        title: group.title,
        items: group.entries.map((entry) => this.itemFor(entry)),
      })),
      ...(actions.length ? [{ title: 'Actions', items: actions }] : []),
    ];
  });

  protected readonly activeId = signal<string | null>(null);

  constructor() {
    this.keys.change.subscribe(() =>
      this.activeId.set(this.keys.activeItem?.item().id ?? null),
    );
    // New results start with the first one highlighted, once rendered.
    afterRenderEffect(() => {
      this.options();
      untracked(() => {
        if (this.options().length) this.keys.setFirstItemActive();
        else this.activeId.set(null);
      });
    });
    afterRenderEffect(() => {
      if (!this.open()) return;
      // In the browser; the platform's shortcut is known only here.
      untracked(() => {
        if (/Mac|iPhone|iPad/.test(navigator.platform)) this.shortcut.set('⌘K');
        if (!this.entries()) {
          void import('virtual:ndop/search-index').then((module) =>
            this.entries.set(module.entries),
          );
        }
      });
    });
  }

  /**
   * Opens or closes the palette on ⌘K or Ctrl+K, from anywhere.
   *
   * @param event - A key press on the page.
   */
  protected onGlobalKeydown(event: KeyboardEvent): void {
    if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.open.update((open) => !open);
    }
  }

  /**
   * Moves the highlight with the arrow keys and runs the highlighted
   * choice on Enter; other keys edit the query.
   *
   * @param event - A key press in the search field.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      const item = this.keys.activeItem?.item();
      if (item) {
        event.preventDefault();
        void this.choose(item);
      }
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      this.keys.onKeydown(event);
      this.document.getElementById(this.activeId() ?? '')?.scrollIntoView({
        block: 'nearest',
      });
    }
  }

  /**
   * Highlights the option under the pointer.
   *
   * @param item - Its choice.
   */
  protected highlight(item: PaletteItem): void {
    const option = this.options().find((entry) => entry.item() === item);
    if (option && option !== this.keys.activeItem)
      this.keys.setActiveItem(option);
  }

  /**
   * Runs a choice and closes the palette.
   *
   * @param item - The choice.
   */
  protected async choose(item: PaletteItem): Promise<void> {
    this.open.set(false);
    this.query.set('');
    await item.run();
  }

  /**
   * The value of the field an event came from.
   *
   * @param event - An input event.
   * @returns Its value.
   */
  protected text(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  /**
   * A choice that opens an index entry.
   *
   * @param entry - The entry.
   * @returns The choice.
   */
  private itemFor(entry: SearchEntry): PaletteItem {
    return {
      id: `result-${entry.url.replace(/[^\w-]/g, '-')}-${entry.kind}-${entry.title.replace(/[^\w-]/g, '-')}`,
      title: entry.title,
      context: entry.context,
      run: () => {
        void this.router.navigateByUrl(entry.url);
      },
    };
  }

  /**
   * Copies the current docs page's Markdown twin; elsewhere there is none.
   */
  private async copyPage(): Promise<void> {
    const path = this.path();
    if (!path.startsWith('/docs/')) {
      this.announcement.set('This page has no Markdown version');
      return;
    }
    this.announcement.set(
      (await copyPageMarkdown(path))
        ? 'Copied the page as Markdown'
        : "Couldn't copy the page",
    );
  }

  /**
   * Copies `ndop add` for a component, for the reader's package manager.
   *
   * @param name - The component.
   */
  private async copyInstall(name: string): Promise<void> {
    const command = commandFor(
      (savedPackageManager() ?? 'npm') as PackageManager,
      `npx ndop add ${name}`,
    );
    try {
      await navigator.clipboard.writeText(command);
      this.announcement.set(`Copied ${command}`);
    } catch {
      this.announcement.set("Couldn't copy the command");
    }
  }
}
