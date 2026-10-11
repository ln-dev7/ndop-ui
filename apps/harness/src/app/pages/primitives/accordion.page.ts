import { Component } from '@angular/core';
import {
  NdAccordion,
  NdAccordionContent,
  NdAccordionHeader,
  NdAccordionItem,
  NdAccordionTrigger,
} from '@ndop/primitives/accordion';

/** Accordion demo (`/primitives/accordion`): a collapsible FAQ. */
@Component({
  selector: 'harness-accordion-demo',
  imports: [
    NdAccordion,
    NdAccordionItem,
    NdAccordionHeader,
    NdAccordionTrigger,
    NdAccordionContent,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Accordion</h1>
      <div ndAccordion collapsible class="grid w-80">
        @for (section of sections; track section.value) {
          <div
            ndAccordionItem
            [value]="section.value"
            [disabled]="section.disabled"
          >
            <h2 ndAccordionHeader>
              <button ndAccordionTrigger class="w-full py-2 text-start">
                {{ section.title }}
              </button>
            </h2>
            <div ndAccordionContent class="pb-2">{{ section.body }}</div>
          </div>
        }
      </div>
    </main>
  `,
})
export default class AccordionDemo {
  protected readonly sections = [
    { value: 'shipping', title: 'Shipping', body: 'Ships in two days.' },
    {
      value: 'returns',
      title: 'Returns',
      body: 'Free returns.',
      disabled: true,
    },
    { value: 'warranty', title: 'Warranty', body: 'Two years.' },
  ];
}
