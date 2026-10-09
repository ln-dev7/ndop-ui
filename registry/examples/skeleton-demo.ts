import { Component } from '@angular/core';
import { Skeleton } from '@/ui/skeleton/skeleton';

/** Placeholders for a profile while it loads. */
@Component({
  selector: 'example-skeleton-demo',
  imports: [Skeleton],
  template: `
    <div class="flex items-center gap-4" aria-busy="true">
      <span class="sr-only">Loading profile</span>
      <div ndSkeleton class="size-12 rounded-full"></div>
      <div class="grid gap-2">
        <div ndSkeleton class="h-4 w-56"></div>
        <div ndSkeleton class="h-4 w-48"></div>
      </div>
    </div>
  `,
})
export class SkeletonDemoExample {}
