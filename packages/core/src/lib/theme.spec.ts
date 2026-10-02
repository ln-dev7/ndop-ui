import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NdopTheme, provideNdop, type NdopThemeMode } from './theme';

function root(): HTMLElement {
  return TestBed.inject(DOCUMENT).documentElement;
}

function state(): { dark: boolean; system: string | null } {
  return {
    dark: root().classList.contains('dark'),
    system: root().getAttribute('data-ndop-theme'),
  };
}

describe('provideNdop', () => {
  afterEach(() => {
    root().classList.remove('dark');
    root().removeAttribute('data-ndop-theme');
  });

  it.each<[NdopThemeMode, ReturnType<typeof state>]>([
    ['system', { dark: false, system: 'system' }],
    ['light', { dark: false, system: null }],
    ['dark', { dark: true, system: null }],
  ])('applies %s at startup', (theme, expected) => {
    TestBed.configureTestingModule({ providers: [provideNdop({ theme })] });
    TestBed.inject(NdopTheme);
    expect(state()).toEqual(expected);
  });

  it('defaults to system', () => {
    TestBed.configureTestingModule({ providers: [provideNdop()] });
    expect(TestBed.inject(NdopTheme).mode()).toBe('system');
  });

  it('switches mode at runtime', () => {
    TestBed.configureTestingModule({
      providers: [provideNdop({ theme: 'dark' })],
    });
    const theme = TestBed.inject(NdopTheme);

    theme.set('system');
    expect(theme.mode()).toBe('system');
    expect(state()).toEqual({ dark: false, system: 'system' });

    theme.set('dark');
    expect(state()).toEqual({ dark: true, system: null });
  });
});
