import { ogEyebrow, ogHtml } from './og-images';

const lookup = {
  componentGroup: (name: string) => (name === 'button' ? 'inputs' : undefined),
  blockCategory: (name: string) => (name === 'login-01' ? 'auth' : undefined),
};

describe('ogEyebrow', () => {
  it('names a component page by its catalog group', () => {
    expect(ogEyebrow('/docs/components/button', lookup)).toBe(
      'Components · Inputs',
    );
    expect(ogEyebrow('/docs/components/button/changelog', lookup)).toBe(
      'Changelog',
    );
  });

  it('names guides, primitives, blocks and themes', () => {
    expect(ogEyebrow('/docs/getting-started/theming', lookup)).toBe(
      'Guide · Get started',
    );
    expect(ogEyebrow('/docs/primitives/dialog', lookup)).toBe('Primitives');
    expect(ogEyebrow('/blocks', lookup)).toBe('Blocks');
    expect(ogEyebrow('/blocks/auth', lookup)).toBe('Blocks · Authentication');
    expect(ogEyebrow('/blocks/login-01', lookup)).toBe(
      'Blocks · Authentication',
    );
    expect(ogEyebrow('/themes/studio', lookup)).toBe('Themes');
  });

  it('names blog posts', () => {
    expect(ogEyebrow('/blog/updating-code-you-own', lookup)).toBe('Blog');
  });
});

describe('ogHtml', () => {
  it('escapes the title and shows the example on a card', () => {
    const html = ogHtml(
      { path: '/x', title: 'A <b> & C', eyebrow: 'Guide' },
      '/font.woff2',
      'data:image/png;base64,AAAA',
    );
    expect(html).toContain('A &lt;b&gt; &amp; C');
    expect(html).toContain('class="card"');
  });

  it('gives the home page the headline', () => {
    expect(
      ogHtml({ path: '/', title: 'Ndop UI', eyebrow: '' }, '/font.woff2'),
    ).toContain('Own your components.');
  });
});
