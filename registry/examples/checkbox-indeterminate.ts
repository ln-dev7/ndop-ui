import { Component, computed, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Checkbox, CheckboxIndicator } from '@/ui/checkbox/checkbox';
import { Label } from '@/ui/label/label';

/**
 * A select-all checkbox: checked when every item is, mixed when some are,
 * and checking or clearing them all when activated.
 */
@Component({
  selector: 'example-checkbox-indeterminate',
  imports: [Checkbox, CheckboxIndicator, Label, NdIcon],
  template: `
    <fieldset class="flex flex-col gap-3">
      <legend class="sr-only">Email me about</legend>
      <div class="flex items-center gap-3">
        <button
          ndCheckbox
          id="checkbox-indeterminate-all"
          [checked]="allChecked()"
          [indeterminate]="someChecked()"
          (checkedChange)="setAll($event)"
        >
          <span ndCheckboxIndicator>
            <svg [ndIcon]="someChecked() ? 'minus' : 'check'"></svg>
          </span>
        </button>
        <label ndLabel for="checkbox-indeterminate-all">All updates</label>
      </div>
      @for (topic of topics(); track topic.id) {
        <div class="flex items-center gap-3 ps-7">
          <button
            ndCheckbox
            [id]="'checkbox-indeterminate-' + topic.id"
            [checked]="topic.checked"
            (checkedChange)="set(topic.id, $event)"
          >
            <span ndCheckboxIndicator><svg ndIcon="check"></svg></span>
          </button>
          <label ndLabel [for]="'checkbox-indeterminate-' + topic.id">
            {{ topic.label }}
          </label>
        </div>
      }
    </fieldset>
  `,
})
export class CheckboxIndeterminateExample {
  protected readonly topics = signal([
    { id: 'product', label: 'Product news', checked: true },
    { id: 'events', label: 'Events near me', checked: false },
    { id: 'tips', label: 'Tips and tutorials', checked: false },
  ]);

  protected readonly allChecked = computed(() =>
    this.topics().every((topic) => topic.checked),
  );

  protected readonly someChecked = computed(
    () => !this.allChecked() && this.topics().some((topic) => topic.checked),
  );

  /**
   * Checks or clears one topic.
   *
   * @param id - The topic.
   * @param checked - Its new state.
   */
  protected set(id: string, checked: boolean): void {
    this.topics.update((topics) =>
      topics.map((topic) => (topic.id === id ? { ...topic, checked } : topic)),
    );
  }

  /**
   * Checks or clears every topic.
   *
   * @param checked - The new state.
   */
  protected setAll(checked: boolean): void {
    this.topics.update((topics) =>
      topics.map((topic) => ({ ...topic, checked })),
    );
  }
}
