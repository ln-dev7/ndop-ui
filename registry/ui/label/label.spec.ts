import { render, screen } from '@testing-library/angular/zoneless';
import { Input } from '../input/input';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Label } from './label';

describe('Label', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('label', registrySource('ui/label/label.ts')),
    ).toEqual([]);
  });

  it('labels its input and mirrors its state', async () => {
    await render(
      `<label ndLabel for="email">Email</label><input ndInput id="email" invalid />`,
      { imports: [Label, Input] },
    );
    const label = screen.getByText('Email');
    expect(label.getAttribute('data-slot')).toBe('label');
    expect(label.classList).toContain('font-medium');
    expect(screen.getByLabelText('Email')).toBe(
      document.getElementById('email'),
    );
    expect(label.hasAttribute('data-invalid')).toBe(true);
  });
});
