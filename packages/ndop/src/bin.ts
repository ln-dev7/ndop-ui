// The CLI runs when its module loads; this package only exists so the
// unscoped name can serve as an alias of `@ndop/cli` once npm releases it
// (ADR-0031). The shebang comes from the build's banner.
import '@ndop/cli';
