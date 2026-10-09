import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Spinner } from './spinner';

describe('Spinner', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('spinner', registrySource('ui/spinner/spinner.ts')),
    ).toEqual([]);
  });

  it('is a status named by its label', async () => {
    await render(
      `<span ndSpinner label="Saving" class="size-6"><svg></svg></span>`,
      {
        imports: [Spinner],
      },
    );
    const spinner = screen.getByRole('status', { name: 'Saving' });
    expect(spinner.classList).toContain('animate-spin');
    expect(spinner.classList).toContain('size-6');
  });
});
