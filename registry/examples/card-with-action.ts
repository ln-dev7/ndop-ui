import { Component } from '@angular/core';
import { Badge } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';

/** A card with a header action, content and a footer. */
@Component({
  selector: 'example-card-with-action',
  imports: [
    Badge,
    Button,
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
  ],
  template: `
    <section
      ndCard
      class="w-full max-w-sm"
      aria-labelledby="card-with-action-title"
    >
      <div ndCardHeader>
        <h2 ndCardTitle id="card-with-action-title">Pro plan</h2>
        <p ndCardDescription>Billed monthly, renews on November 1.</p>
        <div ndCardAction><span ndBadge variant="secondary">Current</span></div>
      </div>
      <div ndCardContent>
        <p class="text-3xl font-semibold">
          $24<span class="text-sm font-normal text-muted-foreground">
            / month</span
          >
        </p>
        <ul class="mt-4 grid gap-2 text-sm text-muted-foreground">
          <li>Unlimited projects</li>
          <li>10 team members</li>
          <li>Priority support</li>
        </ul>
      </div>
      <div ndCardFooter class="gap-2 border-t">
        <button ndButton variant="outline">Cancel plan</button>
        <button ndButton class="ms-auto">Upgrade</button>
      </div>
    </section>
  `,
})
export class CardWithActionExample {}
