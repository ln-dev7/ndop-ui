import { Component } from '@angular/core';
import { Avatar, AvatarFallback, AvatarImage } from '@/ui/avatar/avatar';

/**
 * A picture kept with the code, so the example loads nothing from the
 * network. Use your users' image URLs.
 */
const PICTURE =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#a5b4fc"/><circle cx="16" cy="13" r="6" fill="#4338ca"/><path d="M5 32a11 11 0 0 1 22 0z" fill="#4338ca"/></svg>',
  );

/** An avatar with an image, and one that falls back to initials. */
@Component({
  selector: 'example-avatar-demo',
  imports: [Avatar, AvatarFallback, AvatarImage],
  template: `
    <div class="flex items-center gap-4">
      <span ndAvatar>
        <img ndAvatarImage [src]="picture" alt="Ada Lovelace" />
        <span ndAvatarFallback>AL</span>
      </span>
      <span ndAvatar size="lg">
        <img ndAvatarImage alt="Grace Hopper" />
        <span ndAvatarFallback>GH</span>
      </span>
      <span ndAvatar size="sm">
        <span ndAvatarFallback>KJ</span>
      </span>
    </div>
  `,
})
export class AvatarDemoExample {
  protected readonly picture = PICTURE;
}
