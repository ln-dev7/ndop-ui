import { Component, input } from '@angular/core';

/**
 * One tile of a diamond band, in the mark's units (ADR-0026, "Pattern"):
 * the mark's chain of diamonds laid on its side (small, large, large,
 * small, each 14 units along the band, 14 or 24 across), between two
 * hairline rules, as on a strip of ndop cloth.
 */
const TILE = [
  'M0 20L7 13L14 20L7 27Z',
  'M14 20L21 8L28 20L21 32Z',
  'M28 20L35 8L42 20L35 32Z',
  'M42 20L49 13L56 20L49 27Z',
  'M0 1H56V2H0Z',
  'M0 38H56V39H0Z',
].join('');

/**
 * A strip of diamonds from Ndop's mark (ADR-0026, "Pattern"), as wide as
 * its host and 40px tall, in the host's text color. Decorative: hidden
 * from assistive technology. The tile is symmetric, so it needs no
 * mirroring in right-to-left layouts.
 *
 * @example
 * ```html
 * <docs-diamond-band patternId="top-band" class="text-brand/20" />
 * ```
 */
@Component({
  selector: 'docs-diamond-band',
  host: {
    class: 'pointer-events-none block h-10 select-none',
    'aria-hidden': 'true',
  },
  template: `
    <svg class="block size-full" focusable="false">
      <defs>
        <pattern
          [attr.id]="patternId()"
          x="50%"
          width="56"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path fill="currentColor" [attr.d]="tile" />
        </pattern>
      </defs>
      <rect
        width="100%"
        height="40"
        [attr.fill]="'url(#' + patternId() + ')'"
      />
    </svg>
  `,
})
export class DiamondBand {
  /** The SVG pattern's id, unique on the page. */
  readonly patternId = input.required<string>();

  protected readonly tile = TILE;
}
