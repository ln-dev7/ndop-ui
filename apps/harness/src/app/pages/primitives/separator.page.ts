import { Component } from '@angular/core';
import { NdSeparator } from '@ndop/primitives/separator';

/**
 * Separator demo (`/primitives/separator`): horizontal, vertical and
 * decorative separators.
 */
@Component({
  selector: 'harness-separator-demo',
  imports: [NdSeparator],
  template: `
    <main class="p-8">
      <h1 class="text-2xl font-semibold">Separator</h1>
      <p class="mt-4">Account</p>
      <div
        ndSeparator
        data-testid="horizontal"
        class="bg-border my-4 h-px w-64"
      ></div>
      <div class="flex h-6 items-center gap-4">
        <span>Profile</span>
        <div
          ndSeparator
          orientation="vertical"
          data-testid="vertical"
          class="bg-border h-full w-px"
        ></div>
        <span>Billing</span>
        <div
          ndSeparator
          orientation="vertical"
          decorative
          data-testid="decorative"
          class="bg-border h-full w-px"
        ></div>
        <span>Team</span>
      </div>
    </main>
  `,
})
export default class SeparatorDemo {}
