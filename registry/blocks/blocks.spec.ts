import type { Type } from '@angular/core';
import { render } from '@testing-library/angular/zoneless';
import { provideIcons } from '@/lib/icons';

const modules = import.meta.glob<Record<string, Type<unknown>>>(
  ['./*/*.ts', '!./**/*.spec.ts', '!./**/data.ts'],
  { eager: true },
);

/** Each block's page component, from the file named after its folder. */
const pages = Object.entries(modules).filter(([path]) =>
  /^\.\/([^/]+)\/\1\.ts$/.test(path),
);

describe('blocks', () => {
  it('has the 12 blocks of ADR-0022', () => {
    expect(pages.length).toBeGreaterThanOrEqual(12);
  });

  it.each(pages)('renders %s as a page', async (_, exports) => {
    const component = Object.values(exports).find(
      (value) => typeof value === 'function',
    );
    const errors = vi.spyOn(console, 'error');
    const view = await render(component as Type<unknown>, {
      providers: [provideIcons()],
    });
    expect(view.container.querySelectorAll('main')).toHaveLength(1);
    expect(view.container.querySelectorAll('h1')).toHaveLength(1);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
