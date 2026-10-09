import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Switch, SwitchThumb } from './switch';

describe('Switch', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('switch', registrySource('ui/switch/switch.ts')),
    ).toEqual([]);
  });

  it('is a sized switch whose thumb follows it', async () => {
    await render(
      `<button ndSwitch size="sm" aria-label="Wi-Fi">
        <span ndSwitchThumb data-testid="thumb"></span>
      </button>`,
      { imports: [Switch, SwitchThumb] },
    );
    const control = screen.getByRole('switch', { name: 'Wi-Fi' });
    expect(control.getAttribute('data-size')).toBe('sm');
    await userEvent.click(control);
    expect(screen.getByTestId('thumb').getAttribute('data-state')).toBe(
      'checked',
    );
  });
});
