import { createProgram } from './program';

describe('ndop program', () => {
  it('prints its version', () => {
    let output = '';
    const program = createProgram('1.2.3')
      .exitOverride()
      .configureOutput({ writeOut: (text) => (output += text) });
    expect(() => program.parse(['--version'], { from: 'user' })).toThrow();
    expect(output.trim()).toBe('1.2.3');
  });

  it('describes itself in help', () => {
    expect(createProgram('1.2.3').helpInformation()).toContain('Usage: ndop');
  });
});
