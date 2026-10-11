import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import {
  NdCombobox,
  NdComboboxChip,
  NdComboboxChipRemove,
  NdComboboxChips,
  NdComboboxClear,
  NdComboboxContent,
  NdComboboxEmpty,
  NdComboboxGroup,
  NdComboboxInput,
  NdComboboxItem,
  NdComboboxItemIndicator,
  NdComboboxLabel,
  NdComboboxList,
  NdComboboxTrigger,
} from './combobox';

const PARTS = [
  NdCombobox,
  NdComboboxInput,
  NdComboboxTrigger,
  NdComboboxClear,
  NdComboboxContent,
  NdComboboxList,
  NdComboboxEmpty,
  NdComboboxGroup,
  NdComboboxLabel,
  NdComboboxItem,
  NdComboboxItemIndicator,
  NdComboboxChips,
  NdComboboxChip,
  NdComboboxChipRemove,
];

const FRAMEWORKS = ['Angular', 'Analog', 'Vue', 'Svelte'];

@Component({
  imports: PARTS,
  template: `
    <label for="framework">Framework</label>
    <ng-container
      ndCombobox
      [(value)]="value"
      [(open)]="open"
      [(search)]="search"
    >
      <input ndComboboxInput id="framework" />
      <button ndComboboxTrigger>v</button>
      <button ndComboboxClear>x</button>
      <div ndComboboxContent>
        <div ndComboboxList>
          <div ndComboboxEmpty>No framework found.</div>
          <div ndComboboxGroup>
            <div ndComboboxLabel>Frameworks</div>
            @for (name of frameworks; track name) {
              <div
                ndComboboxItem
                [value]="name.toLowerCase()"
                [disabled]="name === 'Vue'"
              >
                {{ name }}
              </div>
            }
          </div>
        </div>
      </div>
    </ng-container>
    <button>Elsewhere</button>
  `,
})
class Single {
  readonly frameworks = FRAMEWORKS;
  readonly value = signal<string | null>(null);
  readonly open = signal(false);
  readonly search = signal('');
}

@Component({
  imports: PARTS,
  template: `
    <ng-container ndCombobox multiple [(values)]="values" [(open)]="open">
      <div ndComboboxChips>
        @for (value of values(); track value) {
          <span ndComboboxChip [value]="value">
            {{ value }} <button ndComboboxChipRemove>x</button>
          </span>
        }
        <input ndComboboxInput aria-label="Frameworks" />
      </div>
      <div ndComboboxContent>
        <div ndComboboxList>
          <div ndComboboxEmpty>No framework found.</div>
          <div ndComboboxGroup>
            <div ndComboboxLabel>Frameworks</div>
            @for (name of frameworks; track name) {
              <div
                ndComboboxItem
                [value]="name.toLowerCase()"
                [disabled]="name === 'Vue'"
              >
                {{ name }}
              </div>
            }
          </div>
        </div>
      </div>
    </ng-container>
  `,
})
class Multiple {
  readonly frameworks = FRAMEWORKS;
  readonly values = signal<readonly string[]>(['angular']);
  readonly open = signal(false);
}

// The CDK key manager reads `keyCode`, which fireEvent doesn't derive.
const KEY_CODES: Record<string, number> = {
  ArrowUp: 38,
  ArrowDown: 40,
  Enter: 13,
  Escape: 27,
  Backspace: 8,
};

async function setup<T>(host: new () => T, name: string) {
  const view = await render(host as never);
  const settle = async () => {
    await view.fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    await view.fixture.whenStable();
  };
  await settle();
  const input = screen.getByRole('combobox', { name }) as HTMLInputElement;
  return {
    host: view.fixture.componentInstance as T,
    input,
    settle,
    type: async (text: string) => {
      fireEvent.input(input, { target: { value: text } });
      await settle();
    },
    press: async (key: string, init: KeyboardEventInit = {}) => {
      fireEvent.keyDown(input, { key, keyCode: KEY_CODES[key], ...init });
      await settle();
    },
    highlighted: () =>
      document.getElementById(
        input.getAttribute('aria-activedescendant') ?? '',
      ),
  };
}

