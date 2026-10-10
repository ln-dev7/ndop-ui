import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './collapsible';

describe('Collapsible', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'collapsible',
        registrySource('ui/collapsible/collapsible.ts'),
      ),
    ).toEqual([]);
  });

  it('re-exports the primitive parts', async () => {
    await render(
      `<div ndCollapsible defaultOpen>
        <button ndCollapsibleTrigger>More</button>
        <p ndCollapsibleContent>Details</p>
      </div>`,
      { imports: [Collapsible, CollapsibleTrigger, CollapsibleContent] },
    );
    expect(
      screen
        .getByRole('button', { name: 'More' })
        .getAttribute('aria-expanded'),
    ).toBe('true');
    expect(screen.getByText('Details').hidden).toBe(false);
  });
});
