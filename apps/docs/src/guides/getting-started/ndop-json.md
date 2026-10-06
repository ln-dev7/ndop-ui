---
title: ndop.json
description: The project configuration ndop init writes, and every field it can contain.
order: 6
---

`ndop init` writes `ndop.json` at the root of your project. The CLI reads it
on every command to know where files go and which registries to use.

```json title="ndop.json"
{
  "$schema": "https://ndop.dev/schema/config.json",
  "style": "default",
  "tailwind": { "css": "src/styles.css" },
  "aliases": {
    "ui": "src/app/ui",
    "lib": "src/app/lib",
    "blocks": "src/app/blocks"
  },
  "importAlias": "@/",
  "iconLibrary": "lucide"
}
```

## Fields

| Field          | Meaning                                                                            |
| -------------- | ---------------------------------------------------------------------------------- |
| `style`        | The theme the project was set up with.                                             |
| `tailwind.css` | Your global stylesheet, where tokens and imports go.                               |
| `aliases`      | Folders for components (`ui`), helpers (`lib`) and examples and blocks (`blocks`). |
| `importAlias`  | The path alias that points at your app's source, `@/` by default.                  |
| `iconLibrary`  | The icon set `icons.ts` maps names to.                                             |
| `registry`     | Another default registry, as a URL containing `{name}`.                            |
| `registries`   | Namespaced registries, for `ndop add @acme/table`, with optional headers.          |
| `agents`       | The coding agents whose instructions the CLI writes, or `false` for none.          |
| `mcp`          | Whether the Ndop MCP server is registered in those agents' settings.               |

## Private registries

A namespaced registry can send headers, for example a token from an
environment variable:

```json title="ndop.json"
{
  "registries": {
    "@acme": {
      "url": "https://ui.acme.dev/r/{name}.json",
      "headers": { "Authorization": "Bearer ${ACME_TOKEN}" }
    }
  }
}
```

The CLI expands `${ACME_TOKEN}` from the environment, and fails with a
clear message when the variable isn't set.
