import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Button } from './button';

describe('Button', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    expect(
      missingShadcnClasses('button', registrySource('ui/button/button.ts'), {
        'text-white': 'text-destructive-foreground',
      }),
    ).toEqual([]);
  });

  it('renders the default variant and exposes it as data attributes', async () => {
    await render(`<button ndButton>Save</button>`, { imports: [Button] });
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.getAttribute('data-slot')).toBe('button');
    expect(button.getAttribute('data-variant')).toBe('default');
    expect(button.getAttribute('data-size')).toBe('default');
    expect(button.classList).toContain('bg-primary');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('applies variant and size, and lets user classes win', async () => {
    await render(
      `<button ndButton variant="outline" size="sm" class="px-8">Cancel</button>`,
      { imports: [Button] },
    );
    const button = screen.getByRole('button', { name: 'Cancel' });
    expect(button.classList).toContain('border');
    expect(button.classList).toContain('h-8');
    expect(button.classList).toContain('px-8');
    expect(button.classList).not.toContain('px-3');
  });

  it('keeps the primitive behavior for disabled links', async () => {
    await render(`<a ndButton href="/docs" disabled>Docs</a>`, {
      imports: [Button],
    });
    const link = screen.getByRole('link', { name: 'Docs' });
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.hasAttribute('data-disabled')).toBe(true);
  });
});
