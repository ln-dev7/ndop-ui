---
title: Theming
description: How Ndop's design tokens work, and how to change colors, radius and fonts.
order: 3
---

Ndop styles every component with CSS custom properties that follow
shadcn/ui's names, such as `--background`, `--primary` and `--radius`.
`ndop init` writes the default theme's values into your global stylesheet,
so the theme is yours to edit.

## Where the tokens live

Your stylesheet ends up with four blocks:

```css title="src/styles.css"
@import 'tailwindcss';
@import '@ndop/core/styles.css';

@theme {
  --font-sans: 'Geist Variable', sans-serif;
}

:root {
  --background: oklch(1 0 0);
  --primary: oklch(0.205 0 0);
  --radius: 0.625rem;
}

.dark {
  --background: oklch(0.145 0 0);
  --primary: oklch(0.922 0 0);
}
```

- `@ndop/core/styles.css` maps the tokens to Tailwind colors, so classes
  like `bg-primary` and `text-muted-foreground` work everywhere.
- `:root` holds the light values, `.dark` the dark ones.
- `@theme` sets Tailwind theme values such as fonts.

## Changing the theme

Edit the values in place. Colors use OKLCH, which keeps lightness steady
across hues:

```css title="src/styles.css"
:root {
  --primary: oklch(0.55 0.2 260); /* [!code ++] */
  --radius: 0.375rem; /* [!code ++] */
}
```

Every component picks up the change, because none of them hard-code a
color.

## Tokens

| Token                                | Used for                         |
| ------------------------------------ | -------------------------------- |
| `--background`, `--foreground`       | The page and its text.           |
| `--primary`, `--primary-foreground`  | Main actions.                    |
| `--secondary`, `--muted`, `--accent` | Quieter surfaces and hovers.     |
| `--destructive`                      | Actions that delete.             |
| `--border`, `--input`, `--ring`      | Borders, fields and focus rings. |
| `--radius`                           | The base corner radius.          |
| `--popover`, `--card`                | Floating and raised surfaces.    |
