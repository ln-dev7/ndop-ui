import type { Type } from '@angular/core';
import { render } from '@testing-library/angular/zoneless';
import { provideIcons } from '@/lib/icons';

const modules = import.meta.glob<Record<string, Type<unknown>>>(
  ['./*.ts', '!./*.spec.ts'],
  { eager: true },
);

describe('examples', () => {
  it('has at least two examples per Phase 2 item', () => {
    const names = Object.keys(modules).map((path) =>
      path.replace(/^\.\/|\.ts$/g, ''),
    );
    for (const item of [
      'button',
      'label',
      'input',
      'separator',
      'dialog',
      'popover',
      'tooltip',
    ]) {
      expect(
        names.filter((name) => name.startsWith(`${item}-`)).length,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it.each(Object.entries(modules))('renders %s', async (_, exports) => {
    const [component] = Object.values(exports);
    const errors = vi.spyOn(console, 'error');
    const view = await render(component as Type<unknown>, {
      providers: [provideIcons()],
    });
    expect(view.container.childElementCount).toBeGreaterThan(0);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
