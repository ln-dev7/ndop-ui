import { render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  InputOtp,
  InputOtpGroup,
  InputOtpInput,
  InputOtpSeparator,
  InputOtpSlot,
} from './input-otp';

describe('InputOtp', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'input-otp',
        registrySource('ui/input-otp/input-otp.ts'),
        {
          // Logical sides, and the slot's own data attributes: slots are
          // hidden from assistive technology, so they carry no
          // aria-invalid, and data-active is a presence attribute.
          'relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-[3px] data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:bg-input/30 dark:data-[active=true]:aria-invalid:ring-destructive/40':
            'relative flex h-9 w-9 items-center justify-center border-y border-e border-input text-sm shadow-xs transition-all outline-none first:rounded-s-md first:border-s last:rounded-e-md data-invalid:border-destructive data-active:z-10 data-active:border-ring data-active:ring-[3px] data-active:ring-ring/50 data-active:data-invalid:border-destructive data-active:data-invalid:ring-destructive/20 dark:bg-input/30 dark:data-active:data-invalid:ring-destructive/40',
          // The fake caret is the slot's ::after, since a directive can't
          // add elements.
          'pointer-events-none absolute inset-0 flex items-center justify-center':
            null,
          'h-4 w-px animate-caret-blink bg-foreground duration-1000': null,
        },
      ),
    ).toEqual([]);
  });

  it('draws the typed code in its slots', async () => {
    await render(
      `<div ndInputOtp [length]="2">
        <input ndInputOtpInput aria-label="Code" />
        <div ndInputOtpGroup>
          <div ndInputOtpSlot [index]="0"></div>
          <div ndInputOtpSlot [index]="1"></div>
        </div>
        <div ndInputOtpSeparator></div>
      </div>`,
      {
        imports: [
          InputOtp,
          InputOtpInput,
          InputOtpGroup,
          InputOtpSlot,
          InputOtpSeparator,
        ],
      },
    );
    await userEvent.type(screen.getByRole('textbox', { name: 'Code' }), '7');
    const slots = document.querySelectorAll('[data-slot=input-otp-slot]');
    expect(slots[0]?.textContent).toBe('7');
    expect(slots[1]?.hasAttribute('data-caret')).toBe(true);
  });
});
