import {
  afterNextRender,
  Directive,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  input,
  signal,
  untracked,
} from '@angular/core';

/** Whether an {@link NdAvatar}'s image has loaded. */
export type NdAvatarStatus = 'loading' | 'loaded' | 'error';

/**
 * The enclosing {@link NdAvatar}, injected by its parts.
 */
export const ND_AVATAR = new InjectionToken<NdAvatar>('ND_AVATAR');

/**
 * Root of an avatar: an image with a fallback, such as initials, shown
 * until the image loads or when it fails. It tracks the image's status,
 * which every part reflects as `data-status` for styling.
 *
 * @see spec.md in this entry point for the full contract.
 *
 * @example
 * ```html
 * <span ndAvatar>
 *   <img ndAvatarImage [src]="user.photo" [alt]="user.name" />
 *   <span ndAvatarFallback>VM</span>
 * </span>
 * ```
 */
@Directive({
  selector: '[ndAvatar]',
  exportAs: 'ndAvatar',
  providers: [{ provide: ND_AVATAR, useExisting: NdAvatar }],
  host: { '[attr.data-status]': 'status()' },
})
export class NdAvatar {
  /** Whether the image has loaded, failed, or is still loading. */
  readonly status = signal<NdAvatarStatus>('loading');
}

/**
 * An avatar's image: a native `img`, whose `alt` names the avatar. Until
 * it has loaded it's hidden from assistive technology, which reads the
 * fallback instead.
 *
 * @example
 * ```html
 * <img ndAvatarImage src="/me.png" alt="Valery Melou" />
 * ```
 */
@Directive({
  selector: 'img[ndAvatarImage]',
  host: {
    '[attr.src]': 'src()',
    '[attr.data-status]': 'avatar.status()',
    '[attr.aria-hidden]': 'avatar.status() === "loaded" ? null : "true"',
    '(load)': 'avatar.status.set("loaded")',
    '(error)': 'avatar.status.set("error")',
  },
})
export class NdAvatarImage {
  /** The image's URL; without one, the fallback shows. */
  readonly src = input<string | null | undefined>();

  protected readonly avatar = inject(ND_AVATAR);
  private readonly image =
    inject<ElementRef<HTMLImageElement>>(ElementRef).nativeElement;

  constructor() {
    effect(() => {
      const src = this.src();
      untracked(() => this.avatar.status.set(src ? 'loading' : 'error'));
    });
    // An image the browser finished before hydration fired its load or
    // error event with no listener attached.
    afterNextRender(() => {
      if (this.src() && this.image.complete) {
        this.avatar.status.set(
          this.image.naturalWidth > 0 ? 'loaded' : 'error',
        );
      }
    });
  }
}

/**
 * What an avatar shows until its image loads, or when it fails: initials
 * or an icon. Hidden from assistive technology once the image has loaded,
 * so the avatar is announced once.
 *
 * @example
 * ```html
 * <span ndAvatarFallback>VM</span>
 * ```
 */
@Directive({
  selector: '[ndAvatarFallback]',
  host: {
    '[attr.data-status]': 'avatar.status()',
    '[attr.aria-hidden]': 'avatar.status() === "loaded" ? "true" : null',
  },
})
export class NdAvatarFallback {
  protected readonly avatar = inject(ND_AVATAR);
}
