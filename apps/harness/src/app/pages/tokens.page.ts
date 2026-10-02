import { Component } from '@angular/core';

/**
 * Token check page (`/tokens`): fixed elements whose computed styles the e2e
 * suite reads to verify `@ndop/core/styles.css` and the default theme
 * (ADR-0006): colors, dark mode, density and motion.
 */
@Component({
  selector: 'harness-tokens',
  template: `
    <main class="p-8">
      <h1 class="text-2xl font-semibold">Tokens</h1>
      <div data-testid="surface" class="bg-primary text-primary-foreground p-4">
        Primary surface
      </div>
      <div data-testid="bordered" class="border p-4">Bordered</div>
      <div data-testid="density-default" class="p-4">Default density</div>
      <div data-density="compact">
        <div data-testid="density-compact" class="p-4">Compact density</div>
      </div>
      <div data-density="comfortable">
        <div data-testid="density-comfortable" class="p-4">
          Comfortable density
        </div>
      </div>
      <div
        data-testid="motion"
        class="transition-colors duration-(--duration-normal)"
      >
        Motion
      </div>
    </main>
  `,
})
export default class TokensPage {}
