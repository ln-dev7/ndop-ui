import type { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Side of the trigger an overlay sits on. `start` and `end` are logical:
 * they swap in right-to-left layouts.
 */
export type NdSide = 'top' | 'bottom' | 'start' | 'end';

/**
 * Alignment of an overlay along its trigger's edge, also logical.
 */
export type NdAlign = 'start' | 'center' | 'end';

/**
 * Where an overlay actually sits after flipping to fit the viewport.
 */
export interface NdPlacement {
  /** Side of the trigger. */
  side: NdSide;
  /** Alignment along that side. */
  align: NdAlign;
}

const OPPOSITE: Record<NdSide, NdSide> = {
  top: 'bottom',
  bottom: 'top',
  start: 'end',
  end: 'start',
};

const VERTICAL_ALIGN: Record<NdAlign, ConnectedPosition['originY']> = {
  start: 'top',
  center: 'center',
  end: 'bottom',
};

/**
 * Builds one CDK connected position.
 *
 * @param side - Side of the trigger.
 * @param align - Alignment along that side.
 * @param offset - Gap between trigger and overlay, in pixels.
 * @param rtl - Whether the layout is right to left.
 * @returns The CDK position.
 */
function toPosition(
  side: NdSide,
  align: NdAlign,
  offset: number,
  rtl: boolean,
): ConnectedPosition {
  // The CDK resolves start/end for originX and overlayX by direction, but
  // applies offsetX in physical pixels, so the sign flips in RTL.
  const inlineSign = rtl ? -1 : 1;
  switch (side) {
    case 'top':
      return {
        originX: align,
        overlayX: align,
        originY: 'top',
        overlayY: 'bottom',
        offsetY: -offset,
      };
    case 'bottom':
      return {
        originX: align,
        overlayX: align,
        originY: 'bottom',
        overlayY: 'top',
        offsetY: offset,
      };
    case 'start':
      return {
        originX: 'start',
        overlayX: 'end',
        originY: VERTICAL_ALIGN[align],
        overlayY: VERTICAL_ALIGN[align],
        offsetX: -offset * inlineSign,
      };
    case 'end':
      return {
        originX: 'end',
        overlayX: 'start',
        originY: VERTICAL_ALIGN[align],
        overlayY: VERTICAL_ALIGN[align],
        offsetX: offset * inlineSign,
      };
  }
}

/**
 * CDK positions for an overlay: the preferred side first, then the
 * opposite side for when it doesn't fit.
 *
 * @param placement - Preferred side and alignment.
 * @param offset - Gap between trigger and overlay, in pixels.
 * @param rtl - Whether the layout is right to left.
 * @returns Positions for `withPositions`.
 */
export function connectedPositions(
  placement: NdPlacement,
  offset: number,
  rtl: boolean,
): ConnectedPosition[] {
  return [
    toPosition(placement.side, placement.align, offset, rtl),
    toPosition(OPPOSITE[placement.side], placement.align, offset, rtl),
  ];
}

/**
 * Reads the side and alignment back from the position the CDK chose.
 *
 * @param position - The applied position's anchor points.
 * @returns The logical placement.
 */
export function placementOf(
  position: Pick<
    ConnectedPosition,
    'originX' | 'originY' | 'overlayX' | 'overlayY'
  >,
): NdPlacement {
  if (position.originY === 'top' && position.overlayY === 'bottom') {
    return { side: 'top', align: position.originX };
  }
  if (position.originY === 'bottom' && position.overlayY === 'top') {
    return { side: 'bottom', align: position.originX };
  }
  const align: NdAlign =
    position.originY === 'top'
      ? 'start'
      : position.originY === 'bottom'
        ? 'end'
        : 'center';
  return { side: position.originX === 'start' ? 'start' : 'end', align };
}
