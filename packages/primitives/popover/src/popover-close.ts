import { Directive, inject } from '@angular/core';
import { ND_POPOVER } from './popover';

/**
 * Button that closes its {@link NdPopover} and returns focus to where it
 * was before opening.
 *
 * @example
 * ```html
 * <button ndPopoverClose>Done</button>
 * ```
 */
@Directive({
  selector: '[ndPopoverClose]',
  host: { '(click)': 'popover.close(true)' },
})
export class NdPopoverClose {
  /** The popover this button closes. */
  protected readonly popover = inject(ND_POPOVER);
}
