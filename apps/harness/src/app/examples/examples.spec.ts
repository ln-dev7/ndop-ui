import { EXAMPLE_NAMES } from './example-names';
import { EXAMPLES } from './examples';

describe('EXAMPLES', () => {
  it('lists every registry example, and EXAMPLE_NAMES does too', () => {
    const names = Object.keys(EXAMPLES).sort();
    expect(names).toContain('button-variants');
    expect([...EXAMPLE_NAMES].sort()).toEqual(names);
  });

  it('loads an example component', async () => {
    const component = await EXAMPLES['button-variants']?.();
    expect(component?.name).toBe('ButtonVariantsExample');
  });
});
