import { Directive } from '@angular/core';
import { Chip } from '@/ui/chip/chip';

/** A row of chips. */
@Directive({
  selector: '[ndChipGroup]',
  host: { 'data-slot': 'chip-group', class: 'flex flex-wrap gap-3' },
})
export class ChipGroup {
  /** The chip directive, for templates that list it. */
  static readonly chip = Chip;
}
