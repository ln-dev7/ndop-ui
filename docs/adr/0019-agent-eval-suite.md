# ADR-0019: Agent eval suite

- Status: Accepted (approved by Valery on 2026-10-05)
- Date: 2026-10-05
- Phase: 4
- RFC: [RFC-0001](../../rfcs/0001-ndop-ui.md), "Success metrics" (agent
  accuracy), "Quality engineering and CI" (agent eval), Phase 4;
  ADR-0009, ADR-0018

## Context

RFC-0001's agent accuracy metric is "≥ 95% of generated snippets pass
`ndop verify`", measured by an "eval suite of 50 prompts run against the
MCP server", kept in `tools/`. Phase 4 is accepted when "Claude Code, given
only the MCP server and a fresh app, builds a settings page from a
one-line prompt and `ndop verify` passes; eval accuracy ≥ 95%."

Open questions the RFC leaves: which agent and model, how a run is scored
so that skipping Ndop components doesn't count as a pass, and when it runs,
since every run calls a paid model and its results vary.

The catalog has eight components (Badge, Button, Dialog, Input, Label,
Popover, Separator, Tooltip) and no blocks until Phase 6. A settings page
can be built from them (labeled inputs, sections split by separators, a
save button, a delete-account confirmation dialog, status badges), so
Phase 4 needs no new components.

## Decision

### The suite

- `tools/agent-eval` holds `prompts.json`: 50 entries, each with an `id`,
  a one-line `prompt`, the `components` the result must use, and a
  `category` (form, overlay, layout, page, edge case such as "a tooltip on
  an icon-only button"). Prompts only ask for what the catalog can build.
- Prompt 1 is the acceptance prompt: "Add a settings page where users
  edit their name and email, save, and can delete their account after
  confirming."
- Every prompt runs in its own copy of one fixture app: `ng new` (Angular
  22, zoneless, Tailwind) plus `ndop init --agent claude-code`, built once
  per run against the local registry and the workspace's packages from
  Verdaccio, as the install test does (ADR-0015).

### The agent

- Claude Code in headless mode, `@anthropic-ai/claude-code` pinned as a
  dev dependency, run as `claude -p` with only the Ndop MCP server
  configured (`--mcp-config` with `--strict-mcp-config`), file-editing and
  shell tools allowed, `--output-format json`, and a turn and time limit.
  Its flags are checked against the pinned version's `--help` when
  implemented.
- **It authenticates with a Claude subscription, not an API key.** The
  token comes from `claude setup-token`, a long-lived token tied to the
  subscription, passed as the `CLAUDE_CODE_OAUTH_TOKEN` environment
  variable. The runner refuses to start if `ANTHROPIC_API_KEY` is set, so
  a run can't silently bill an API account instead.
- The model is pinned in the suite's config by full name and printed in
  every report: `claude-sonnet-5`, chosen by Valery on 2026-10-05.
- A run counts against the subscription's usage limits. The runner runs
  prompts one at a time, records each result as it finishes, and on a
  usage-limit error stops and saves its progress; `--resume` continues
  from the first unfinished prompt, so a full run can span limit windows.

### Scoring

A prompt passes when all of these hold:

1. `ndop verify --json` on the files the agent created or changed exits
   0, with every step run (none skipped).
2. Those files use every component listed for the prompt, installed
   through the registry (in the lock), not hand-written lookalikes.
3. The agent changed nothing outside the app's `src/`, apart from the
   files `ndop add` writes.

Accuracy is passes divided by 50. The report (`dist/agent-eval/`) is
JSON plus a Markdown summary: each prompt's result, failed checks,
verify problems, turns, tokens and duration, and the screenshots.

### When it runs

- **Without a model, on every PR:** the runner and scorer have unit tests
  with a scripted fake agent that replays recorded edits, including
  failing ones, so CI checks the harness for free.
- **With the model:** a `workflow_dispatch` workflow and a weekly
  schedule on `master`, reading the token from a
  `CLAUDE_CODE_OAUTH_TOKEN` repository secret. It never runs on pull
  requests, so forks can't reach the secret, and subscription usage stays
  predictable. A run that hits a usage limit uploads its partial report
  and fails with a message saying to resume it.
- An Nx target, `nx run agent-eval:eval`, runs it locally, with
  `--prompts 1,7` to run a subset and `--repeat n` to measure variance.

### Phase 4 acceptance

- The settings page: prompt 1, run through the suite, passes
  `ndop verify`. Its screenshots and transcript are kept in the report.
- Accuracy: one full run with the pinned model at ≥ 95%, linked from the
  acceptance note.

## Consequences

- The metric means what the RFC says, and a prompt can't pass by
  avoiding Ndop.
- Model runs use subscription usage and vary between runs; they're
  scheduled, not gated per PR. A drop shows up within a week.
- No API billing. Valery creates the token with `claude setup-token` and
  adds it as the `CLAUDE_CODE_OAUTH_TOKEN` secret before the first
  scheduled run; it can be revoked and replaced at any time.
- A full run may need more than one usage window, which `--resume`
  handles.
- Prompts grow with the catalog: each Phase 6 component adds prompts, as
  RFC-0001's definition of done requires ("covered in the agent eval
  suite").
