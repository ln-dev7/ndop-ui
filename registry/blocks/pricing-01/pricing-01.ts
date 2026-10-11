import { Component, computed, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/ui/accordion/accordion';
import { Badge } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/ui/card/card';
import { ToggleGroup, ToggleGroupItem } from '@/ui/toggle-group/toggle-group';

/** How often a plan is billed. */
type Billing = 'monthly' | 'yearly';

/** A plan's card: its prices per month for each billing period, or none. */
interface Plan {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly monthly: number | null;
  readonly yearly: number | null;
  readonly features: readonly string[];
  readonly cta: string;
  readonly href: string;
  readonly popular: boolean;
}

/**
 * A pricing page: three plans whose prices follow a Monthly / Yearly
 * toggle (a single-selection Toggle Group that always keeps one period
 * pressed), the most popular plan highlighted, and an Accordion of
 * frequently asked questions. A polite live region says which prices are
 * shown when the period changes.
 */
@Component({
  selector: 'block-pricing-01',
  imports: [
    Accordion,
    AccordionContent,
    AccordionHeader,
    AccordionItem,
    AccordionTrigger,
    Badge,
    Button,
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
    NdIcon,
    ToggleGroup,
    ToggleGroupItem,
  ],
  template: `
    <main class="min-h-svh bg-background px-4 py-16 sm:px-6 md:py-24">
      <div class="mx-auto flex max-w-6xl flex-col items-center gap-12">
        <div class="flex max-w-2xl flex-col items-center gap-4 text-center">
          <h1 class="text-4xl font-semibold tracking-tight md:text-5xl">
            Simple pricing for every team
          </h1>
          <p class="text-lg text-muted-foreground">
            Start free, upgrade when you grow. Every plan includes the full
            component library and updates.
          </p>
          <div
            ndToggleGroup
            variant="outline"
            aria-label="Billing period"
            class="mt-4"
            [value]="period()"
            (valueChange)="choosePeriod($event)"
          >
            <button ndToggleGroupItem value="monthly">Monthly</button>
            <button ndToggleGroupItem value="yearly" class="gap-2">
              Yearly
              <span ndBadge variant="secondary">Save 20%</span>
            </button>
          </div>
          <p class="sr-only" aria-live="polite">{{ status() }}</p>
        </div>

        <div class="grid w-full gap-6 lg:grid-cols-3">
          @for (plan of plans; track plan.id) {
            <section
              ndCard
              [attr.aria-labelledby]="'pricing-01-' + plan.id"
              [class]="
                plan.popular ? 'ring-2 ring-primary lg:-my-4 lg:py-10' : ''
              "
            >
              <div ndCardHeader>
                <div class="flex flex-wrap items-center gap-2">
                  <h2 ndCardTitle [id]="'pricing-01-' + plan.id">
                    {{ plan.name }}
                  </h2>
                  @if (plan.popular) {
                    <span ndBadge>Most popular</span>
                  }
                </div>
                <p ndCardDescription>{{ plan.description }}</p>
              </div>
              <div ndCardContent class="flex flex-1 flex-col gap-6">
                <p class="flex items-baseline gap-1">
                  @if (price(plan); as amount) {
                    <span class="text-4xl font-semibold tracking-tight">
                      {{ amount }}
                    </span>
                    <span class="text-sm text-muted-foreground">
                      per month{{
                        billing() === 'yearly' ? ', billed yearly' : ''
                      }}
                    </span>
                  } @else {
                    <span class="text-4xl font-semibold tracking-tight">
                      Custom
                    </span>
                  }
                </p>
                <ul
                  class="flex flex-col gap-3 text-sm"
                  [attr.aria-label]="plan.name + ' features'"
                >
                  @for (feature of plan.features; track feature) {
                    <li class="flex items-start gap-2">
                      <svg
                        ndIcon="check"
                        class="mt-0.5 size-4 shrink-0 text-primary"
                      ></svg>
                      <span>{{ feature }}</span>
                    </li>
                  }
                </ul>
              </div>
              <div ndCardFooter>
                <a
                  ndButton
                  class="w-full"
                  [href]="plan.href"
                  [variant]="plan.popular ? 'default' : 'outline'"
                >
                  {{ plan.cta }}
                  <span class="sr-only">: {{ plan.name }}</span>
                </a>
              </div>
            </section>
          }
        </div>

        <section
          class="flex w-full max-w-2xl flex-col gap-4"
          aria-labelledby="pricing-01-faq"
        >
          <h2
            id="pricing-01-faq"
            class="text-center text-2xl font-semibold tracking-tight"
          >
            Frequently asked questions
          </h2>
          <div ndAccordion collapsible>
            @for (question of questions; track question.value) {
              <div ndAccordionItem [value]="question.value">
                <h3 ndAccordionHeader>
                  <button ndAccordionTrigger>
                    {{ question.title }}
                    <svg ndIcon="chevron-down"></svg>
                  </button>
                </h3>
                <div ndAccordionContent class="text-muted-foreground">
                  {{ question.answer }}
                </div>
              </div>
            }
          </div>
        </section>
      </div>
    </main>
  `,
})
export class Pricing01Block {
  /** The pressed period, as the Toggle Group's array value. */
  protected readonly period = signal<readonly string[]>(['monthly']);

  protected readonly billing = computed<Billing>(() =>
    this.period().includes('yearly') ? 'yearly' : 'monthly',
  );

  protected readonly status = signal('');

  protected readonly plans: readonly Plan[] = [
    {
      id: 'hobby',
      name: 'Hobby',
      description: 'For side projects and trying things out.',
      monthly: 0,
      yearly: 0,
      features: ['Up to 3 projects', 'Community support', 'All components'],
      cta: 'Start for free',
      href: '/signup',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For professionals shipping real products.',
      monthly: 20,
      yearly: 16,
      features: [
        'Unlimited projects',
        'All blocks and themes',
        'Priority email support',
        'Team sharing for up to 10 people',
      ],
      cta: 'Get Pro',
      href: '/checkout?plan=pro',
      popular: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For organizations with custom needs.',
      monthly: null,
      yearly: null,
      features: [
        'Everything in Pro',
        'Unlimited seats',
        'Single sign-on',
        'Dedicated support and SLA',
      ],
      cta: 'Contact us',
      href: '/contact',
      popular: false,
    },
  ];

  protected readonly questions = [
    {
      value: 'switch',
      title: 'Can I switch plans later?',
      answer:
        'Yes. Upgrade or downgrade at any time; we prorate the difference on your next invoice.',
    },
    {
      value: 'yearly',
      title: 'How does yearly billing work?',
      answer:
        'You pay for twelve months up front at a 20% discount, and can cancel before the next renewal.',
    },
    {
      value: 'trial',
      title: 'Is there a free trial of Pro?',
      answer:
        'Pro comes with a 14-day trial. We only charge you once it ends, and remind you before.',
    },
    {
      value: 'payment',
      title: 'Which payment methods do you accept?',
      answer:
        'All major cards, and bank transfer on yearly and Enterprise plans.',
    },
  ];

  /**
   * Formats a plan's monthly price for the chosen period.
   *
   * @param plan - The plan.
   * @returns The price, such as `$16`, or `null` for a custom quote.
   */
  protected price(plan: Plan): string | null {
    const amount = this.billing() === 'yearly' ? plan.yearly : plan.monthly;
    return amount === null ? null : `$${amount}`;
  }

  /**
   * Keeps one period pressed and announces the prices shown.
   *
   * @param value - The Toggle Group's new value.
   */
  protected choosePeriod(value: readonly string[]): void {
    // Pressing the pressed item releases it; a new array pushes the
    // previous period back into the group.
    this.period.set(value.length > 0 ? value : [...this.period()]);
    this.status.set(
      this.billing() === 'yearly'
        ? 'Showing yearly prices, billed once a year.'
        : 'Showing monthly prices.',
    );
  }
}
