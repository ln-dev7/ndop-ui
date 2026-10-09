import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Progress, ProgressIndicator } from './progress';

describe('Progress', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'progress',
        registrySource('ui/progress/progress.ts'),
        {
          // Sized by width rather than translated, so it fills from the
          // start side in either direction.
          'h-full w-full flex-1': 'h-full flex-1',
        },
      ),
    ).toEqual([]);
  });

  it('announces the value and sizes the indicator', async () => {
    await render(
      `<div ndProgress [value]="25" aria-label="Upload">
        <div ndProgressIndicator data-testid="indicator"></div>
      </div>`,
      { imports: [Progress, ProgressIndicator] },
    );
    const bar = screen.getByRole('progressbar', { name: 'Upload' });
    expect(bar.getAttribute('aria-valuenow')).toBe('25');
    expect(screen.getByTestId('indicator').style.width).toBe('25%');
  });
});
