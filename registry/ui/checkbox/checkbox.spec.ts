import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Checkbox, CheckboxIndicator } from './checkbox';

describe('Checkbox', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'checkbox',
        registrySource('ui/checkbox/checkbox.ts'),
      ),
    ).toEqual([]);
  });

  it('is a two-way bindable checkbox with its indicator', async () => {
    await render(
      `<button ndCheckbox class="size-5" aria-label="Terms">
        <span ndCheckboxIndicator data-testid="indicator">✓</span>
      </button>`,
      { imports: [Checkbox, CheckboxIndicator] },
    );
    const box = screen.getByRole('checkbox', { name: 'Terms' });
    expect(box.getAttribute('data-slot')).toBe('checkbox');
    expect(box.classList).toContain('size-5');
    expect(box.classList).not.toContain('size-4');
    await userEvent.click(box);
    expect(box.getAttribute('data-state')).toBe('checked');
    expect(screen.getByTestId('indicator').hidden).toBe(false);
  });
});
