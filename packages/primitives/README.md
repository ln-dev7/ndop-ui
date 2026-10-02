# @ndop/primitives

Headless, signal-based Angular directives for state, keyboard, focus, ARIA and
overlay wiring. No styles.

> Not released yet. Primitives land in Phase 1 of
> [RFC-0001](../../rfcs/0001-ndop-ui.md).

## Install

```bash
pnpm add @ndop/primitives @angular/cdk
```

## Usage

Each primitive is its own entry point (ADR-0004):

```ts
import { NdDialog } from '@ndop/primitives/dialog';
```

Every primitive folder has a `spec.md` with its WAI-ARIA pattern, roles,
keyboard map, focus and RTL rules.

## Docs

https://ndop.dev
