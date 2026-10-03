import { Component } from '@angular/core';
import { Separator } from '@/ui/separator/separator';

/** Horizontal and vertical separators between blocks of content. */
@Component({
  selector: 'example-separator-demo',
  imports: [Separator],
  template: `
    <div>
      <div class="space-y-1">
        <div class="text-sm leading-none font-medium">Ndop UI</div>
        <p class="text-muted-foreground text-sm">
          Accessible Angular components you own.
        </p>
      </div>
      <div ndSeparator class="my-4"></div>
      <div class="flex h-5 items-center space-x-4 text-sm">
        <div>Blog</div>
        <div ndSeparator orientation="vertical"></div>
        <div>Docs</div>
        <div ndSeparator orientation="vertical"></div>
        <div>Source</div>
      </div>
    </div>
  `,
})
export class SeparatorDemoExample {}
