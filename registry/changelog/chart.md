# Chart

## 1.0.0

Stable release; no code changes since 0.2.0.

## 0.2.0

Axis labels keep their size at every width (ADR-0029). They were SVG
text, which scaled with the plot: about 6px on a phone, larger than the
text around them on a wide screen. `ChartAxis` is now an HTML band under
the plot, and the new `ChartLabel` places each label in it at its tick,
`[style.left.%]="(x / width) * 100"`; it also places labels over the plot,
such as a donut's total, and its `align` input keeps a label at the
plot's edge within it. Move your `<g ndChartAxis>` out of the `svg` into
a `<div ndChartAxis>` after it, turn each `<text>` into a
`<span ndChartLabel>`, and drop the room you kept under the plot for them
from its `viewBox` and scales.

The plot spans its width at its `viewBox`'s aspect ratio (`h-auto`
instead of `h-full`), so its positions are the same percentages of its
box. The grid and cursor lines stay a pixel wide whatever the plot's
size, so a plot can also take a fixed height with
`preserveAspectRatio="none"`.

## 0.1.0

First release.
