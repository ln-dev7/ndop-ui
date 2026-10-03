---
title: Dark mode
description: Switch between light, dark and the operating system's scheme, without a flash on load.
order: 4
---

Ndop supports three color schemes: light, dark, and the operating system's
preference. `provideNdop()` applies one when the app starts, on the server
as well as in the browser, so server-rendered pages arrive in the right
colors.

## Choosing the starting scheme

```ts title="src/app/app.config.ts"
export const appConfig: ApplicationConfig = {
  providers: [provideNdop({ theme: 'system' })],
};
```

`system` is the default. It sets `data-ndop-theme="system"` on the root
element, and the `dark:` variant then follows `prefers-color-scheme` in CSS
alone, without any script.

## Switching at runtime

Inject `NdopTheme` and call `set`:

```ts
private readonly theme = inject(NdopTheme);

toggle() {
  this.theme.set(this.theme.mode() === 'dark' ? 'light' : 'dark');
}
```

`dark` adds the `dark` class to the root element, which turns on the
`.dark` token block and every `dark:` utility.

## Remembering the choice

Ndop doesn't store the choice, because where to keep it is up to your app.
If you save it, apply it again when the app starts, and before the first
paint if your pages are prerendered, as this site does.
