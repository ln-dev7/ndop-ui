# ndop

The unscoped `ndop` alias of the [Ndop UI](https://ndop.dev) CLI. It isn't
published: npm refused the name as too similar to existing packages
(ADR-0031). If npm releases it, this package can come back as a short alias.

Run the CLI from its own package instead:

```bash
npx @ndop/cli init
npx @ndop/cli add dialog
```

Installed as a dev dependency (`npm install -D @ndop/cli`), the command is
`ndop`.
