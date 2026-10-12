import { computed, Directive, input } from '@angular/core';
import { Button } from '@/ui/button/button';

/** How strongly a {@link Widget} stands out from the page. */
export type WidgetTone = 'default' | 'muted';

/**
 * Classes {@link Widget} applies to its host, by tone; also usable to style
 * another element like a widget.
 */
export const widgetClasses: Record<WidgetTone, string> = {
  default:
    'flex flex-col items-start gap-3 rounded-xl border bg-card p-4 text-card-foreground shadow-sm',
  muted:
    'flex flex-col items-start gap-3 rounded-xl border border-transparent bg-muted p-4 text-foreground',
};

/**
 * A card-like panel for one piece of a dashboard: a heading, a line or two
 * of text and an action, stacked. It only styles its host, so the host
 * keeps its own semantics: a `section` labelled by its heading, an `li` in
 * a list of widgets.
 *
 * Its action is a {@link WidgetAction}.
 *
 * @example
 * ```html
 * <section sampleWidget aria-labelledby="usage">
 *   <h2 id="usage" class="font-medium">Usage</h2>
 *   <p class="text-sm text-muted-foreground">72% of your quota.</p>
 *   <button sampleWidgetAction size="sm">Upgrade</button>
 * </section>
 * ```
 */
@Directive({
  selector: '[sampleWidget]',
  host: {
    'data-slot': 'widget',
    '[attr.data-tone]': 'tone()',
    '[class]': 'classes()',
  },
})
export class Widget {
  /** How strongly it stands out: a card, or a muted panel. */
  readonly tone = input<WidgetTone>('default');

  /** Extra classes, added last. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    `${widgetClasses[this.tone()]} ${this.class()}`.trim(),
  );
}

/**
 * A widget's action: Ndop's Button, which `ndop add @sample/widget`
 * installs with the widget, with its `variant`, `size` and `class` inputs.
 *
 * @example
 * ```html
 * <button sampleWidgetAction variant="outline" size="sm">Upgrade</button>
 * ```
 */
@Directive({
  selector: 'button[sampleWidgetAction], a[sampleWidgetAction]',
  hostDirectives: [{ directive: Button, inputs: ['variant', 'size', 'class'] }],
})
export class WidgetAction {}
