import { Component, computed, model } from '@angular/core';
import { themes } from 'virtual:ndop/themes';
import { RadioGroup, RadioGroupItem } from '@/ui/radio-group/radio-group';
import { demoTokens } from './demo-theme';

/** A theme as the picker offers it. */
export interface PickerTheme {
  /** Registry item name, such as `indigo`. */
  name: string;
  /** Display name, without the gallery's "theme" suffix. */
  title: string;
  /** Its tokens as custom properties; see {@link demoTokens}. */
  tokens: Record<string, string>;
}

/** Every theme in the gallery, in the registry's order. */
export const PICKER_THEMES: PickerTheme[] = themes.map((theme) => ({
  name: theme.name,
  // The gallery's titles end in "theme", which the picker's label says.
  title: theme.title.replace(/ theme$/i, ''),
  tokens: demoTokens(theme.vars),
}));

/**
 * The landing page's theme picker (ADR-0026, amendment 1): a radio group,
 * labelled "Theme", of round swatches in each theme's primary color, with
 * the picked theme's name beside it. The arrow keys move between themes
 * and pick them, as in any radio group. Swatches follow the site's light
 * and dark mode through `light-dark()`, so the host needs a
 * `color-scheme`.
 *
 * @example
 * ```html
 * <docs-theme-picker [(theme)]="theme" />
 * ```
 */
@Component({
  selector: 'docs-theme-picker',
  imports: [RadioGroup, RadioGroupItem],
  host: { class: 'flex h-7 items-center gap-3' },
  template: `
    <span id="theme-picker-label" class="text-sm font-medium">Theme</span>
    <div
      ndRadioGroup
      orientation="horizontal"
      aria-labelledby="theme-picker-label"
      class="flex gap-2"
      [value]="theme()"
      (valueChange)="pick($event)"
    >
      @for (option of options; track option.name) {
        <button
          ndRadioGroupItem
          [value]="option.name"
          [attr.aria-label]="option.title"
          class="size-5 border-foreground/10 shadow-none dark:bg-transparent data-[state=checked]:shadow-[0_0_0_2px_var(--background),0_0_0_3.5px_var(--foreground)]"
          [style.background]="option.tokens['--primary']"
        ></button>
      }
    </div>
    <span class="text-sm text-muted-foreground" aria-hidden="true">{{
      current()?.title
    }}</span>
  `,
})
export class ThemePicker {
  /** The picked theme's name. Two-way bindable. */
  readonly theme = model.required<string>();

  protected readonly options = PICKER_THEMES;

  protected readonly current = computed(
    () =>
      this.options.find((option) => option.name === this.theme()) ??
      this.options[0],
  );

  /**
   * Picks a theme.
   *
   * @param name - Its name, or `null`, which keeps the current one.
   */
  protected pick(name: string | null): void {
    if (name) this.theme.set(name);
  }
}
