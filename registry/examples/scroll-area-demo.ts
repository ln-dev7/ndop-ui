import { Component } from '@angular/core';
import { ScrollArea } from '@/ui/scroll-area/scroll-area';
import { Separator } from '@/ui/separator/separator';

/** A list of tags that scrolls vertically in a fixed height. */
@Component({
  selector: 'example-scroll-area-demo',
  imports: [ScrollArea, Separator],
  template: `
    <div ndScrollArea class="h-72 w-48 rounded-md border" aria-label="Tags">
      <div class="p-4">
        <h2 class="mb-4 text-sm leading-none font-medium">Tags</h2>
        @for (tag of tags; track tag; let last = $last) {
          <div class="text-sm">{{ tag }}</div>
          @if (!last) {
            <div ndSeparator decorative class="my-2"></div>
          }
        }
      </div>
    </div>
  `,
})
export class ScrollAreaDemoExample {
  protected readonly tags = Array.from(
    { length: 30 },
    (_, index) => `v1.2.0-beta.${30 - index}`,
  );
}
