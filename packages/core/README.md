# @ndop/core

Utilities shared by Ndop styled items, app configuration, and the token
mechanics CSS.

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

Native overlay components require the shared styles import above. It supplies
closed-state visibility, native backdrop defaults, discrete display/overlay
transitions and reduced-motion behavior. Customize modal backdrops with
`backdrop:` utilities on the native `dialog`, rather than a separate overlay
node. Core and primitives 2.x are released together; see the
[native overlay migration guide](https://ndop.dev/docs/getting-started/native-overlays).
