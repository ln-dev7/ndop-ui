import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { ToggleGroup, ToggleGroupItem } from './toggle-group';

describe('ToggleGroup', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'toggle-group',
        registrySource('ui/toggle-group/toggle-group.ts'),
        {
          // Logical sides, so the joined bar mirrors in right-to-left
          // layouts.
          'first:rounded-l-md': 'first:rounded-s-md',
          'last:rounded-r-md': 'last:rounded-e-md',
          'outline]:border-l-0': 'outline]:border-s-0',
          'first:border-l': 'first:border-s',
        },
      ),
    ).toEqual([]);
  });

  it("gives items the group's variant, size and spacing", async () => {
    await render(
      `<div ndToggleGroup variant="outline" size="lg" aria-label="Style">
        <button ndToggleGroupItem value="bold" aria-label="Bold">B</button>
      </div>`,
      { imports: [ToggleGroup, ToggleGroupItem] },
    );
    const item = screen.getByRole('button', { name: 'Bold' });
    expect(item.getAttribute('data-variant')).toBe('outline');
    expect(item.getAttribute('data-size')).toBe('lg');
    expect(item.getAttribute('data-spacing')).toBe('0');
    expect(item.classList).toContain('h-10');
    await userEvent.click(item);
    expect(item.getAttribute('aria-pressed')).toBe('true');
  });
});
