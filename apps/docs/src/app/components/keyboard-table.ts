import { Component, computed, input, signal } from '@angular/core';
import { StaticHtml } from '../site/static-html';

/** One row of a keyboard table. */
export interface KeyboardRow {
  /** Key combinations, such as `Shift + Tab`. */
  keys: string[];
  /** What they do, as HTML rendered at build time. */
  actionHtml: string;
}

/** Names `KeyboardEvent.key` gives that `spec.md` writes differently. */
const KEY_NAMES: Record<string, string> = { ' ': 'Space', Esc: 'Escape' };

/**
 * The keyboard table of a component page, from `spec.md`, with keycaps.
 * Its "Try the keyboard" mode marks the rows of the keys the reader
 * presses anywhere on the page, so they can try them on the preview above
 * and see which rule applies.
 */
@Component({
  selector: 'docs-keyboard-table',
  imports: [StaticHtml],
  template: `
    <div class="mb-3 flex items-center justify-between gap-4">
      <p class="text-sm text-muted-foreground">
        @if (trying()) {
          Press keys anywhere on the page, such as in the preview above.
        } @else {
          Keys the component handles.
        }
      </p>
      <button
        type="button"
        class="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none aria-pressed:bg-accent"
        [attr.aria-pressed]="trying()"
        (click)="trying.set(!trying())"
      >
        Try the keyboard
      </button>
    </div>
    <div class="overflow-x-auto rounded-lg border">
      <table class="w-full text-sm">
        <thead class="bg-muted/50 text-start">
          <tr>
            <th scope="col" class="w-40 px-4 py-2 text-start font-medium">
              Key
            </th>
            <th scope="col" class="px-4 py-2 text-start font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          @for (row of rows(); track $index) {
            <tr
              class="border-t transition-colors duration-150"
              [class.bg-accent]="row.keys.includes(pressed() ?? '')"
            >
              <td class="px-4 py-2.5 align-top">
                <span class="flex flex-wrap gap-1">
                  @for (combination of row.keys; track combination) {
                    @for (key of combination.split(' + '); track key) {
                      @if (!$first) {
                        <span aria-hidden="true" class="text-muted-foreground"
                          >+</span
                        >
                      }
                      <kbd
                        class="inline-flex h-6 min-w-6 items-center justify-center rounded border bg-muted px-1.5 font-mono text-xs shadow-[0_1px_0_var(--color-border)] data-active:border-foreground data-active:bg-foreground data-active:text-background"
                        [attr.data-active]="
                          pressed() === combination ? '' : null
                        "
                        >{{ key }}</kbd
                      >
                    }
                    @if (!$last) {
                      <span class="sr-only">or</span>
                    }
                  }
                </span>
              </td>
              <td
                class="px-4 py-2.5 text-muted-foreground"
                [docsHtml]="row.actionHtml"
              ></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
    <p aria-live="polite" class="sr-only">{{ announcement() }}</p>
  `,
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class KeyboardTable {
  /** The rows, in `spec.md` order. */
  readonly rows = input.required<KeyboardRow[]>();

  protected readonly trying = signal(false);
  protected readonly pressed = signal<string | null>(null);
  private timer: ReturnType<typeof setTimeout> | undefined;

  protected readonly announcement = computed(() => {
    const pressed = this.pressed();
    const row = this.rows().find((entry) => entry.keys.includes(pressed ?? ''));
    if (!pressed || !row) return '';
    // Only set by key presses, so this runs in the browser.
    const text = new DOMParser().parseFromString(row.actionHtml, 'text/html')
      .body.textContent;
    return `${pressed}: ${text}`;
  });

  /**
   * Marks the row of the key just pressed, while the mode is on. The key
   * still does its usual work.
   *
   * @param event - A key press anywhere on the page.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (
      !this.trying() ||
      ['Shift', 'Control', 'Alt', 'Meta'].includes(event.key)
    ) {
      return;
    }
    const key = KEY_NAMES[event.key] ?? event.key;
    this.pressed.set(event.shiftKey ? `Shift + ${key}` : key);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.pressed.set(null), 1500);
  }
}
