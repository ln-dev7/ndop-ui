import { Component, computed, input } from '@angular/core';
import type { ThemeVars } from '@ndop/schema/theme';
import { Badge } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';
import { Switch, SwitchThumb } from '@/ui/switch/switch';
import type { ThemeMode } from './studio-theme';

/** The chart tokens, for the swatch row. */
const CHARTS = ['chart-1', 'chart-2', 'chart-3', 'chart-4', 'chart-5'];

/**
 * A theme on a few registry components (ADR-0023), in one mode: a card
 * with a field, a switch, a badge, buttons and the chart colors. The
 * theme's values are custom properties on the sample itself, so it shows
 * any theme inside any page; dark mode is the `.dark` class on it, which
 * the `dark:` variant matches. Fonts stay the site's: the gallery doesn't
 * load theme fonts, only the studio does.
 */
@Component({
  selector: 'docs-theme-sample',
  imports: [
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    Input,
    Label,
    Switch,
    SwitchThumb,
  ],
  host: {
    class: 'block rounded-xl border bg-background p-4 text-foreground',
    '[class.dark]': "mode() === 'dark'",
    '[style]': 'tokens()',
    '[attr.data-mode]': 'mode()',
  },
  template: `
    <div ndCard class="gap-4 py-4">
      <div ndCardHeader class="px-4">
        <h3 ndCardTitle>Team plan</h3>
        <p ndCardDescription>Invite people and share projects.</p>
      </div>
      <div ndCardContent class="grid gap-4 px-4">
        <div class="grid gap-2">
          <label ndLabel [for]="id('email')">Email</label>
          <input
            ndInput
            type="email"
            [id]="id('email')"
            value="ada@example.com"
          />
        </div>
        <div class="flex items-center gap-2">
          <button ndSwitch [id]="id('notify')" [defaultChecked]="true">
            <span ndSwitchThumb></span>
          </button>
          <label ndLabel [for]="id('notify')">Email updates</label>
          <span ndBadge variant="secondary" class="ms-auto">Pro</span>
        </div>
        <div class="flex gap-1" aria-hidden="true">
          @for (chart of charts; track chart) {
            <span
              class="h-6 flex-1 rounded-sm"
              [style.background]="'var(--' + chart + ')'"
            ></span>
          }
        </div>
      </div>
      <div ndCardFooter class="gap-2 px-4">
        <button ndButton size="sm">Invite</button>
        <button ndButton size="sm" variant="outline">Cancel</button>
      </div>
    </div>
  `,
})
export class ThemeSample {
  /** The theme's name, for unique element ids. */
  readonly name = input.required<string>();
  /** The theme's values. */
  readonly vars = input.required<ThemeVars>();
  /** Which mode's colors to show. */
  readonly mode = input<ThemeMode>('light');

  protected readonly charts = CHARTS;

  protected readonly tokens = computed(() => {
    const vars = this.vars();
    // Dark values a theme leaves out fall back to light ones, as in CSS.
    const values =
      this.mode() === 'dark' ? { ...vars.light, ...vars.dark } : vars.light;
    return Object.fromEntries(
      Object.entries({ ...values, spacing: vars.theme['spacing'] })
        .filter(([, value]) => value !== undefined)
        .map(([token, value]) => [`--${token}`, value]),
    );
  });

  /**
   * An element id unique to this sample.
   *
   * @param part - What the element is.
   * @returns The id.
   */
  protected id(part: string): string {
    return `theme-${this.name()}-${this.mode()}-${part}`;
  }
}
