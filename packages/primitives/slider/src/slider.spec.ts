import { Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { fireEvent, render, screen } from '@testing-library/angular/zoneless';
import userEvent from '@testing-library/user-event';
import {
  NdSlider,
  NdSliderRange,
  NdSliderThumb,
  NdSliderTrack,
} from './slider';

const PARTS = [NdSlider, NdSliderTrack, NdSliderRange, NdSliderThumb];

describe('NdSlider', () => {
  it('announces a thumb as a slider with its value and bounds', async () => {
    await render(
      `<div ndSlider [max]="50" [step]="5">
        <div ndSliderTrack><div ndSliderRange #range="ndSliderRange" data-testid="range" [attr.data-end]="range.end()"></div></div>
        <span ndSliderThumb aria-label="Volume" [defaultValue]="12" valueText="Low"></span>
      </div>`,
      { imports: PARTS },
    );
    const thumb = screen.getByRole('slider', { name: 'Volume' });
    expect(thumb.getAttribute('aria-valuenow')).toBe('10');
    expect(thumb.getAttribute('aria-valuemin')).toBe('0');
    expect(thumb.getAttribute('aria-valuemax')).toBe('50');
    expect(thumb.getAttribute('aria-valuetext')).toBe('Low');
    expect(thumb.getAttribute('aria-orientation')).toBe('horizontal');
    expect(thumb.getAttribute('tabindex')).toBe('0');
    expect(screen.getByTestId('range').getAttribute('data-end')).toBe('20');
  });

  it('changes by steps with arrows, Page Up and Down, Home and End', async () => {
    @Component({
      imports: PARTS,
      template: `<div ndSlider [step]="2">
        <span ndSliderThumb aria-label="Volume" [(value)]="value"></span>
      </div>`,
    })
    class Host {
      readonly value = signal(50);
    }
    const { fixture } = await render(Host);
    screen.getByRole('slider').focus();
    const value = fixture.componentInstance.value;
    await userEvent.keyboard('{ArrowRight}');
    expect(value()).toBe(52);
    await userEvent.keyboard('{ArrowDown}');
    expect(value()).toBe(50);
    await userEvent.keyboard('{PageUp}');
    expect(value()).toBe(70);
    await userEvent.keyboard('{PageDown}{ArrowLeft}');
    expect(value()).toBe(48);
    await userEvent.keyboard('{End}');
    expect(value()).toBe(100);
    await userEvent.keyboard('{ArrowUp}');
    expect(value()).toBe(100);
    await userEvent.keyboard('{Home}');
    expect(value()).toBe(0);
  });

  it('reverses horizontal arrows in right-to-left layouts', async () => {
    await render(
      `<div dir="rtl" ndSlider>
        <span ndSliderThumb aria-label="Volume" [defaultValue]="50"></span>
      </div>`,
      { imports: PARTS },
    );
    const thumb = screen.getByRole('slider');
    thumb.focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(thumb.getAttribute('aria-valuenow')).toBe('51');
  });

  it('keeps range thumbs from passing each other', async () => {
    await render(
      `<div ndSlider>
        <div ndSliderRange #range="ndSliderRange" data-testid="range" [attr.data-start]="range.start()" [attr.data-end]="range.end()"></div>
        <span ndSliderThumb aria-label="Minimum" [defaultValue]="20"></span>
        <span ndSliderThumb aria-label="Maximum" [defaultValue]="30"></span>
      </div>`,
      { imports: PARTS },
    );
    const low = screen.getByRole('slider', { name: 'Minimum' });
    const high = screen.getByRole('slider', { name: 'Maximum' });
    expect(low.getAttribute('aria-valuemax')).toBe('30');
    expect(high.getAttribute('aria-valuemin')).toBe('20');
    const range = screen.getByTestId('range');
    expect([range.dataset['start'], range.dataset['end']]).toEqual([
      '20',
      '30',
    ]);
    low.focus();
    await userEvent.keyboard('{End}');
    expect(low.getAttribute('aria-valuenow')).toBe('30');
    await userEvent.keyboard('{ArrowRight}');
    expect(low.getAttribute('aria-valuenow')).toBe('30');
  });

  it('moves the nearest thumb to a pressed point', async () => {
    const { fixture } = await render(
      `<div ndSlider data-testid="slider">
        <span ndSliderThumb aria-label="Minimum" [defaultValue]="10"></span>
        <span ndSliderThumb aria-label="Maximum" [defaultValue]="90"></span>
      </div>`,
      { imports: PARTS },
    );
    const slider = screen.getByTestId('slider');
    slider.getBoundingClientRect = () =>
      ({ left: 0, width: 200, top: 0, bottom: 10, height: 10 }) as DOMRect;
    slider.setPointerCapture = () => undefined;
    slider.hasPointerCapture = () => true;
    slider.releasePointerCapture = () => undefined;
    fireEvent(
      slider,
      new MouseEvent('pointerdown', { bubbles: true, button: 0, clientX: 140 }),
    );
    await fixture.whenStable();
    const high = screen.getByRole('slider', { name: 'Maximum' });
    expect(high.getAttribute('aria-valuenow')).toBe('70');
    expect(document.activeElement).toBe(high);
    fireEvent(
      slider,
      new MouseEvent('pointermove', { bubbles: true, clientX: 150 }),
    );
    await fixture.whenStable();
    expect(high.getAttribute('aria-valuenow')).toBe('75');
    fireEvent(slider, new MouseEvent('pointerup', { bubbles: true }));
  });

  it('is disabled with the slider: no tab stop, no changes', async () => {
    await render(
      `<div ndSlider disabled>
        <span ndSliderThumb aria-label="Volume" [defaultValue]="5"></span>
      </div>`,
      { imports: PARTS },
    );
    const thumb = screen.getByRole('slider');
    expect(thumb.hasAttribute('tabindex')).toBe(false);
    expect(thumb.getAttribute('aria-disabled')).toBe('true');
    thumb.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(thumb.getAttribute('aria-valuenow')).toBe('5');
  });

  it('binds each thumb to Signal Forms or reactive forms', async () => {
    @Component({
      imports: [...PARTS, FormField, ReactiveFormsModule],
      template: `<div ndSlider>
        <span ndSliderThumb aria-label="A" [formField]="form.volume"></span>
        <span ndSliderThumb aria-label="B" [formControl]="control"></span>
      </div>`,
    })
    class Host {
      readonly model = signal({ volume: 20 });
      readonly form = form(this.model);
      readonly control = new FormControl(60);
    }
    const { fixture } = await render(Host);
    const a = screen.getByRole('slider', { name: 'A' });
    expect(a.getAttribute('aria-valuenow')).toBe('20');
    a.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(fixture.componentInstance.model().volume).toBe(21);
    screen.getByRole('slider', { name: 'B' }).focus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(fixture.componentInstance.control.value).toBe(59);
    expect(fixture.componentInstance.control.touched).toBe(false);
    await userEvent.tab();
    expect(fixture.componentInstance.control.touched).toBe(true);
  });
});
