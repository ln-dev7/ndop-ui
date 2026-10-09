import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Toggle } from './toggle';

describe('Toggle', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('toggle', registrySource('ui/toggle/toggle.ts')),
    ).toEqual([]);
  });

  it('applies its variant and size, and toggles', async () => {
    await render(
      `<button ndToggle variant="outline" size="sm" aria-label="Bold">B</button>`,
      { imports: [Toggle] },
    );
    const toggle = screen.getByRole('button', { name: 'Bold' });
    expect(toggle.classList).toContain('border-input');
    expect(toggle.classList).toContain('h-8');
    await userEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
  });
});
