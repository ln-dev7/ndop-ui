import {
  Component,
  computed,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import { Button } from '@/ui/button/button';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';
import { snapshots } from 'virtual:ndop/components';
import { previewUpdate, type PreviewResult } from './update-preview-merge';

/** A preview that merged. */
type Merged = Exclude<PreviewResult, { error: string }>;

/** Classes of the select and textarea, matching `ndInput`. */
const FIELD =
  'w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30';

/**
 * The changelog page's update preview (ADR-0020): paste your copy of a
 * component's file, pick the version you installed, and see what
 * `ndop update` to the latest version would make of it, merged in the
 * browser with `@ndop/merge`. Nothing is uploaded. The version files and
 * the merge load when the preview first runs.
 */
@Component({
  selector: 'docs-update-preview',
  imports: [Button, Input, Label],
  template: `
    @if (older().length === 0) {
      <p class="text-sm text-muted-foreground">
        {{ title() }} has one version so far, so there's nothing to update yet.
      </p>
    } @else {
      <form
        class="grid gap-4 rounded-xl border p-5"
        (submit)="run($event, installedField.value, localField.value)"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="grid gap-2">
            <label ndLabel for="preview-installed">Version you installed</label>
            <select
              #installedField
              id="preview-installed"
              [class]="field"
              (change)="installed.set(value($event))"
            >
              @for (version of older(); track version) {
                <option [value]="version" [selected]="version === installed()">
                  {{ version }}
                </option>
              }
            </select>
          </div>
          @if (files().length > 1) {
            <div class="grid gap-2">
              <label ndLabel for="preview-file">File</label>
              <select
                id="preview-file"
                [class]="field"
                (change)="target.set(value($event))"
              >
                @for (file of files(); track file) {
                  <option [value]="file" [selected]="file === target()">
                    {{ file }}
                  </option>
                }
              </select>
            </div>
          }
        </div>
        <div class="grid gap-2">
          <label ndLabel for="preview-local"
            >Your copy of <code class="inline-code">{{ target() }}</code></label
          >
          <textarea
            #localField
            id="preview-local"
            rows="10"
            spellcheck="false"
            autocomplete="off"
            [class]="field + ' font-mono text-xs leading-5'"
          ></textarea>
        </div>
        <label class="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            class="size-4 accent-primary"
            [checked]="formatDifferently()"
            (change)="formatDifferently.set(checked($event))"
          />
          My project formats differently
        </label>
        @if (formatDifferently()) {
          <div class="grid gap-4 sm:grid-cols-2">
            <fieldset class="grid gap-2">
              <legend class="mb-2 text-sm font-medium">Quotes</legend>
              <div class="flex gap-4 text-sm">
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    name="preview-quotes"
                    class="accent-primary"
                    [checked]="singleQuote()"
                    (change)="singleQuote.set(true)"
                  />
                  Single
                </label>
                <label class="flex items-center gap-2">
                  <input
                    type="radio"
                    name="preview-quotes"
                    class="accent-primary"
                    [checked]="!singleQuote()"
                    (change)="singleQuote.set(false)"
                  />
                  Double
                </label>
              </div>
            </fieldset>
            <div class="grid gap-2">
              <label ndLabel for="preview-width">Print width</label>
              <input
                ndInput
                id="preview-width"
                type="number"
                min="40"
                max="200"
                [value]="printWidth()"
                (input)="printWidth.set(number($event))"
              />
            </div>
          </div>
        }
        <p class="text-xs text-muted-foreground">
          Runs in your browser; your file isn't uploaded. If your
          <code class="inline-code">ndop.json</code> aliases differ from the
          registry's <code class="inline-code">&#64;/</code>, import paths can
          show up as changes.
        </p>
        <div>
          <button ndButton type="submit" [disabled]="running()">
            {{ running() ? 'Merging…' : 'Preview the update to ' + latest() }}
          </button>
        </div>
      </form>

      <div aria-live="polite" class="mt-6 grid gap-4">
        @if (result(); as outcome) {
          @if ('error' in outcome) {
            <p class="text-sm">{{ outcome.error }}</p>
          } @else {
            <p class="text-sm">{{ summary(outcome) }}</p>
            @if (outcome.changes.length > 0) {
              <div class="overflow-hidden rounded-xl border">
                <div
                  class="flex items-center justify-between border-b px-4 py-2 text-sm"
                >
                  <span class="font-medium">Your file after the update</span>
                  <button
                    ndButton
                    type="button"
                    variant="outline"
                    size="sm"
                    (click)="copy(outcome.content)"
                  >
                    Copy
                  </button>
                </div>
                <pre
                  class="max-h-[480px] overflow-auto py-3 font-mono text-xs leading-5"
                  tabindex="0"
                  aria-label="Your file after the update"
                ><code>@for (line of merged(); track $index) {<span [class]="line.classes">{{ line.text || ' ' }}</span>}</code></pre>
              </div>
              <div class="overflow-hidden rounded-xl border">
                <div class="border-b px-4 py-2 text-sm font-medium">
                  What changes in your file
                </div>
                <pre
                  class="max-h-[360px] overflow-auto py-3 font-mono text-xs leading-5"
                  tabindex="0"
                  aria-label="What changes in your file"
                ><code>@for (change of outcome.changes; track $index) {<span class="block px-4 text-muted-foreground">{{ '@@ line ' + change.line }}</span>@for (line of change.removed; track $index) {<span class="block bg-[oklch(0.95_0.04_25)] px-4 dark:bg-[oklch(0.3_0.06_25)]">{{ '-' + line }}</span>}@for (line of change.added; track $index) {<span class="block bg-[oklch(0.95_0.05_150)] px-4 dark:bg-[oklch(0.3_0.06_150)]">{{ '+' + line }}</span>}}</code></pre>
              </div>
            }
            <p class="sr-only">{{ copied() }}</p>
          }
        }
      </div>
    }
  `,
})
export class UpdatePreview {
  /** Registry item name. */
  readonly name = input.required<string>();
  /** Display name. */
  readonly title = input.required<string>();
  /** Newest version, the one the preview updates to. */
  readonly latest = input.required<string>();
  /** Every version, newest first. */
  readonly versions = input.required<string[]>();
  /** Targets of the newest version's files. */
  readonly files = input.required<string[]>();

  protected readonly field = FIELD;
  /** Versions a user can update from, newest first. */
  protected readonly older = computed(() =>
    this.versions().filter((version) => version !== this.latest()),
  );
  protected readonly installed = linkedSignal(() => this.older()[0] ?? '');
  protected readonly target = linkedSignal(() => this.files()[0] ?? '');
  protected readonly formatDifferently = signal(false);
  protected readonly singleQuote = signal(true);
  protected readonly printWidth = signal(80);
  protected readonly running = signal(false);
  protected readonly result = signal<PreviewResult | undefined>(undefined);
  protected readonly copied = signal('');

  /**
   * The merged file's lines, with conflict markers and the lines between
   * them marked.
   */
  protected readonly merged = computed(() => {
    const outcome = this.result();
    if (!outcome || 'error' in outcome) return [];
    let inConflict = false;
    return outcome.content
      .replace(/\n$/, '')
      .split('\n')
      .map((text) => {
        const marker = /^(<{7} |={7}$|>{7} )/.test(text);
        if (text.startsWith('<<<<<<< ')) inConflict = true;
        const classes = marker
          ? 'block px-4 bg-destructive/15 font-semibold text-destructive'
          : inConflict
            ? 'block px-4 bg-destructive/5'
            : 'block px-4';
        if (text.startsWith('>>>>>>> ')) inConflict = false;
        return { text, classes };
      });
  });

  /**
   * Merges the pasted file and shows the outcome. The fields are read as
   * submitted, not from signals, so text pasted before the page was
   * interactive counts too.
   *
   * @param event - The form's submit event.
   * @param installed - The selected installed version.
   * @param local - The pasted file.
   */
  protected async run(
    event: Event,
    installed: string,
    local: string,
  ): Promise<void> {
    event.preventDefault();
    this.installed.set(installed);
    this.running.set(true);
    try {
      const load = snapshots[this.name()];
      if (!load) {
        this.result.set({ error: 'This component has no versions to merge.' });
        return;
      }
      this.result.set(
        await previewUpdate({
          snapshots: (await load()).default,
          installed,
          latest: this.latest(),
          target: this.target(),
          local,
          ...(this.formatDifferently()
            ? {
                format: {
                  singleQuote: this.singleQuote(),
                  printWidth: this.printWidth(),
                },
              }
            : {}),
        }),
      );
    } finally {
      this.running.set(false);
    }
  }

  /**
   * One sentence on what `ndop update` would do.
   *
   * @param outcome - The merge.
   * @returns The sentence.
   */
  protected summary(outcome: Merged): string {
    switch (outcome.status) {
      case 'replaced':
        return `You haven't edited this file, so ndop update replaces it with ${this.latest()}.`;
      case 'unchanged':
        return 'Nothing changes: your file already has everything this update brings.';
      case 'merged':
        return `Upstream's changes merge cleanly with your edits.`;
      default: {
        const count = outcome.conflictLines.length;
        return `${count} conflict${count === 1 ? '' : 's'}, at line ${outcome.conflictLines.join(', ')}. ndop update writes the markers below; keep what you want, then run ndop update --continue.`;
      }
    }
  }

  /**
   * Copies the merged file to the clipboard.
   *
   * @param text - The file.
   */
  protected async copy(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.copied.set('Copied to the clipboard');
    } catch {
      this.copied.set("Couldn't copy; select the text instead");
    }
  }

  /**
   * The value of the form control an event came from.
   *
   * @param event - An `input` or `change` event.
   * @returns Its value.
   */
  protected value(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  /**
   * Whether the checkbox an event came from is checked.
   *
   * @param event - A `change` event.
   * @returns Its state.
   */
  protected checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  /**
   * The number in the field an event came from, within Prettier's range.
   *
   * @param event - An `input` event.
   * @returns The print width.
   */
  protected number(event: Event): number {
    const value = Number((event.target as HTMLInputElement).value);
    return Number.isFinite(value) ? Math.min(200, Math.max(40, value)) : 80;
  }
}
