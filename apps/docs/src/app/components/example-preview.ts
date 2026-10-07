import { NgComponentOutlet } from '@angular/common';
import { Component, input, type Type } from '@angular/core';
import { StaticHtml } from '../site/static-html';

/**
 * A live example on a component page: rendered inline, with its code
 * attached below, and hydrated when someone hovers, focuses or clicks it
 * (ADR-0016, "Previews"). An earlier click or key press is replayed once
 * it has. Hydrating previews as soon as they were visible was the biggest
 * task after startup on pages whose examples use overlays.
 * The site header's theme and direction toggles apply to it like to the
 * rest of the page (amendment 5).
 */
@Component({
  selector: 'docs-example-preview',
  imports: [NgComponentOutlet, StaticHtml],
  host: { class: 'block' },
  template: `
    <figure
      class="not-prose overflow-hidden rounded-xl border"
      [attr.aria-label]="title()"
    >
      <div
        class="preview-backdrop flex min-h-[350px] items-center justify-center bg-background p-10 text-foreground"
      >
        @if (component(); as type) {
          @defer (on immediate; hydrate on hover; hydrate on interaction) {
            <ng-container *ngComponentOutlet="type" />
          }
        }
      </div>
      <div [docsHtml]="codeHtml()"></div>
    </figure>
  `,
})
export class ExamplePreview {
  /** The example's title, for the card's label. */
  readonly title = input.required<string>();
  /** The example's component, loaded with the page's data. */
  readonly component = input.required<Type<unknown> | undefined>();
  /** The example's source, highlighted at build time. */
  readonly codeHtml = input.required<string>();
}