describe('NdCombobox', () => {
  it('is an editable combobox controlling a listbox named after its label', async () => {
    const { input, press } = await setup(Single, 'Framework');
    expect(input.getAttribute('aria-autocomplete')).toBe('list');
    expect(input.getAttribute('aria-expanded')).toBe('false');
    const list = document.getElementById(
      input.getAttribute('aria-controls') ?? '',
    );
    expect(list?.getAttribute('role')).toBe('listbox');
    expect(list?.closest('[hidden]')).not.toBeNull();
    await press('ArrowDown');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('listbox', { name: 'Framework' })).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Frameworks' })).toBeTruthy();
    const trigger = document.querySelector('[ndComboboxTrigger]');
    expect(trigger?.getAttribute('aria-hidden')).toBe('true');
    expect(trigger?.getAttribute('tabindex')).toBe('-1');
  });

  it('filters as the user types and shows the empty state', async () => {
    const { input, type } = await setup(Single, 'Framework');
    await type('an');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('option', { name: 'Angular' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Svelte' })).toBeNull();
    expect(screen.getByText('No framework found.').hidden).toBe(true);
    await type('zz');
    expect(screen.getByText('No framework found.').hidden).toBe(false);
    expect(screen.getByRole('group', { hidden: true }).hidden).toBe(true);
  });

  it('highlights with the arrow keys and chooses with Enter', async () => {
    const { host, input, press, highlighted } = await setup(
      Single,
      'Framework',
    );
    await press('ArrowDown');
    expect(highlighted()?.textContent?.trim()).toBe('Angular');
    expect(highlighted()?.getAttribute('aria-selected')).toBe('true');
    await press('ArrowDown');
    await press('ArrowDown');
    expect(highlighted()?.textContent?.trim()).toBe('Svelte');
    await press('Enter');
    expect(host.value()).toBe('svelte');
    expect(input.value).toBe('Svelte');
    expect(host.open()).toBe(false);
  });

  it('opens on Alt+ArrowDown without highlighting, and ArrowUp highlights the last', async () => {
    const { input, press, highlighted } = await setup(Single, 'Framework');
    await press('ArrowDown', { altKey: true });
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(highlighted()).toBeNull();
    await press('Escape');
    await press('ArrowUp');
    expect(highlighted()?.textContent?.trim()).toBe('Svelte');
  });

  it('chooses on click and restores the chosen text when focus leaves', async () => {
    const { host, input, type, settle } = await setup(Single, 'Framework');
    await type('ang');
    fireEvent.click(screen.getByRole('option', { name: 'Angular' }));
    await settle();
    expect(host.value()).toBe('angular');
    await type('xyz');
    fireEvent.focusOut(input, {
      relatedTarget: screen.getByRole('button', { name: 'Elsewhere' }),
    });
    await settle();
    expect(input.value).toBe('Angular');
    expect(host.open()).toBe(false);
  });

  it('clears the field and value on Escape while closed', async () => {
    const { host, input, press, settle } = await setup(Single, 'Framework');
    host.value.set('analog');
    await settle();
    expect(input.value).toBe('Analog');
    await press('Escape');
    expect(host.value()).toBeNull();
    expect(input.value).toBe('');
  });

  it('toggles values with multiple, keeps the popup open and removes with Backspace', async () => {
    const { host, input, press, settle } = await setup(Multiple, 'Frameworks');
    expect(
      document.querySelector('[ndComboboxChip]')?.textContent?.trim(),
    ).toBe('angular x');
    await press('ArrowDown');
    expect(
      screen.getByRole('listbox').getAttribute('aria-multiselectable'),
    ).toBe('true');
    fireEvent.click(screen.getByRole('option', { name: 'Svelte' }));
    await settle();
    expect(host.values()).toEqual(['angular', 'svelte']);
    expect(host.open()).toBe(true);
    expect(
      screen
        .getByRole('option', { name: 'Svelte' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    await press('Backspace');
    expect(host.values()).toEqual(['angular']);
    fireEvent.click(
      document.querySelector('[ndComboboxChipRemove]') as Element,
    );
    await settle();
    expect(host.values()).toEqual([]);
    expect(document.activeElement).toBe(input);
  });

  it('binds reactive forms through the field', async () => {
    @Component({
      imports: [...PARTS, ReactiveFormsModule],
      template: `
        <ng-container ndCombobox>
          <input
            ndComboboxInput
            aria-label="Framework"
            [formControl]="control"
          />
          <div ndComboboxContent>
            <div ndComboboxList>
              <div ndComboboxEmpty>No framework found.</div>
              <div ndComboboxGroup>
                <div ndComboboxLabel>Frameworks</div>
                @for (name of frameworks; track name) {
                  <div
                    ndComboboxItem
                    [value]="name.toLowerCase()"
                    [disabled]="name === 'Vue'"
                  >
                    {{ name }}
                  </div>
                }
              </div>
            </div>
          </div>
        </ng-container>
      `,
    })
    class FormHost {
      readonly frameworks = FRAMEWORKS;
      readonly control = new FormControl<string | null>('analog');
    }
    const { host, input, press } = await setup(FormHost, 'Framework');
    expect(input.value).toBe('Analog');
    await press('ArrowDown');
    await press('ArrowDown');
    await press('Enter');
    expect(host.control.value).toBe('svelte');
  });
});
