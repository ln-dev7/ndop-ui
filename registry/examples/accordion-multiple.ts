import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/accordion/accordion';

/**
 * Sections that open independently, with `multiple`. One is disabled,
 * and the open sections are bound to a signal.
 */
@Component({
  selector: 'example-accordion-multiple',
  imports: [
    Accordion,
    AccordionContent,
    AccordionHeader,
    AccordionItem,
    AccordionTrigger,
    NdIcon,
  ],
  template: `
    <div ndAccordion multiple [(value)]="open" class="w-md max-w-full">
      <div ndAccordionItem value="profile">
        <h2 ndAccordionHeader>
          <button ndAccordionTrigger>
            Profile <svg ndIcon="chevron-down"></svg>
          </button>
        </h2>
        <div ndAccordionContent>Your name, photo and bio.</div>
      </div>
      <div ndAccordionItem value="billing" disabled>
        <h2 ndAccordionHeader>
          <button ndAccordionTrigger>
            Billing <svg ndIcon="chevron-down"></svg>
          </button>
        </h2>
        <div ndAccordionContent>Managed by your organization.</div>
      </div>
      <div ndAccordionItem value="security">
        <h2 ndAccordionHeader>
          <button ndAccordionTrigger>
            Security <svg ndIcon="chevron-down"></svg>
          </button>
        </h2>
        <div ndAccordionContent>Password and two-factor authentication.</div>
      </div>
    </div>
  `,
})
export class AccordionMultipleExample {
  protected readonly open = signal<readonly string[]>(['profile', 'security']);
}
