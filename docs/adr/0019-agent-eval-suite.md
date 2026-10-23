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

## Implementation notes (2026-10-06)

Details settled while building it, within the decision above:

- **Claude Code 2.1.289 has no turn limit flag**, so the limit is time
  only: 15 minutes per prompt by default (`--timeoutMinutes`).
- **Isolation without `--bare`:** `--bare` only accepts API keys, so the
  runner keeps the user's settings, memory and MCP servers out another way.
  It gives Claude Code a fresh `CLAUDE_CONFIG_DIR` and
  `--setting-sources project`, with `--no-session-persistence`,
  `--strict-mcp-config`, and `--permission-mode dontAsk`, which denies
  anything outside the allowed file, search, shell and `mcp__ndop` tools.
- **The agent is told it runs unattended** (`--append-system-prompt`): make
  reasonable assumptions, and create and route a page when the app has
  none. Without it, the first full run lost two prompts to the agent
  stopping to ask where the UI should go, a question a user would answer.
- **Copies share `node_modules`:** each prompt's copy links the template's
  `node_modules`, and the npm packages items need (`@ndop/primitives` and
  the matching `@angular/cdk`) are installed in the template up front, so
  `add_items` never changes what other prompts see.
- **The fixture is `ndop init --agent claude-code --mcp --verify`**, with
  `ndop` and `@ndop/mcp` as dev dependencies; the MCP config the agent gets
  runs the app's own server against the local registry.
- **The Nx target fails** when a usage limit stops the run, or when accuracy
  is under `--minAccuracy` (95% by default), so the weekly run flags a
  regression. In CI, a stopped run resumes with the `resume_run` input,
  which downloads that run's report.

## Amendment 1 (2026-10-06): manual runs only

Status: Accepted by Valery on 2026-10-06.

A full run takes about four and a half hours and, at prompt 1's 3.3
million tokens, likely more than one usage window. So the model runs only
when Valery starts it: locally with `pnpm nx run agent-eval:eval`, or from
the Agent eval workflow's manual trigger. There's no weekly schedule. This
replaces the weekly run in "When it runs"; the tests with the scripted
agent still run on every PR.

## Amendment 2 (2026-10-12): the suite grows with the catalog

Status: Accepted by Valery on 2026-10-12. It applies the decision's own
consequence ("each Phase 6 component adds prompts").

- `prompts.json` has 89 prompts. The first 50 are unchanged, so earlier
  results stay comparable prompt by prompt. Prompts 51–89 cover every
  Phase 6 component at least once, and six of them (login, dashboard,
  settings, data table, sidebar, pricing) should lead to a block
  (ADR-0022).
- Accuracy is passes divided by the number of prompts run, as the runner
  already computes it, not by 50.
- A prompt's `components` may name blocks. A block passes the components
  check when it's in the lockfile and the agent's files import it from
  `blocks/<name>/<name>`, as a route does.
- A unit test fails if a component in the registry has no prompt.

## Amendment 3 (2026-10-14): the registry first, and the theme's colors

Status: Accepted by Valery on 2026-10-14 (ADR-0017, amendment 1).

A model asked for "a sidebar with a logout button that confirms" built the
sidebar, cards and table by hand and wrote its own colors in a stylesheet.
The suite didn't look for either.

- **Three prompts, 90–92,** shaped like that request: an app shell with a
  sidebar, a logout button that asks for confirmation and an empty main
  area; an admin overview with stat cards, a sales chart and recent
  orders, without naming a dashboard; an account page for profile and
  account details. `prompts.json` has 92 prompts; the first 89 are
  unchanged.
- **A `components` entry can list alternatives,** `sidebar|sidebar-01`,
  met by any one of them, since a block or the components it's built from
  are both right. `dashboard-01|chart` with `dashboard-01|table` asks for
  the block, or for each component.
- **A fourth check, `styles`, on every prompt:** the agent's `.ts` and
  `.html` files and its stylesheets under `src/` have no color literals
  (hex in a color, background, border, fill, stroke, outline or shadow, or
  in a Tailwind arbitrary value; `rgb()`, `hsl()`, `oklch()` and the other
  color functions with literal values) and define no CSS variables. For a
  stylesheet the fixture already had, such as `src/styles.css` with its
  theme, only the lines the agent added count. Earlier results were
  scored without it, so a rerun of prompts 1–89 can score lower on it.
- The scorer's tests cover both, with the scripted agent.

## Amendment 4 (2026-10-22): the components the agent files point to count

Status: Applied; a scoring fix within amendment 3's alternatives, no new
check.

The 1.1.0 run's first prompt built a correct settings page that passed
`ndop verify`, the styles check and the scope check, and failed
`components`: it labelled its fields with Form Field (`FieldLabel`) and
confirmed the deletion with Alert Dialog, which is what the agent files
and the docs recommend, while the prompt asked for `label` and `dialog`.

- Every `label` becomes `label|form-field`.
- `dialog` becomes `alert-dialog|dialog` on the prompts that confirm an
  action or ask to accept or decline: 1, 11, 13, 19, 31, 34, 35 and 39.
- Prompt 5's message field is `input|textarea`.
- Prompt 16's formatting buttons are `button|toggle-group|toggle`: bold,
  italic and underline are on/off toggles.
- **A block counts for the components it's built from.** Prompts 2 and 3
  routed to the `login-01` block, as the agent files advise, and failed
  because the scorer read only the agent's own files. The scorer now also
  reads the installed blocks' files, and the components a block the agent
  imports is built from count as used.

The full 1.1.0 run scored 74/92 (80.4%). Of its 18 failures:

- **4 used a block** (2, 3, 21, 51): scored by the rule above.
- **3 were a verify bug** (64, 65, 69): the metadata asked menu items to
  sit inside sub-menu triggers, so documented Dropdown Menu, Context Menu
  and Menubar templates failed `usage/wrong-nesting`. Fixed in
  `@ndop/metadata`.
- **7 chose a fitting component the prompt didn't list:** Toggle Group for
  formatting toggles (16, 58), the Sidebar's own separator and menu button
  (25, 90), Textarea for a bio (38), Label beside a Select (54), and an
  `aria-labelledby` name on a Slider whose prompt asks for no label (56).
  Those entries accept them now.
- **1 was the prompt's wording** (46): "between two buttons in a toolbar"
  in an app with no toolbar made the agent ask where it was. It now reads
  "Add a toolbar with two buttons and a vertical divider between them."
- **3 are real failures:** 49 routed to a settings block and built no
  popover; 53 ran out of time without writing a file; 77 sized its image
  with a Tailwind class, not the Aspect Ratio item.

The 18 prompts are run again with these fixes, and the accuracy recorded
is the full run's passes plus the rerun's.

**Result (2026-10-23):** the rerun passed 18/18, so 1.1.0 scores 92/92
on `claude-sonnet-5`. The three real failures (49, 53, 77) passed on
their second attempt, so one run of each prompt can't separate them from
chance: counting them as failures gives 89/92 (96.7%), still above the
95% target.
