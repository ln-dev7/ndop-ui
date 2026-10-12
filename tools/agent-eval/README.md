# Agent eval suite

Measures how well a coding agent builds Ndop UI screens, given only the
Ndop MCP server (RFC-0001's agent accuracy metric, ADR-0019). Each prompt in
`prompts.json` goes to headless Claude Code in a fresh copy of a
fixture app; the result passes when `ndop verify` finds no error in the
agent's files, they use the prompt's components and blocks installed
from the registry, and nothing outside `src/` changed but install files.

## Run it

It runs on a Claude subscription, never an API key:

```bash
claude setup-token
export CLAUDE_CODE_OAUTH_TOKEN=<the token>
pnpm nx run agent-eval:eval
```

| Option                | Effect                                                    |
| --------------------- | --------------------------------------------------------- |
| `--prompts=1,7`       | Run only these prompts.                                   |
| `--repeat=3`          | Run each prompt several times, to measure variance.       |
| `--resume`            | Continue the last report, after a usage limit stopped it. |
| `--model=<name>`      | Another model; `claude-sonnet-5` by default.              |
| `--timeoutMinutes=15` | Time limit per prompt.                                    |
| `--minAccuracy=0.95`  | Fail under this share of passing attempts.                |

The report goes to `dist/agent-eval/`: `report.json`, `summary.md`, and a
folder per attempt with the transcript, the agent's files and verify's
screenshots. The run stops at the subscription's usage limit and saves its
progress; `--resume` picks up from the first unfinished prompt.

It only runs when started by hand: locally, or from the Agent eval
workflow's manual trigger in GitHub, which needs the
`CLAUDE_CODE_OAUTH_TOKEN` repository secret. The runner and
scorer have tests that use a scripted agent, which run on every PR.
