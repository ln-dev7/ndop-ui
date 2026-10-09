import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './card';

describe('Card', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('card', registrySource('ui/card/card.ts')),
    ).toEqual([]);
  });

  it('styles each part and keeps the host semantics', async () => {
    await render(
      `<section ndCard aria-labelledby="t" class="max-w-sm">
        <div ndCardHeader>
          <h2 ndCardTitle id="t">Plan</h2>
          <p ndCardDescription>Monthly</p>
          <div ndCardAction>Edit</div>
        </div>
        <div ndCardContent>Body</div>
        <div ndCardFooter>Footer</div>
      </section>`,
      {
        imports: [
          Card,
          CardHeader,
          CardTitle,
          CardDescription,
          CardAction,
          CardContent,
          CardFooter,
        ],
      },
    );
    const card = screen.getByRole('region', { name: 'Plan' });
    expect(card.getAttribute('data-slot')).toBe('card');
    expect(card.classList).toContain('max-w-sm');
    expect(
      screen.getByRole('heading', { name: 'Plan' }).getAttribute('data-slot'),
    ).toBe('card-title');
    expect(screen.getByText('Edit').getAttribute('data-slot')).toBe(
      'card-action',
    );
  });
});
