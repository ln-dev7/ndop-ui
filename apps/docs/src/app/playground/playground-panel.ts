import { DOCUMENT, Location, NgComponentOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Input } from '@/ui/input/input';
import type { PartData, TemplatePalette } from '../components/component-data';
import { TrustHtmlPipe } from '../components/trust-html.pipe';
import {
  controlsFor,
  defaultValues,
  queryFromValues,
  snippetFor,
  tokenizeTemplate,
  valuesFromQuery,
  type PlaygroundHost,
  type PlaygroundValue,
  type PlaygroundValues,
  type TemplateToken,
} from './playground';

/**
 * A component page's playground (RFC-0001, ADR-0016): controls generated
 * from the part's metadata, the part rendered live with their values, and
 * the snippet for the same values below. Changed values are kept in the
 * URL's query, so a configuration can be linked.
 */
@Component({
  selector: 'docs-playground',
  imports: [NgComponentOutlet, NdIcon, Input, TrustHtmlPipe],
  host: { class: 'block' },
  template: `
    <div class="overflow-hidden rounded-xl border">
      <div
        class="preview-backdrop flex min-h-[280px] items-center justify-center bg-background p-10 text-foreground"
      >
        <ng-container
          *ngComponentOutlet="host().component; inputs: { values: values() }"
        />
      </div>
      <form
        class="grid gap-x-8 gap-y-5 border-t p-5 sm:grid-cols-2"
        [attr.aria-label]="part().name + ' inputs'"
        (submit)="$event.preventDefault()"
      >
        @for (control of controls(); track control.name) {
          @switch (control.kind) {
            @case ('enum') {
              <fieldset class="min-w-0 sm:col-span-2">
                <legend class="playground-label">{{ control.name }}</legend>
                <div class="mt-2 flex flex-wrap gap-1 rounded-lg bg-muted p-1">
                  @for (option of control.options; track option) {
                    <label class="playground-segment">
                      <input
                        type="radio"
                        class="peer sr-only"
                        [name]="control.name"
                        [value]="option"
                        [checked]="values()[control.name] === option"
                        (change)="set(control.name, option)"
                      />
                      <span>{{ option }}</span>
                    </label>
                  }
                </div>
              </fieldset>
            }
            @case ('boolean') {
              <label class="flex items-center justify-between gap-4">
                <span class="playground-label">{{ control.name }}</span>
                <input
                  type="checkbox"
                  role="switch"
                  class="playground-switch"
                  [checked]="values()[control.name] === true"
                  (change)="set(control.name, checked($event))"
                />
              </label>
            }
            @case ('string') {
              <label class="grid gap-2">
                <span class="playground-label">{{ control.name }}</span>
                <input
                  ndInput
                  [value]="values()[control.name]"
                  (input)="set(control.name, text($event))"
                />
              </label>
            }
            @case ('number') {
              <!-- An output is labelable too, so the label names the
                   slider explicitly. -->
              <div class="grid gap-2">
                <span class="flex justify-between">
                  <label
                    class="playground-label"
                    [for]="'playground-' + control.name"
                    >{{ control.name }}</label
                  >
                  <output
                    class="font-mono text-xs text-muted-foreground"
                    [attr.for]="'playground-' + control.name"
                    >{{ values()[control.name] }}</output
                  >
                </span>
                <input
                  type="range"
                  class="accent-primary"
                  [id]="'playground-' + control.name"
                  [min]="control.min"
                  [max]="control.max"
                  [step]="control.step"
                  [value]="values()[control.name]"
                  (input)="set(control.name, +text($event))"
                />
              </div>
            }
          }
        }
      </form>
      <figure
        class="code-frame code-frame-attached"
        [class.code-frame-numbered]="lines().length > 1"
        data-language="angular-html"
      >
        <button
          type="button"
          class="code-frame-copy"
          data-code-copy
          aria-label="Copy code"
        >
          <svg ndIcon="copy" class="code-frame-icon-copy"></svg>
          <svg ndIcon="check" class="code-frame-icon-check"></svg>
        </button>
        <pre
          class="shiki"
          tabindex="0"
        ><code>@for (line of lines(); track $index) {<span class="line">@for (token of line; track $index) {<span [attr.style]="palette()[token.kind]">{{ token.text }}</span>}</span>{{ $last ? '' : '\\n' }}}</code></pre>
      </figure>
    </div>
  `,
})
export class PlaygroundPanel {
  /** The item's playground. */
  readonly host = input.required<PlaygroundHost>();
  /** The part it exposes, from the page's API reference. */
  readonly part = input.required<PartData>();
  /** Shiki's colors for templates, for the snippet. */
  readonly palette = input.required<TemplatePalette>();

  protected readonly controls = computed(() =>
    controlsFor(this.part(), this.host()),
  );
  protected readonly values = linkedSignal<PlaygroundValues>(() =>
    defaultValues(this.controls()),
  );
  protected readonly lines = computed(() =>
    linesOf(
      tokenizeTemplate(snippetFor(this.host(), this.controls(), this.values())),
    ),
  );

  private readonly location = inject(Location);
  private readonly document = inject(DOCUMENT);

  constructor() {
    // After hydration, which renders the defaults the page was
    // prerendered with; the link's values then apply.
    afterNextRender(() => {
      const query = new URLSearchParams(this.document.location.search);
      this.values.set(valuesFromQuery(this.controls(), query));
    });
  }

  /**
   * Changes a value and records the changed values in the URL, replacing
   * the history entry, so Back still leaves the page.
   *
   * @param name - The input.
   * @param value - Its new value.
   */
  protected set(name: string, value: PlaygroundValue): void {
    this.values.update((values) => ({ ...values, [name]: value }));
    const query = queryFromValues(this.controls(), this.values()).toString();
    this.location.replaceState(this.document.location.pathname, query);
  }

  /**
   * Whether the checkbox an event came from is checked.
   *
   * @param event - A change event.
   * @returns Its state.
   */
  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
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
}

/**
 * Splits tokens into lines, for the code frame's line numbers.
 *
 * @param tokens - The snippet's tokens.
 * @returns One list of tokens per line.
 */
function linesOf(tokens: readonly TemplateToken[]): TemplateToken[][] {
  const lines: TemplateToken[][] = [[]];
  for (const token of tokens) {
    token.text.split('\n').forEach((text, index) => {
      if (index > 0) lines.push([]);
      if (text) lines.at(-1)?.push({ text, kind: token.kind });
    });
  }
  return lines;
}
