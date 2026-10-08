import { Directive } from '@angular/core';

/** One chip in a {@link ChipGroup}. */
@Directive({ selector: '[ndChip]', host: { 'data-slot': 'chip' } })
export class Chip {}
