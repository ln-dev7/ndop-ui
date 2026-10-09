import { Component } from '@angular/core';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from '@/ui/avatar/avatar';

/**
 * A team's avatars overlapping, with a count of the others and a status
 * badge that says its meaning in text too.
 */
@Component({
  selector: 'example-avatar-group',
  imports: [Avatar, AvatarBadge, AvatarFallback, AvatarGroup, AvatarGroupCount],
  template: `
    <div class="flex flex-wrap items-center gap-8">
      <div ndAvatarGroup role="group" aria-label="Design team">
        @for (member of team; track member) {
          <span ndAvatar>
            <span ndAvatarFallback>{{ member }}</span>
          </span>
        }
        <span ndAvatarGroupCount>+3</span>
      </div>
      <span ndAvatar size="lg">
        <span ndAvatarFallback>VM</span>
        <span ndAvatarBadge><span class="sr-only">Online</span></span>
      </span>
    </div>
  `,
})
export class AvatarGroupExample {
  protected readonly team = ['AL', 'GH', 'KJ'];
}
