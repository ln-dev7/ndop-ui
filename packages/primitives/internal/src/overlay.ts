import {
  createOverlayRef,
  type OverlayConfig,
  type OverlayRef,
} from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Platform } from '@angular/cdk/platform';
import {
  DestroyRef,
  inject,
  Injector,
  type TemplateRef,
  type ViewContainerRef,
} from '@angular/core';

/**
 * Options for {@link injectOverlay}.
 */
export interface NdOverlayOptions {
  /**
   * Builds the CDK overlay configuration when the overlay is first created.
   *
   * @param injector - Injector for the CDK `create*Strategy` functions.
   */
  config(injector: Injector): OverlayConfig;
  /**
   * Called for Escape pressed while this is the topmost overlay.
   *
   * @param event - The keydown event.
   */
  onEscape?(event: KeyboardEvent): void;
}

/**
 * Owns one CDK overlay for a primitive: created lazily, in the browser only,
 * on first attach, and disposed with the primitive.
 */
export interface NdOverlay {
  /**
   * Registers the template rendered into the overlay while it is attached.
   *
   * @param template - The `ng-template` holding the overlay content.
   * @param viewContainer - Where the template is declared, so its injector
   *   and change detection follow the declaring view.
   */
  setTemplate(
    template: TemplateRef<unknown>,
    viewContainer: ViewContainerRef,
  ): void;
  /**
   * Renders the template into the overlay.
   *
   * @returns The overlay, or `null` during SSR or before a template is set.
   */
  attach(): OverlayRef | null;
  /** Removes the rendered template, keeping the overlay for reuse. */
  detach(): void;
}

/**
 * Creates an {@link NdOverlay}. Call it in an injection context.
 *
 * @param options - Overlay configuration and Escape handling.
 * @returns The overlay controller.
 */
export function injectOverlay(options: NdOverlayOptions): NdOverlay {
  const injector = inject(Injector);
  const browser = inject(Platform).isBrowser;
  let ref: OverlayRef | undefined;
  let portal: TemplatePortal | undefined;

  inject(DestroyRef).onDestroy(() => ref?.dispose());

  const ensureRef = (): OverlayRef => {
    if (!ref) {
      ref = createOverlayRef(injector, options.config(injector));
      ref.keydownEvents().subscribe((event) => {
        if (event.key === 'Escape' && options.onEscape) {
          options.onEscape(event);
        }
      });
    }
    return ref;
  };

  return {
    setTemplate(template, viewContainer) {
      portal = new TemplatePortal(template, viewContainer);
    },
    attach() {
      // Overlays never render on the server; the content is interactive-only
      // and the overlay container is a document-level element.
      if (!browser || !portal) {
        return null;
      }
      const overlay = ensureRef();
      if (!overlay.hasAttached()) {
        overlay.attach(portal);
      }
      return overlay;
    },
    detach() {
      if (ref?.hasAttached()) {
        ref.detach();
      }
    },
  };
}
