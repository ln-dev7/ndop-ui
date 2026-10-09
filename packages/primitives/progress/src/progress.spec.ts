import { render, screen } from '@testing-library/angular/zoneless';
import { NdProgress, NdProgressIndicator } from './progress';

const PARTS = [NdProgress, NdProgressIndicator];

describe('NdProgress', () => {
  it('announces its value and percentage', async () => {
    await render(
      `<div ndProgress [value]="30" [max]="60" aria-label="Upload">
        <div ndProgressIndicator data-testid="indicator"></div>
      </div>`,
      { imports: PARTS },
    );
    const bar = screen.getByRole('progressbar', { name: 'Upload' });
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('60');
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
    expect(bar.getAttribute('aria-valuetext')).toBe('50%');
    expect(bar.getAttribute('data-state')).toBe('loading');
    expect(screen.getByTestId('indicator').getAttribute('data-state')).toBe(
      'loading',
    );
  });

  it('is indeterminate without a value', async () => {
    await render(`<div ndProgress aria-label="Loading"></div>`, {
      imports: PARTS,
    });
    const bar = screen.getByRole('progressbar');
    expect(bar.hasAttribute('aria-valuenow')).toBe(false);
    expect(bar.hasAttribute('aria-valuetext')).toBe(false);
    expect(bar.getAttribute('data-state')).toBe('indeterminate');
  });

  it('clamps the value and completes at max', async () => {
    await render(
      `<div ndProgress [value]="140" aria-label="A"></div>
       <div ndProgress [value]="-5" aria-label="B"></div>`,
      { imports: PARTS },
    );
    const [full, empty] = screen.getAllByRole('progressbar');
    expect(full?.getAttribute('aria-valuenow')).toBe('100');
    expect(full?.getAttribute('data-state')).toBe('complete');
    expect(empty?.getAttribute('aria-valuenow')).toBe('0');
  });
});
