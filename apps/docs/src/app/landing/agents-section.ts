import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NdIcon } from '@ndop/core';
import { SectionHeading } from './section-heading';

/** One line of the sample agent session. */
interface TranscriptLine {
  /** Who: the reader's prompt, a tool call, the agent's text, or output. */
  kind: 'prompt' | 'tool' | 'agent' | 'output' | 'problem';
  /** The line. */
  text: string;
  /** For a tool call: what it returned, in short. */
  result?: string;
}

/**
 * The landing page's agents section (ADR-0026, section 3): the MCP
 * server, docs agents can read, the guidance `ndop init` writes and
 * `ndop verify`, beside a short sample session that uses the MCP
 * server's real tool names and verify's real rule and message. Static:
 * nothing in it needs scripts.
 */
@Component({
  selector: 'docs-agents-section',
  imports: [RouterLink, NdIcon, SectionHeading],
  host: { class: 'block' },
  template: `
    <section
      aria-labelledby="agents-title"
      class="mx-auto max-w-[1440px] px-4 py-24 sm:py-32 lg:px-6"
    >
      <docs-section-heading
        headingId="agents-title"
        eyebrow="Agents"
        title="Built for agents."
        lead="Your coding agent reads the real API, installs what it needs and checks its own work, instead of guessing."
      />
      <div
        class="mx-auto mt-14 grid grid-cols-1 max-w-6xl items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12"
      >
        <div class="grid gap-6">
          <ul class="grid gap-1">
            @for (feature of features; track feature.title) {
              <li class="flex gap-3 rounded-xl p-4">
                <span
                  class="flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background"
                  aria-hidden="true"
                >
                  <svg [ndIcon]="feature.icon" class="size-4"></svg>
                </span>
                <div class="grid gap-1">
                  <h3 class="text-sm font-medium">{{ feature.title }}</h3>
                  <p class="text-sm text-muted-foreground">
                    {{ feature.text }}
                  </p>
                  <code
                    class="mt-1 w-fit rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground"
                    dir="ltr"
                    >{{ feature.code }}</code
                  >
                </div>
              </li>
            }
          </ul>
          <p class="px-4 text-sm text-muted-foreground">
            An eval suite of 92 prompts runs an agent with only the MCP server
            and scores each result with ndop verify.
          </p>
          <a
            routerLink="/docs/getting-started/agents-mcp"
            class="inline-flex w-fit items-center gap-1 px-4 text-sm font-medium underline-offset-4 hover:underline"
          >
            Set up your agent
            <svg ndIcon="arrow-right" class="size-4 rtl:rotate-180"></svg>
          </a>
        </div>
        <figure
          class="overflow-hidden rounded-2xl border bg-muted/30"
          aria-labelledby="agents-transcript-caption"
        >
          <figcaption
            id="agents-transcript-caption"
            class="flex h-11 items-center gap-2 border-b px-4 text-sm text-muted-foreground"
          >
            <svg ndIcon="terminal" class="size-4" aria-hidden="true"></svg>
            A sample session with the Ndop MCP server
          </figcaption>
          <ol
            class="grid grid-cols-1 gap-2.5 p-4 font-mono text-[0.8125rem] leading-6 sm:p-5"
            dir="ltr"
          >
            @for (line of transcript; track $index) {
              <li [class]="classes[line.kind]">
                @switch (line.kind) {
                  @case ('prompt') {
                    <span class="text-muted-foreground" aria-hidden="true"
                      >&gt;
                    </span>
                    <span class="sr-only">You: </span>{{ line.text }}
                  }
                  @case ('tool') {
                    <span class="text-muted-foreground" aria-hidden="true"
                      >●
                    </span>
                    <span class="sr-only">Tool call: </span>
                    <span class="font-medium text-foreground">{{
                      line.text
                    }}</span>
                    @if (line.result) {
                      <span class="text-muted-foreground">
                        <span aria-hidden="true"> → </span>
                        <span class="sr-only">, returned </span
                        >{{ line.result }}</span
                      >
                    }
                  }
                  @case ('problem') {
                    <span class="sr-only">Problem: </span>{{ line.text }}
                  }
                  @default {
                    {{ line.text }}
                  }
                }
              </li>
            }
          </ol>
        </figure>
      </div>
    </section>
  `,
})
export class AgentsSection {
  protected readonly features = [
    {
      icon: 'sparkles',
      title: 'MCP server',
      text: 'Every component, example, block and token for your agent, which can also install items and run verify.',
      code: 'npx -y @ndop/mcp',
    },
    {
      icon: 'file-text',
      title: 'Docs agents can read',
      text: 'An index of every page, and each page as Markdown at its URL plus .md.',
      code: '/llms.txt',
    },
    {
      icon: 'terminal',
      title: 'Guidance in your project',
      text: 'ndop init writes the installed components, tokens, where files go and the workflow into AGENTS.md.',
      code: 'AGENTS.md',
    },
    {
      icon: 'shield-check',
      title: 'ndop verify',
      text: 'Checks usage, build, lint and accessibility, and names the file, line, rule and fix.',
      code: 'npx @ndop/cli verify src/app',
    },
  ];

  protected readonly classes: Record<TranscriptLine['kind'], string> = {
    prompt: 'text-foreground',
    tool: 'text-muted-foreground',
    agent: 'text-muted-foreground italic',
    output: 'ps-4 text-muted-foreground',
    problem:
      'ms-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-foreground',
  };

  protected readonly transcript: TranscriptLine[] = [
    {
      kind: 'prompt',
      text: 'Add a notifications page with email and push switches.',
    },
    {
      kind: 'tool',
      text: 'get_project_context',
      result: 'Angular 22, zoneless; button, card, input installed',
    },
    {
      kind: 'tool',
      text: 'search_components "toggle setting"',
      result: 'switch, toggle, checkbox',
    },
    {
      kind: 'tool',
      text: 'get_component switch',
      result: 'usage, parts, inputs, keyboard map',
    },
    {
      kind: 'tool',
      text: 'add_items ["switch", "form-field"]',
      result: 'installed',
    },
    {
      kind: 'agent',
      text: 'Writes src/app/notifications/notifications.ts',
    },
    {
      kind: 'tool',
      text: 'verify src/app/notifications',
      result: '1 problem',
    },
    {
      kind: 'problem',
      text: 'notifications.ts:18 ndop/form-control-label: Nothing labels this control. Add an ndLabel with for set to its id, wrap it in a label, or give it aria-label.',
    },
    {
      kind: 'agent',
      text: 'Adds a label to the push switch',
    },
    {
      kind: 'tool',
      text: 'verify src/app/notifications',
      result: 'passed',
    },
  ];
}
