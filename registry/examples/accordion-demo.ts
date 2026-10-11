import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/accordion/accordion';

/**
 * Frequently asked questions, one open at a time. The open one closes
 * again on its own button, since the accordion is collapsible.
 */
@Component({
  selector: 'example-accordion-demo',
  imports: [
    Accordion,
    AccordionContent,
    AccordionHeader,
    AccordionItem,
    AccordionTrigger,
    NdIcon,
  ],
  template: `
    <div
      ndAccordion
      collapsible
      defaultValue="shipping"
      class="w-md max-w-full"
    >
      @for (question of questions; track question.value) {
        <div ndAccordionItem [value]="question.value">
          <h2 ndAccordionHeader>
            <button ndAccordionTrigger>
              {{ question.title }}
              <svg ndIcon="chevron-down"></svg>
            </button>
          </h2>
          <div ndAccordionContent>{{ question.answer }}</div>
        </div>
      }
    </div>
  `,
})
export class AccordionDemoExample {
  protected readonly questions = [
    {
      value: 'shipping',
      title: 'How long does shipping take?',
      answer:
        'Orders ship within two business days, and arrive in three to five.',
    },
    {
      value: 'returns',
      title: 'What is your return policy?',
      answer: 'Return any item within 30 days of delivery for a full refund.',
    },
    {
      value: 'support',
      title: 'How do I reach support?',
      answer: 'Email us any time; we answer within a day.',
    },
  ];
}
