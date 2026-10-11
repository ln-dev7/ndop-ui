import { booleanAttribute, computed, Directive, input } from '@angular/core';
import { buttonVariants } from '@/ui/button/button';
import { cn } from '@/lib/utils';

/**
 * The button of a date picker: an outline button that shows the chosen
 * date, or a muted placeholder while `empty`. Put it on the trigger of a
 * Popover whose content holds a Calendar; opening focuses the chosen day.
 *
 * @example
 * ```html
 * <ng-container ndPopover>
 *   <button ndPopoverTrigger ndDatePickerTrigger [empty]="!date()">
 *     <svg ndIcon="calendar"></svg>
 *     {{ date() ? (date() | date: 'longDate') : 'Pick a date' }}
 *   </button>
 *   <ng-template ndPopoverPortal>
 *     <div ndPopoverContent align="start" class="w-auto p-0">…</div>
 *   </ng-template>
 * </ng-container>
 * ```
 */
@Directive({
  selector: 'button[ndDatePickerTrigger]',
  host: {
    type: 'button',
    'data-slot': 'date-picker-trigger',
    '[attr.data-empty]': 'empty()',
    '[class]': 'classes()',
  },
})
export class DatePickerTrigger {
  /** Whether no date is chosen yet, which mutes the placeholder text. */
  readonly empty = input(false, { transform: booleanAttribute });

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      buttonVariants({ variant: 'outline' }),
      'w-[240px] justify-start text-start font-normal data-[empty=true]:text-muted-foreground',
      this.class(),
    ),
  );
}
