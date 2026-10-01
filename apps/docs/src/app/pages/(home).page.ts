import { Component } from '@angular/core';

/**
 * Docs home route (`/`).
 *
 * Placeholder until Phase 3 builds the landing page; it exists so the
 * prerender, hydration and e2e smoke test have a real route to exercise.
 */
@Component({
  selector: 'docs-home',
  template: `
    <main class="mx-auto max-w-3xl px-6 py-24">
      <h1 class="text-4xl font-semibold tracking-tight">Ndop UI</h1>
      <p class="mt-4 text-lg">
        Own your components. Update them anyway. Built for you and your agent.
      </p>
    </main>
  `,
})
export default class HomePage {}
