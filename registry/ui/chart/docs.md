---
keywords: chart, graph, bar chart, line chart, area chart, pie chart, donut, radial, data visualization, svg
---

Charts are SVG you own: bar, line, area, pie, donut and radial charts
drawn in your component's template from the chart lib's scales, ticks and
path builders, with no outside dependency, so they render on the server.
`ChartContainer` sets a color per series from a config; the tooltip and
legend parts style the rest. The plot is one tab stop: the arrow keys
move between data points, showing the tooltip, while a polite live region
reads each value and a hidden table holds them all.

## Do

- Put the chart in a `figure` with a `figcaption` that says what it
  shows, and name the plot after it.
- Bind a polite live region to the active point, and include a table of
  the data, hidden or behind a toggle.
- Use the theme's chart colors, `var(--chart-1)` to `var(--chart-5)`.

## Don't

- Don't rely on color alone: label series in the legend and tooltip.
- Don't animate values on load; it delays reading them.
