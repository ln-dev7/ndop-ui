import { Component, signal } from '@angular/core';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import { Skeleton } from '@/ui/skeleton/skeleton';

/**
 * A card that shows skeletons while its content loads, and marks itself
 * busy so screen readers wait for the real content.
 */
@Component({
  selector: 'example-skeleton-card',
  imports: [
    Button,
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    Skeleton,
  ],
  template: `
    <div class="grid w-full max-w-sm gap-4">
      <section
        ndCard
        aria-labelledby="skeleton-card-title"
        [attr.aria-busy]="loading()"
      >
        <div ndCardHeader>
          <h2 ndCardTitle id="skeleton-card-title">Weekly report</h2>
          @if (loading()) {
            <div ndSkeleton class="h-4 w-40"></div>
          } @else {
            <p ndCardDescription>October 2 to October 8</p>
          }
        </div>
        <div ndCardContent class="grid gap-2">
          @if (loading()) {
            <div ndSkeleton class="h-24 w-full"></div>
            <div ndSkeleton class="h-4 w-3/4"></div>
          } @else {
            <p class="text-3xl font-semibold">1,284 visits</p>
            <p class="text-sm text-muted-foreground">Up 12% on last week.</p>
          }
        </div>
      </section>
      <button
        ndButton
        variant="outline"
        class="justify-self-start"
        (click)="loading.set(!loading())"
      >
        {{ loading() ? 'Show content' : 'Show loading' }}
      </button>
    </div>
  `,
})
export class SkeletonCardExample {
  protected readonly loading = signal(true);
}
