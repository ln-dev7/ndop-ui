import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { RadioGroup, RadioGroupIndicator, RadioGroupItem } from './radio-group';

describe('RadioGroup', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'radio-group',
        registrySource('ui/radio-group/radio-group.ts'),
        {
          // The indicator centers the icon with flex instead of physical
          // offsets, so nothing needs mirroring.
          'absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary':
            '[&>svg]:size-2 [&>svg]:fill-primary',
        },
      ),
    ).toEqual([]);
  });

  it('checks an item and shows its indicator', async () => {
    await render(
      `<div ndRadioGroup aria-label="Plan">
        <button ndRadioGroupItem value="free" aria-label="Free">
          <span ndRadioGroupIndicator data-testid="dot">•</span>
        </button>
      </div>`,
      { imports: [RadioGroup, RadioGroupItem, RadioGroupIndicator] },
    );
    const radio = screen.getByRole('radio', { name: 'Free' });
    expect(radio.getAttribute('data-slot')).toBe('radio-group-item');
    await userEvent.click(radio);
    expect(radio.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByTestId('dot').hidden).toBe(false);
  });
});
