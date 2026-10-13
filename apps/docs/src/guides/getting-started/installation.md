---
title: Installation
description: Set up Ndop UI in an Angular CLI, Nx or Analog app, then add your first component.
order: 2
---

Ndop works in standalone Angular 21 and 22 apps with an `app.config.ts`.
In Angular CLI workspaces, `ndop init` sets everything up, including
Tailwind CSS v4 if your app doesn't have it yet.

## Angular CLI

Create an app, or use an existing one:

```bash pm
npx @angular/cli new my-app --style tailwind
```

Move into its folder:

```bash
cd my-app
```

Set it up for Ndop:

```bash pm
npx @ndop/cli init
```

Then add a component:

```bash pm
npx @ndop/cli add dialog
```

`ndop init` asks before it changes anything. Pass `--yes` to skip the
question, or `--dry-run` to see every change as a diff first.

`ndop init` also adds `@ndop/cli` to your dev dependencies, so later
commands can run your project's own copy, at the version your lockfile
pins: `npx ndop add dialog`, or `pnpm exec ndop add dialog`. Pass
`--no-cli` to leave it out; see [CLI](/docs/getting-started/cli).

## Nx and Analog

`ndop init` reads `angular.json`, so it sets up Angular CLI workspaces only
for now. Nx and Analog apps can use Ndop with a few manual steps, after
which `ndop add` works as usual. Run every command from the workspace root.

:::steps

### Write `ndop.json`

At the root, pointing at your app's folders:

```json title="ndop.json"
{
  "$schema": "https://ndop.dev/schema/config.json",
  "style": "default",
  "tailwind": { "css": "apps/my-app/src/styles.css" },
  "aliases": {
    "ui": "apps/my-app/src/app/ui",
    "lib": "apps/my-app/src/app/lib",
    "blocks": "apps/my-app/src/app/blocks"
  },
  "importAlias": "@/",
  "iconLibrary": "lucide"
}
```

### Import Tailwind CSS and Ndop's styles

The stylesheet needs Tailwind CSS v4 and Ndop's token mechanics:

```css title="apps/my-app/src/styles.css"
@import 'tailwindcss';
@import '@ndop/core/styles.css';
```

### Add the theme and the helper files

```bash pm
npx @ndop/cli add default utils icons
```

### Register Ndop and the icons

In the app's `app.config.ts`:

```ts title="apps/my-app/src/app/app.config.ts"
import { ApplicationConfig } from '@angular/core';
import { provideNdop } from '@ndop/core';
import { provideIcons } from '@/lib/icons';

export const appConfig: ApplicationConfig = {
  providers: [provideNdop(), provideIcons()],
};
```

:::

Without an `@/*` path alias in the root `tsconfig.json`, `ndop add` rewrites
each component's `@/` imports to relative paths.

## What `init` changes

`ndop init` makes these changes, and running it again changes nothing:

- writes `ndop.json`, which records where components go;
- adds the `@/*` path alias to `tsconfig.json`, keeping its comments;
- sets up Tailwind CSS v4, if needed;
- imports `@ndop/core/styles.css` and the default theme's tokens into your
  global stylesheet;
- adds `src/app/lib/utils.ts` and `src/app/lib/icons.ts`;
- registers `provideNdop()` and `provideIcons()` in `app.config.ts`;
- installs `@ndop/core` and the theme's fonts with your package manager,
  and `@ndop/cli` as a dev dependency unless you pass `--no-cli`.

## Your first component

After `ndop add dialog`, import the parts you need from the file it wrote:

```ts title="src/app/app.ts"
import { Component } from '@angular/core';
import { DialogContent, DialogTitle, Dialog, DialogPortal, DialogTrigger } from '@/ui/dialog/dialog';
```

Every component page shows complete, tested examples.
