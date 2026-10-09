import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Alert, AlertDescription, AlertTitle } from './alert';

describe('Alert', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('alert', registrySource('ui/alert/alert.ts'), {
        'alert-description]:text-destructive/90':
          'alert-description]:text-destructive',
      }),
    ).toEqual([]);
  });

  it('is an alert by default, and takes another role', async () => {
    await render(
      `<div ndAlert variant="destructive" data-testid="a">
        <div ndAlertTitle>Failed</div>
        <div ndAlertDescription>Try again.</div>
      </div>
      <div ndAlert role="status" data-testid="b">Saved</div>`,
      { imports: [Alert, AlertTitle, AlertDescription] },
    );
    const alert = screen.getByRole('alert');
    expect(alert.getAttribute('data-variant')).toBe('destructive');
    expect(alert.classList).toContain('text-destructive');
    expect(screen.getByRole('status').textContent).toContain('Saved');
    expect(screen.getByText('Try again.').getAttribute('data-slot')).toBe(
      'alert-description',
    );
  });
});
