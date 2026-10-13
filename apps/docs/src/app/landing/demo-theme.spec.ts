import { demoTokens } from './demo-theme';

describe('demoTokens', () => {
  it('pairs the two modes with light-dark()', () => {
    expect(
      demoTokens({
        theme: {},
        light: { primary: 'oklch(0.2 0 0)' },
        dark: { primary: 'oklch(0.9 0 0)' },
      }),
    ).toEqual({ '--primary': 'light-dark(oklch(0.2 0 0), oklch(0.9 0 0))' });
  });

  it('keeps values that are the same in both modes, and missing dark ones', () => {
    expect(
      demoTokens({
        theme: {},
        light: { radius: '0.625rem', ring: 'oklch(0.7 0 0)' },
        dark: {},
      }),
    ).toEqual({ '--radius': '0.625rem', '--ring': 'oklch(0.7 0 0)' });
  });

  it('carries the spacing unit', () => {
    expect(
      demoTokens({ theme: { spacing: '0.3rem' }, light: {}, dark: {} }),
    ).toEqual({ '--spacing': '0.3rem' });
  });
});
