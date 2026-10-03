import { Component, signal } from '@angular/core';
import { render, screen } from '@testing-library/angular/zoneless';
import { NdIcon, provideNdopIcons, type NdIcons } from './icon';

const icons: NdIcons = {
  x: {
    size: 24,
    node: [
      ['path', { d: 'M18 6 6 18', key: '1bl5f8' }],
      ['path', { d: 'm6 6 12 12', key: 'd8bk6v' }],
    ],
  },
  dot: { size: 16, node: [['g', {}, [['circle', { cx: 8, cy: 8, r: 2 }]]]] },
};

@Component({
  imports: [NdIcon],
  template: `
    <svg data-testid="decorative" [ndIcon]="name()" class="size-4"></svg>
    <svg data-testid="labelled" ndIcon="x" aria-label="Close"></svg>
  `,
})
class Host {
  readonly name = signal('x');
}

async function setup() {
  const view = await render(Host, { providers: [provideNdopIcons(icons)] });
  return {
    host: view.fixture.componentInstance,
    settle: () => view.fixture.whenStable(),
    decorative: screen.getByTestId('decorative'),
  };
}

describe('NdIcon', () => {
  it('renders the named icon with Lucide defaults and no React keys', async () => {
    const { decorative } = await setup();
    expect(Array.from(decorative.children).map((c) => c.outerHTML)).toEqual([
      '<path d="M18 6 6 18"></path>',
      '<path d="m6 6 12 12"></path>',
    ]);
    expect(decorative.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(decorative.getAttribute('stroke')).toBe('currentColor');
    expect(decorative.getAttribute('fill')).toBe('none');
    expect(decorative.getAttribute('class')).toBe('size-4');
  });

  it('creates SVG-namespaced elements, including nested ones', async () => {
    const { host, settle, decorative } = await setup();
    host.name.set('dot');
    await settle();
    const circle = decorative.querySelector('circle');
    expect(circle?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(circle?.parentElement?.tagName).toBe('g');
    expect(decorative.getAttribute('viewBox')).toBe('0 0 16 16');
    expect(decorative.querySelectorAll('path')).toHaveLength(0);
  });

  it('is decorative unless it has an accessible name', async () => {
    const { decorative } = await setup();
    expect(decorative.getAttribute('aria-hidden')).toBe('true');
    expect(decorative.hasAttribute('role')).toBe(false);

    const labelled = screen.getByRole('img', { name: 'Close' });
    expect(labelled.hasAttribute('aria-hidden')).toBe(false);
  });

  it('warns and renders nothing for an unknown name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { host, settle, decorative } = await setup();
    host.name.set('missing');
    await settle();
    expect(decorative.children).toHaveLength(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"missing"'));
    warn.mockRestore();
  });
});
