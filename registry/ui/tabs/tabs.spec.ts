import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

describe('Tabs', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    expect(
      missingShadcnClasses('tabs', registrySource('ui/tabs/tabs.ts'), {
        // A logical side, so the line follows the text direction.
        'group-data-[orientation=vertical]/tabs:after:-right-1':
          'group-data-[orientation=vertical]/tabs:after:-end-1',
      }),
    ).toEqual([]);
  });

  it('styles its parts and marks the list variant', async () => {
    await render(
      `<div ndTabs defaultValue="a">
        <div ndTabsList aria-label="Letters" variant="line">
          <button ndTabsTrigger value="a">A</button>
          <button ndTabsTrigger value="b">B</button>
        </div>
        <div ndTabsContent value="a" class="p-4">A panel</div>
        <div ndTabsContent value="b">B panel</div>
      </div>`,
      { imports: [Tabs, TabsList, TabsTrigger, TabsContent] },
    );
    const list = screen.getByRole('tablist', { name: 'Letters' });
    expect(list.getAttribute('data-variant')).toBe('line');
    expect(list.getAttribute('data-slot')).toBe('tabs-list');
    expect(list.parentElement?.getAttribute('data-orientation')).toBe(
      'horizontal',
    );
    const tab = screen.getByRole('tab', { name: 'A' });
    expect(tab.getAttribute('data-state')).toBe('active');
    const panel = screen.getByRole('tabpanel', { name: 'A' });
    expect(panel.classList).toContain('p-4');
    expect(panel.classList).toContain('focus-visible:ring-[3px]');
  });
});
