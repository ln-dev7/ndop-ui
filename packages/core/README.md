# @ndop/core

Utilities shared by Ndop styled items, app configuration, and the token
mechanics CSS.

> Not released yet. See [RFC-0001](../../rfcs/0001-ndop-ui.md).

## Install

```bash
pnpm add @ndop/core
```

## Usage

```ts
import { provideNdop } from '@ndop/core';

export const appConfig: ApplicationConfig = {
  providers: [provideNdop({ theme: 'system' })],
};
```

```css
@import 'tailwindcss';
@import '@ndop/core/styles.css';
/* then your theme's :root and .dark token blocks */
```

- `cn(...classes)`: joins classes; later Tailwind utilities win.
- `variants(config)`: typed class-variance tables, with `VariantOf` for
  input types.
- `provideNdop({ theme })` and `NdopTheme`: color scheme, SSR-safe.

## Docs

https://ndop.dev
