import { customThemeResponse, encodeTheme, type ThemeVars } from '../../theme';
import { validate } from '../validate';

const THEME: ThemeVars = {
  theme: {},
  light: { background: 'oklch(1 0 0)', primary: 'oklch(0.5 0.2 260)' },
  dark: { background: 'oklch(0.145 0 0)' },
};

describe('customThemeResponse', () => {
  it('answers a valid theme with a cacheable registry:theme item', () => {
    const response = customThemeResponse(encodeTheme(THEME));
    expect(response.status).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.headers['Cache-Control']).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(response.headers['Access-Control-Allow-Origin']).toBe('*');
    const item = JSON.parse(response.body);
    expect(item).toMatchObject({
      name: 'custom',
      type: 'registry:theme',
      title: 'Custom theme',
      version: '1.0.0',
      cssVars: THEME,
    });
    expect(validate('registry-item', item).valid).toBe(true);
  });

  it('refuses a missing or unreadable theme with a plain 400', () => {
    for (const t of [null, '', 'not-a-theme']) {
      const response = customThemeResponse(t);
      expect(response.status).toBe(400);
      expect(response.headers['Content-Type']).toBe(
        'text/plain; charset=utf-8',
      );
      expect(response.headers['Cache-Control']).toBeUndefined();
      expect(response.body).not.toBe('');
    }
  });

  it('says what is wrong with a theme it refuses', () => {
    const bad = encodeTheme({
      theme: {},
      light: { background: 'red; } body { display: none' },
      dark: {},
    });
    expect(customThemeResponse(bad).body).toContain('"background"');
  });
});
