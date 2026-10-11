import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
  shadcnClassStrings,
} from '../../testing/shadcn-parity';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectTrigger,
  SelectValue,
} from './select';

/**
 * shadcn's classes as Ndop writes them: logical sides, no Radix custom
 * properties, which the CDK overlay doesn't set, and no scroll buttons:
 * the list scrolls natively. The list opens below the trigger with its
 * offset from `sideOffset`, so the popper nudges go too.
 *
 * @param classes - A shadcn class string.
 * @returns The Ndop string, or `null` when dropped.
 */
function ndopClasses(classes: string): string | null {
  // Icons are the user's markup, in the examples; scroll buttons are gone.
  if (
    /^(size-4 opacity-50|size-4|flex cursor-default items-center justify-center py-1)$/.test(
      classes,
    ) ||
    classes.includes('translate-y-1') ||
    classes.includes('radix-select-trigger-height')
  ) {
    return null;
  }
  if (classes === 'p-1') {
    return 'p-1 scroll-my-1';
  }
  return classes
    .replace(/origin-\(--radix-[a-z-]+\) /, '')
    .replace(/max-h-\(--radix-[a-z-]+\)/, 'max-h-[min(24rem,80vh)]')
    .replace(
      'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
      'data-[side=start]:slide-in-from-end-2 data-[side=end]:slide-in-from-start-2',
    )
    .replace('pr-8 pl-2', 'pe-8 ps-2')
    .replace('absolute right-2', 'absolute end-2');
}

describe('Select', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    const exceptions = Object.fromEntries(
      shadcnClassStrings('select').map((classes) => [
        classes,
        ndopClasses(classes),
      ]),
    );
    expect(
      missingShadcnClasses(
        'select',
        registrySource('ui/select/select.ts'),
        exceptions,
      ),
    ).toEqual([]);
  });

  it('styles the trigger by size and shows the placeholder', async () => {
    await render(
      `<ng-container ndSelect>
        <button ndSelectTrigger aria-label="Fruit" size="sm">
          <span ndSelectValue placeholder="Select a fruit"></span>
        </button>
        <div ndSelectContent>
          <div ndSelectItem value="apple">
            <span ndSelectItemIndicator>✓</span>
            <span ndSelectItemText>Apple</span>
          </div>
        </div>
      </ng-container>`,
      {
        imports: [
          Select,
          SelectTrigger,
          SelectValue,
          SelectContent,
          SelectItem,
          SelectItemIndicator,
          SelectItemText,
        ],
      },
    );
    const trigger = screen.getByRole('combobox', { name: 'Fruit' });
    expect(trigger.getAttribute('data-size')).toBe('sm');
    expect(trigger.hasAttribute('data-placeholder')).toBe(true);
    expect(trigger.textContent?.trim()).toBe('Select a fruit');
    expect(trigger.querySelector('[data-slot=select-value]')?.textContent).toBe(
      'Select a fruit',
    );
  });
});
