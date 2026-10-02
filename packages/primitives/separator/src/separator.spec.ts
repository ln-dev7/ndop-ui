import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular/zoneless';
import { NdSeparator, type NdSeparatorOrientation } from './separator';

@Component({
  imports: [NdSeparator],
  template: `<div
    ndSeparator
    data-testid="separator"
    [orientation]="orientation()"
    [decorative]="decorative()"
  ></div>`,
})
class Host {
  readonly orientation = signal<NdSeparatorOrientation>('horizontal');
  readonly decorative = signal(false);
}

async function setup() {
  const { fixture } = await render(Host);
  return {
    host: fixture.componentInstance,
    element: screen.getByTestId('separator'),
    settle: () => fixture.whenStable(),
  };
}

describe('NdSeparator', () => {
  it('is a horizontal separator by default, without aria-orientation', async () => {
    const { element } = await setup();
    expect(element.getAttribute('role')).toBe('separator');
    expect(element.hasAttribute('aria-orientation')).toBe(false);
    expect(element.getAttribute('data-orientation')).toBe('horizontal');
  });

  it('announces vertical orientation', async () => {
    const { host, element, settle } = await setup();
    host.orientation.set('vertical');
    await settle();
    expect(element.getAttribute('aria-orientation')).toBe('vertical');
    expect(element.getAttribute('data-orientation')).toBe('vertical');
  });

  it('hides a decorative separator from assistive technology', async () => {
    const { host, element, settle } = await setup();
    host.orientation.set('vertical');
    host.decorative.set(true);
    await settle();
    expect(element.getAttribute('role')).toBe('none');
    expect(element.hasAttribute('aria-orientation')).toBe(false);
    expect(element.getAttribute('data-orientation')).toBe('vertical');
  });

  it('is not focusable', async () => {
    const { element } = await setup();
    expect(element.hasAttribute('tabindex')).toBe(false);
  });

  it('accepts the decorative attribute without a value', async () => {
    await render(`<div ndSeparator decorative data-testid="bare"></div>`, {
      imports: [NdSeparator],
    });
    expect(screen.getByTestId('bare').getAttribute('role')).toBe('none');
  });
});
