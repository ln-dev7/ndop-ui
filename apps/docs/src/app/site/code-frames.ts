import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterEveryRender,
  Directive,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';

/** Where the reader's package manager choice is saved. */
const STORAGE_KEY = 'ndop-pm';

/**
 * Makes the build-time code blocks inside an element interactive, through
 * delegated listeners:
 *
 * - "Expand" buttons show the whole of a collapsed file;
 * - copy buttons copy the visible code (in a command block, the selected
 *   package manager's command) and show a check for two seconds; the
 *   result, or a refused copy, is announced to screen readers;
 * - package manager tabs (WAI-ARIA tabs pattern, automatic activation)
 *   switch every command block on the page at once, and the choice is
 *   saved and applied to blocks rendered later.
 */
@Directive({
  selector: '[docsCodeFrames]',
  exportAs: 'docsCodeFrames',
  host: {
    '(click)': 'onClick($event)',
    '(keydown)': 'onKeydown($event)',
  },
})
export class CodeFrames {
  /** Text announced after a copy, read by a live region in the page. */
  readonly announcement = signal('');

  private readonly document = inject(DOCUMENT);
  private manager: string | null = null;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      this.manager = this.read();
    }
    // Blocks arrive with each page's HTML; bring new ones in line with the
    // saved choice once they are in the DOM.
    afterEveryRender(() => {
      if (this.manager) this.select(this.manager, false);
    });
  }

  /**
   * Handles clicks on copy buttons and package manager tabs.
   *
   * @param event - A click inside the host.
   */
  protected async onClick(event: Event): Promise<void> {
    const target = event.target as Element | null;
    const tab = target?.closest<HTMLElement>('[role="tab"][data-pm]');
    if (tab?.dataset['pm']) {
      this.choose(tab.dataset['pm']);
      return;
    }
    const expand = target?.closest<HTMLElement>('[data-code-expand]');
    if (expand) {
      this.toggle(expand.closest('figure'));
      return;
    }
    const copy = target?.closest<HTMLElement>('[data-code-copy]');
    if (!copy) return;
    const frame = copy.closest('figure');
    const pre =
      frame?.querySelector('[role="tabpanel"]:not([hidden]) pre') ??
      frame?.querySelector('pre');
    await this.copy(pre?.textContent?.trim() ?? '', copy);
  }

  /**
   * Expands a collapsed file, or collapses it again.
   *
   * @param frame - The code block.
   */
  private toggle(frame: HTMLElement | null): void {
    if (!frame) return;
    const expanded = !frame.hasAttribute('data-expanded');
    frame.toggleAttribute('data-expanded', expanded);
    const header = frame.querySelector('.code-frame-expand');
    header?.setAttribute('aria-expanded', String(expanded));
    if (header) header.textContent = expanded ? 'Collapse' : 'Expand';
    // Collapsing from the end of a long file would leave the reader far
    // below it.
    if (!expanded) frame.scrollIntoView({ block: 'nearest' });
  }

  /**
   * Copies text, announces the result, and marks the button that asked
   * with `data-copied` for two seconds.
   *
   * @param text - Text to copy.
   * @param button - The button that asked.
   * @returns Whether the browser accepted it.
   */
  async copy(text: string, button: HTMLElement): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // The browser refused, for example in an embedded frame; say so
      // instead of pretending.
      this.announcement.set("Couldn't copy; select the code instead");
      return false;
    }
    button.setAttribute('data-copied', '');
    this.announcement.set('Copied to the clipboard');
    setTimeout(() => {
      button.removeAttribute('data-copied');
      this.announcement.set('');
    }, 2000);
    return true;
  }

  /**
   * The reader's package manager, as chosen in a command block.
   *
   * @returns It, or `npm` when none was chosen.
   */
  packageManager(): string {
    return this.manager ?? 'npm';
  }

  /**
   * Moves between package manager tabs with the arrow keys, Home and End,
   * selecting as focus moves. Arrows follow the reading direction.
   *
   * @param event - A key press inside the host.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const tab = (event.target as Element | null)?.closest<HTMLElement>(
      '[role="tab"]',
    );
    const list = tab?.closest('[role="tablist"]');
    if (!tab || !list) return;
    const tabs = [...list.querySelectorAll<HTMLElement>('[role="tab"]')];
    const index = tabs.indexOf(tab);
    const rtl = getComputedStyle(list).direction === 'rtl';
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[
      event.key
    ];
    const next =
      event.key === 'Home'
        ? tabs[0]
        : event.key === 'End'
          ? tabs[tabs.length - 1]
          : step
            ? tabs[(index + step + tabs.length) % tabs.length]
            : undefined;
    if (!next?.dataset['pm']) return;
    event.preventDefault();
    this.choose(next.dataset['pm']);
    next.focus();
  }

  /**
   * Selects a package manager everywhere and saves it.
   *
   * @param manager - Such as `pnpm`.
   */
  private choose(manager: string): void {
    this.manager = manager;
    this.select(manager, true);
    try {
      localStorage.setItem(STORAGE_KEY, manager);
    } catch {
      // Storage is unavailable; the choice applies to this page only.
    }
  }

  /**
   * Shows one package manager's command in every command block.
   *
   * @param manager - Such as `pnpm`.
   * @param force - Update blocks even when they already look selected.
   */
  private select(manager: string, force: boolean): void {
    for (const list of this.document.querySelectorAll<HTMLElement>(
      '.code-frame-tabs',
    )) {
      const current = list
        .querySelector('[aria-selected="true"]')
        ?.getAttribute('data-pm');
      if (!force && current === manager) continue;
      const frame = list.closest('figure');
      for (const tab of list.querySelectorAll<HTMLElement>('[role="tab"]')) {
        const selected = tab.dataset['pm'] === manager;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
      }
      for (const panel of frame?.querySelectorAll<HTMLElement>(
        '[role="tabpanel"]',
      ) ?? []) {
        panel.hidden = panel.dataset['pm'] !== manager;
      }
    }
  }

  /**
   * The saved package manager.
   *
   * @returns It, or `null` when none is saved or storage is unavailable.
   */
  private read(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }
}
