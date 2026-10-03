import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Input } from './input';

describe('Input', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('input', registrySource('ui/input/input.ts')),
    ).toEqual([]);
  });

  it('styles the input and keeps the primitive state attributes', async () => {
    await render(`<input ndInput aria-label="Name" invalid class="w-64" />`, {
      imports: [Input],
    });
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input.getAttribute('data-slot')).toBe('input');
    expect(input.classList).toContain('rounded-md');
    expect(input.classList).toContain('w-64');
    expect(input.classList).not.toContain('w-full');
    expect(input.getAttribute('aria-invalid')).toBe('true');
  });
});
