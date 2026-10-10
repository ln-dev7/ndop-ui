import { NgComponentOutlet } from '@angular/common';
import { Component, inject, resource } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { EXAMPLES } from '../../examples/examples';

/**
 * Example page (`/examples/<name>`): renders one registry example on its
 * own, as a user's app would.
 */
@Component({
  selector: 'harness-example',
  imports: [NgComponentOutlet],
  template: `
    <main class="mx-auto max-w-3xl p-8">
      <h1 class="mb-8 text-2xl font-semibold">{{ name() }}</h1>
      @if (example.value(); as component) {
        <ng-container *ngComponentOutlet="component" />
      } @else if (example.status() === 'resolved') {
        <p class="text-muted-foreground">No example with this name.</p>
      }
    </main>
  `,
})
export default class ExamplePage {
  protected readonly name = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => params.get('name') ?? ''),
    ),
    { initialValue: '' },
  );

  /** The example's component, loaded on its own. */
  protected readonly example = resource({
    params: () => ({ name: this.name() }),
    loader: ({ params }) =>
      EXAMPLES[params.name]?.() ?? Promise.resolve(undefined),
  });
}
