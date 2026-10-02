import { connectedPositions, placementOf } from './position';

describe('connectedPositions', () => {
  it('places below and falls back to above', () => {
    expect(
      connectedPositions({ side: 'bottom', align: 'start' }, 4, false),
    ).toEqual([
      {
        originX: 'start',
        overlayX: 'start',
        originY: 'bottom',
        overlayY: 'top',
        offsetY: 4,
      },
      {
        originX: 'start',
        overlayX: 'start',
        originY: 'top',
        overlayY: 'bottom',
        offsetY: -4,
      },
    ]);
  });

  it('flips the inline offset sign in RTL, since the CDK applies it physically', () => {
    const [ltr] = connectedPositions(
      { side: 'end', align: 'center' },
      8,
      false,
    );
    const [rtl] = connectedPositions({ side: 'end', align: 'center' }, 8, true);
    expect(ltr).toMatchObject({
      originX: 'end',
      overlayX: 'start',
      offsetX: 8,
    });
    expect(rtl).toMatchObject({
      originX: 'end',
      overlayX: 'start',
      offsetX: -8,
    });
  });

  it('round-trips every side and alignment through placementOf', () => {
    for (const side of ['top', 'bottom', 'start', 'end'] as const) {
      for (const align of ['start', 'center', 'end'] as const) {
        const [preferred] = connectedPositions({ side, align }, 4, false);
        expect(placementOf(preferred!)).toEqual({ side, align });
      }
    }
  });
});
