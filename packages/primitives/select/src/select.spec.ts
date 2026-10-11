import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  NdSelect,
  NdSelectContent,
  NdSelectGroup,
  NdSelectItem,
  NdSelectItemIndicator,
  NdSelectItemText,
  NdSelectLabel,
  NdSelectSeparator,
  NdSelectTrigger,
  NdSelectValue,
} from './select';

const PARTS = [
  NdSelect,
  NdSelectTrigger,
  NdSelectValue,
  NdSelectContent,
  NdSelectGroup,
  NdSelectLabel,
  NdSelectItem,
  NdSelectItemText,
  NdSelectItemIndicator,
  NdSelectSeparator,
];

const FRUITS = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
];

@Component({
  imports: PARTS,
  template: `
    <label for="fruit">Fruit</label>
    <ng-container ndSelect [(value)]="value" [(open)]="open">
      <button ndSelectTrigger id="fruit">
        <span ndSelectValue placeholder="Pick a fruit"></span>
      </button>
      <div ndSelectContent>
        <div ndSelectGroup aria-labelledby="fruits">
          <div ndSelectLabel id="fruits">Fruits</div>
          @for (fruit of fruits; track fruit.value) {
            <div
              ndSelectItem
              [value]="fruit.value"
              [disabled]="fruit.value === 'banana'"
            >
              <span ndSelectItemText>{{ fruit.label }}</span>
              <span
                ndSelectItemIndicator
                [attr.data-testid]="'check-' + fruit.value"
                >✓</span
              >
            </div>
          }
        </div>
        <div ndSelectSeparator></div>
        <div ndSelectItem value="blueberry">Blueberry</div>
      </div>
    </ng-container>
  `,
})
class Host {
  readonly fruits = FRUITS;
  readonly value = signal<string | null>(null);
  readonly open = signal(false);
}

async function setup() {
  const view = await render(Host);
  const settle = async () => {
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await view.fixture.whenStable();
  };
  await settle();
  return { view, host: view.fixture.componentInstance, settle };
}

describe('NdSelect', () => {
  it('is a select-only combobox showing its placeholder', async () => {
    await setup();
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.hasAttribute('data-placeholder')).toBe(true);
    expect(trigger.textContent?.trim()).toBe('Pick a fruit');
    const listbox = document.getElementById(
      trigger.getAttribute('aria-controls') ?? '',
    );
    expect(listbox?.getAttribute('role')).toBe('listbox');
    expect(listbox?.hidden).toBe(true);
    expect(
      document
        .querySelector('[ndSelectSeparator]')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('shows the selected option’s text, including interpolated text', async () => {
    const { host, settle } = await setup();
    host.value.set('cherry');
    await settle();
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    expect(trigger.textContent?.trim()).toBe('Cherry');
    expect(trigger.hasAttribute('data-placeholder')).toBe(false);
    expect(screen.getByTestId('check-cherry').hidden).toBe(false);
    expect(screen.getByTestId('check-apple').hidden).toBe(true);
  });

  it('opens on click, names the listbox after the label and selects on click', async () => {
    const { host, settle } = await setup();
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    fireEvent.click(trigger);
    await settle();
    expect(host.open()).toBe(true);
    const listbox = screen.getByRole('listbox', { name: 'Fruit' });
    expect(listbox.hidden).toBe(false);
    fireEvent.click(screen.getByRole('option', { name: /^Cherry/ }));
    await settle();
    expect(host.value()).toBe('cherry');
    expect(host.open()).toBe(false);
  });

  it('ignores disabled options', async () => {
    const { host, settle } = await setup();
    fireEvent.click(screen.getByRole('combobox', { name: 'Fruit' }));
    await settle();
    fireEvent.click(screen.getByRole('option', { name: /^Banana/ }));
    await settle();
    expect(host.value()).toBeNull();
  });

  it('opens with ArrowDown and selects by typing on the closed trigger', async () => {
    const { host, settle } = await setup();
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    fireEvent.keyDown(trigger, { key: 'c' });
    expect(host.value()).toBe('cherry');
    await new Promise((resolve) => setTimeout(resolve, 600));
    fireEvent.keyDown(trigger, { key: 'b' });
    expect(host.value()).toBe('blueberry');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    await settle();
    expect(host.open()).toBe(true);
  });

  it('selects the focused option with Enter and closes on Escape', async () => {
    const { host, settle } = await setup();
    host.open.set(true);
    await settle();
    const apple = screen.getByRole('option', { name: /^Apple/ });
    apple.focus();
    fireEvent.keyDown(apple, { key: 'Enter', keyCode: 13 });
    await settle();
    expect(host.value()).toBe('apple');
    expect(host.open()).toBe(false);
  });

  it('binds reactive forms through the trigger', async () => {
    @Component({
      imports: [...PARTS, ReactiveFormsModule],
      template: `
        <ng-container ndSelect>
          <button ndSelectTrigger aria-label="Fruit" [formControl]="control">
            <span ndSelectValue placeholder="Pick a fruit"></span>
          </button>
          <div ndSelectContent>
            <div ndSelectGroup aria-labelledby="fruits">
              <div ndSelectLabel id="fruits">Fruits</div>
              @for (fruit of fruits; track fruit.value) {
                <div
                  ndSelectItem
                  [value]="fruit.value"
                  [disabled]="fruit.value === 'banana'"
                >
                  <span ndSelectItemText>{{ fruit.label }}</span>
                  <span
                    ndSelectItemIndicator
                    [attr.data-testid]="'check-' + fruit.value"
                    >✓</span
                  >
                </div>
              }
            </div>
            <div ndSelectSeparator></div>
            <div ndSelectItem value="blueberry">Blueberry</div>
          </div>
        </ng-container>
      `,
    })
    class FormHost {
      readonly fruits = FRUITS;
      readonly control = new FormControl<string | null>('apple');
    }
    const view = await render(FormHost);
    await view.fixture.whenStable();
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    expect(trigger.textContent?.trim()).toBe('Apple');
    fireEvent.keyDown(trigger, { key: 'c' });
    expect(view.fixture.componentInstance.control.value).toBe('cherry');
    view.fixture.componentInstance.control.disable();
    await view.fixture.whenStable();
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
  });
});
