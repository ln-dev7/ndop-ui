import { Component } from '@angular/core';
import { Avatar, AvatarFallback } from '@/ui/avatar/avatar';
import { Button } from '@/ui/button/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/ui/empty/empty';

/** An empty state with an avatar as its media, in the default style. */
@Component({
  selector: 'example-empty-avatar',
  imports: [
    Avatar,
    AvatarFallback,
    Button,
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
  ],
  template: `
    <div ndEmpty>
      <div ndEmptyHeader>
        <div ndEmptyMedia>
          <span ndAvatar size="lg"><span ndAvatarFallback>LR</span></span>
        </div>
        <h2 ndEmptyTitle>Lena is away</h2>
        <p ndEmptyDescription>
          She'll reply to messages when she's back on Monday.
        </p>
      </div>
      <div ndEmptyContent>
        <button ndButton variant="outline" size="sm">Leave a message</button>
      </div>
    </div>
  `,
})
export class EmptyAvatarExample {}
