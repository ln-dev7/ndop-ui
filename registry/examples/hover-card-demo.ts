import { Component } from '@angular/core';
import { Avatar, AvatarFallback } from '@/ui/avatar/avatar';
import { Button } from '@/ui/button/button';
import {
  HoverCardContent,
  HoverCard,
  HoverCardPortal,
  HoverCardTrigger,
} from '@/ui/hover-card/hover-card';

/**
 * A profile preview behind a username link. The link says where it goes
 * on its own; the card adds a glance for sighted users.
 */
@Component({
  selector: 'example-hover-card-demo',
  imports: [
    Avatar,
    AvatarFallback,
    Button,
    HoverCardContent,
    HoverCard,
    HoverCardPortal,
    HoverCardTrigger,
  ],
  template: `
    <ng-container ndHoverCard>
      <a ndButton variant="link" ndHoverCardTrigger href="#angular">
        &#64;angular
      </a>
      <ng-template ndHoverCardPortal>
        <div ndHoverCardContent class="w-80">
          <div class="flex justify-between gap-4">
            <span ndAvatar><span ndAvatarFallback>NG</span></span>
            <div class="space-y-1">
              <p class="text-sm font-semibold">&#64;angular</p>
              <p class="text-sm">
                The web development framework for building modern apps.
              </p>
              <p class="text-xs text-muted-foreground">Joined September 2016</p>
            </div>
          </div>
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class HoverCardDemoExample {}
