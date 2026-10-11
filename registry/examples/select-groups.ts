import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/ui/select/select';

/** A long list of time zones in labelled groups, which scrolls. */
@Component({
  selector: 'example-select-groups',
  imports: [
    NdIcon,
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectItemIndicator,
    SelectItemText,
    SelectLabel,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
  ],
  template: `
    <ng-container ndSelect>
      <button ndSelectTrigger aria-label="Time zone" class="w-[280px]">
        <span ndSelectValue placeholder="Select a time zone"></span>
        <svg ndIcon="chevron-down" class="size-4 opacity-50"></svg>
      </button>
      <div ndSelectContent>
        @for (region of regions; track region.name; let last = $last) {
          <div ndSelectGroup [attr.aria-labelledby]="'select-groups-' + $index">
            <div ndSelectLabel [id]="'select-groups-' + $index">
              {{ region.name }}
            </div>
            @for (zone of region.zones; track zone.value) {
              <div ndSelectItem [value]="zone.value">
                <span ndSelectItemIndicator><svg ndIcon="check"></svg></span>
                <span ndSelectItemText>{{ zone.label }}</span>
              </div>
            }
          </div>
          @if (!last) {
            <div ndSelectSeparator></div>
          }
        }
      </div>
    </ng-container>
  `,
})
export class SelectGroupsExample {
  protected readonly regions = [
    {
      name: 'North America',
      zones: [
        { value: 'est', label: 'Eastern Standard Time (EST)' },
        { value: 'cst', label: 'Central Standard Time (CST)' },
        { value: 'mst', label: 'Mountain Standard Time (MST)' },
        { value: 'pst', label: 'Pacific Standard Time (PST)' },
      ],
    },
    {
      name: 'Europe and Africa',
      zones: [
        { value: 'gmt', label: 'Greenwich Mean Time (GMT)' },
        { value: 'cet', label: 'Central European Time (CET)' },
        { value: 'wat', label: 'West Africa Time (WAT)' },
        { value: 'eat', label: 'East Africa Time (EAT)' },
      ],
    },
    {
      name: 'Asia',
      zones: [
        { value: 'ist', label: 'India Standard Time (IST)' },
        { value: 'cst-china', label: 'China Standard Time (CST)' },
        { value: 'jst', label: 'Japan Standard Time (JST)' },
      ],
    },
  ];
}
