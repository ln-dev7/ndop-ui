// The CLI runs when its module loads; this package only exists so the
// unscoped name works with `npx ndop` (ADR-0011). The shebang comes from
// the build's banner.
import '@ndop/cli';
