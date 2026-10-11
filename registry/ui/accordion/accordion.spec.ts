import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from './accordion';

describe('Accordion', () => {
  it('matches shadcn new-york-v4 classes, except its documented changes', () => {
    expect(
      missingShadcnClasses(
        'accordion',
        registrySource('ui/accordion/accordion.ts'),
        {
          // Logical alignment, so the label follows the text direction.
          'flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180':
            'flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-start text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180',
          // Ndop has no inner wrapper, and padding would show while the
          // height animates to 0; a spacer pseudo-element takes its place.
          'pt-0 pb-4': 'after:block after:h-4',
          // The chevron is the user's markup; the trigger styles it.
          'pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200':
            '[&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:translate-y-0.5 [&>svg]:text-muted-foreground [&>svg]:transition-transform [&>svg]:duration-200',
        },
      ),
    ).toEqual([]);
  });

  it('styles its parts', async () => {
    await render(
      `<div ndAccordion defaultValue="a">
        <div ndAccordionItem value="a">
          <h3 ndAccordionHeader><button ndAccordionTrigger>A</button></h3>
          <div ndAccordionContent class="text-base">A body</div>
        </div>
      </div>`,
      {
        imports: [
          Accordion,
          AccordionItem,
          AccordionHeader,
          AccordionTrigger,
          AccordionContent,
        ],
      },
    );
    const trigger = screen.getByRole('button', { name: 'A' });
    expect(trigger.getAttribute('data-slot')).toBe('accordion-trigger');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const region = screen.getByRole('region', { name: 'A' });
    expect(region.classList).toContain('text-base');
    expect(region.classList).not.toContain('text-sm');
  });
});
