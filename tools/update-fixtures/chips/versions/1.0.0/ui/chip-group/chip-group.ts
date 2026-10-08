import { Directive } from '@angular/core';

/** A row of chips. */
@Directive({
  selector: '[ndChipGroup]',
  host: { 'data-slot': 'chip-group', class: 'flex flex-wrap gap-2' },
})
export class ChipGroup {}
