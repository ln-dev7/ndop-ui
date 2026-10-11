import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
import {
  Combobox,
  ComboboxChip,
  ComboboxChipRemove,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxClear,
  ComboboxContent,
  ComboboxControl,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from './combobox';

/**
 * shadcn's classes as Ndop writes them. shadcn builds its field on
 * InputGroup, which Ndop doesn't have, so `ComboboxControl` and
 * `ComboboxInput` carry their own classes; icons are the user's markup,
 * styled by their buttons; Base UI's positioner variables become
 * `--nd-combobox-anchor-width`, and its `data-open`/`data-closed` become
 * `data-state`; sides are logical; the popup has no inner field variant.
 *
 * @param classes - A shadcn class string.
 * @returns The Ndop string, or `null` when dropped.
 */
function ndopClasses(classes: string): string | null {
  if (
    [
      'w-auto',
      'group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent',
      'isolate z-50',
    ].includes(classes) ||
    classes.startsWith('pointer-events-none size-4 pointer-coarse') ||
    classes === 'pointer-events-none'
  ) {
    return null;
  }
  if (classes === 'pointer-events-none size-4 text-muted-foreground') {
    return '[&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:text-muted-foreground';
  }
  if (classes.startsWith('group/combobox-content')) {
    return 'group/combobox-content relative max-h-96 w-(--nd-combobox-anchor-width) overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2 data-[side=top]:slide-in-from-bottom-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95';
  }
  if (classes.startsWith('max-h-[min(')) {
    return 'max-h-[calc(--spacing(96)---spacing(9))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0';
  }
  if (classes === 'min-w-16 flex-1 outline-none') {
    return 'min-w-16 flex-1 bg-transparent outline-none';
  }
  return classes
    .replace('pr-8 pl-2', 'pe-8 ps-2')
    .replace('absolute right-2', 'absolute end-2')
    .replace(
      'has-data-[slot=combobox-chip-remove]:pr-0',
      'has-data-[slot=combobox-chip-remove]:pe-0',
    )
    .replace('-ml-1 opacity-50', '-ms-1 opacity-50');
}

describe('Combobox', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('combobox').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'combobox',
        registrySource('ui/combobox/combobox.ts'),
        exceptions,
      ),
    ).toEqual([]);
  });

  it('styles a single-value field with its buttons', async () => {
    await render(
      `<ng-container ndCombobox>
        <div ndComboboxControl data-testid="control">
          <input ndComboboxInput aria-label="Framework" />
          <button ndComboboxTrigger>v</button>
          <button ndComboboxClear>x</button>
        </div>
        <div ndComboboxContent>
          <div ndComboboxList>
            <div ndComboboxEmpty>None.</div>
            <div ndComboboxItem value="angular">Angular</div>
          </div>
        </div>
      </ng-container>`,
      {
        imports: [
          Combobox,
          ComboboxControl,
          ComboboxInput,
          ComboboxTrigger,
          ComboboxClear,
          ComboboxContent,
          ComboboxList,
          ComboboxEmpty,
          ComboboxItem,
        ],
      },
    );
    const field = screen.getByRole('combobox', { name: 'Framework' });
    expect(field.getAttribute('data-slot')).toBe('combobox-input');
    expect(
      screen
        .getByTestId('control')
        .querySelector('[data-slot=combobox-clear]')
        ?.hasAttribute('hidden'),
    ).toBe(true);
  });

  it('styles chips', async () => {
    await render(
      `<ng-container ndCombobox multiple [values]="['angular']">
        <div ndComboboxChips>
          <span ndComboboxChip value="angular" data-testid="chip">
            angular <button ndComboboxChipRemove>x</button>
          </span>
          <input ndComboboxChipsInput aria-label="Frameworks" />
        </div>
      </ng-container>`,
      {
        imports: [
          Combobox,
          ComboboxChips,
          ComboboxChip,
          ComboboxChipRemove,
          ComboboxChipsInput,
        ],
      },
    );
    expect(screen.getByTestId('chip').getAttribute('data-slot')).toBe(
      'combobox-chip',
    );
    expect(
      screen
        .getByRole('combobox', { name: 'Frameworks' })
        .getAttribute('data-slot'),
    ).toBe('combobox-chip-input');
  });
});
