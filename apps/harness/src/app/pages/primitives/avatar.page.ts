import { Component } from '@angular/core';
import {
  NdAvatar,
  NdAvatarFallback,
  NdAvatarImage,
} from '@ndop/primitives/avatar';

/** A small inline image, so the demo loads nothing from the network. */
const IMAGE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8" fill="#6366f1"/></svg>',
  );

/**
 * Avatar demo (`/primitives/avatar`): an image that loads and one that
 * fails, each with a fallback.
 */
@Component({
  selector: 'harness-avatar-demo',
  imports: [NdAvatar, NdAvatarImage, NdAvatarFallback],
  template: `
    <main class="grid justify-items-start gap-6 p-8">
      <h1 class="text-2xl font-semibold">Avatar</h1>
      <span ndAvatar data-testid="loads" class="relative flex size-10">
        <img
          ndAvatarImage
          [src]="image"
          alt="Ada Lovelace"
          class="absolute inset-0 size-full data-[status=loading]:opacity-0 data-[status=error]:hidden"
        />
        <span ndAvatarFallback class="data-[status=loaded]:hidden">AL</span>
      </span>
      <span ndAvatar data-testid="fails" class="relative flex size-10">
        <img
          ndAvatarImage
          [src]="broken"
          alt="Grace Hopper"
          class="absolute inset-0 size-full data-[status=loading]:opacity-0 data-[status=error]:hidden"
        />
        <span ndAvatarFallback class="data-[status=loaded]:hidden">GH</span>
      </span>
    </main>
  `,
})
export default class AvatarDemoPage {
  protected readonly image = IMAGE;
  // Not an image, so it fails without a request the server would route.
  protected readonly broken = 'data:image/png;base64,AAAA';
}
