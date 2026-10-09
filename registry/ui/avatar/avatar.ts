import { computed, Directive, input } from '@angular/core';
import {
  NdAvatar,
  NdAvatarFallback,
  NdAvatarImage,
} from '@ndop/primitives/avatar';
import { cn } from '@/lib/utils';

/** Size of an {@link Avatar}. */
export type AvatarSize = 'default' | 'sm' | 'lg';

/**
 * A user's picture, with a fallback, such as initials, shown until the
 * image loads or when it fails (`@ndop/primitives/avatar`).
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
  hostDirectives: [NdAvatar],
  host: {
    'data-slot': 'avatar',
    '[attr.data-size]': 'size()',
    '[class]': 'classes()',
  },
})
export class Avatar {
  /** Size. */
  readonly size = input<AvatarSize>('default');

  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6',
      this.class(),
    ),
  );
}

/**
 * An avatar's image. It covers the fallback once loaded; its `alt` names
 * the avatar.
 *
 * @example
 * ```html
 * <img ndAvatarImage src="/me.png" alt="Valery Melou" />
 * ```
 */
@Directive({
  selector: 'img[ndAvatarImage]',
  hostDirectives: [{ directive: NdAvatarImage, inputs: ['src'] }],
  host: { 'data-slot': 'avatar-image', '[class]': 'classes()' },
})
export class AvatarImage {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'aspect-square size-full',
      'absolute inset-0 data-[status=error]:hidden data-[status=loading]:opacity-0',
      this.class(),
    ),
  );
}

/**
 * What an avatar shows until its image loads, or when it fails.
 *
 * @example
 * ```html
 * <span ndAvatarFallback>VM</span>
 * ```
 */
@Directive({
  selector: '[ndAvatarFallback]',
  hostDirectives: [NdAvatarFallback],
  host: { 'data-slot': 'avatar-fallback', '[class]': 'classes()' },
})
export class AvatarFallback {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      // Foreground text: shadcn's muted text on the muted fill is 4.3:1,
      // under WCAG's 4.5:1 for text this size.
      'flex size-full items-center justify-center rounded-full bg-muted text-sm text-foreground group-data-[size=sm]/avatar:text-xs',
      'data-[status=loaded]:invisible',
      this.class(),
    ),
  );
}

/**
 * A status dot on an avatar's corner, such as "online". Say the status in
 * text too, for screen readers.
 *
 * @example
 * ```html
 * <span ndAvatarBadge><span class="sr-only">Online</span></span>
 * ```
 */
@Directive({
  selector: '[ndAvatarBadge]',
  host: { 'data-slot': 'avatar-badge', '[class]': 'classes()' },
})
export class AvatarBadge {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'absolute end-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none',
      'group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden',
      'group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2',
      'group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
      this.class(),
    ),
  );
}

/**
 * Overlapping avatars, such as a team's.
 *
 * @example
 * ```html
 * <div ndAvatarGroup>…</div>
 * ```
 */
@Directive({
  selector: '[ndAvatarGroup]',
  host: { 'data-slot': 'avatar-group', '[class]': 'classes()' },
})
export class AvatarGroup {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background',
      'rtl:space-x-reverse',
      this.class(),
    ),
  );
}

/**
 * The count of avatars left out of a group, such as "+3".
 *
 * @example
 * ```html
 * <span ndAvatarGroupCount>+3</span>
 * ```
 */
@Directive({
  selector: '[ndAvatarGroupCount]',
  host: { 'data-slot': 'avatar-group-count', '[class]': 'classes()' },
})
export class AvatarGroupCount {
  /** Extra classes, merged last so they win. */
  readonly class = input('');

  protected readonly classes = computed(() =>
    cn(
      'relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
      this.class(),
    ),
  );
}
