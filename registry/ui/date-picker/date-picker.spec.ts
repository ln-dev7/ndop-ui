import { render, screen } from '@testing-library/angular/zoneless';
import { DatePickerTrigger } from './date-picker';

describe('DatePickerTrigger', () => {
  it('mutes its text while empty and merges the class input last', async () => {
    await render(
      `<button ndDatePickerTrigger empty class="w-full">Pick a date</button>`,
      { imports: [DatePickerTrigger] },
    );
    const button = screen.getByRole('button', { name: 'Pick a date' });
    expect(button.getAttribute('data-empty')).toBe('true');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.classList).toContain('w-full');
    expect(button.classList).not.toContain('w-[240px]');
  });
});
