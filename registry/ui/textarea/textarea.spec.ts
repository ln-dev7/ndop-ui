import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'textarea',
        registrySource('ui/textarea/textarea.ts'),
      ),
    ).toEqual([]);
  });

  it('styles a textarea and reflects the invalid input', async () => {
    await render(
      `<textarea ndTextarea aria-label="Bio" invalid class="h-40"></textarea>`,
      { imports: [Textarea] },
    );
    const field = screen.getByRole('textbox', { name: 'Bio' });
    expect(field.getAttribute('data-slot')).toBe('textarea');
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.classList).toContain('h-40');
  });
});
