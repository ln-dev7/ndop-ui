import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import { extname, join, normalize, relative, sep } from 'node:path';
import { chromium, type Page } from 'playwright-core';
import { VERIFY_DIR } from './build';
import type { FoundComponent } from './components';
import type { Problem } from './types';

/** axe rules about a whole page, which a harness rendering one component can't meet. */
const PAGE_RULES = ['region', 'landmark-one-main', 'page-has-heading-one'];

/** Content types the harness serves. */
const TYPES: Record<string, string> = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/** The outcome of rendering. */
export interface RenderResult {
  /** Problems found in the browser. */
  problems: Problem[];
  /** Project-relative screenshot paths. */
  screenshots: string[];
  /** Why rendering didn't happen, when it didn't. */
  skipped?: string;
}

/** An `svg[ndIcon]` that drew nothing. */
export interface EmptyIcon {
  /** The icon name it asks for. */
  name: string;
  /**
   * Whether the `NdIcon` directive ran on it. When it didn't, the
   * component doesn't import `NdIcon`; when it did, no icon of that name
   * is registered.
   */
  applied: boolean;
}

/**
 * Waits for every `svg[ndIcon]` on a page to draw, so a screenshot shows
 * the icons, and returns the ones that still haven't when the time is up.
 *
 * @param page - A rendered page.
 * @param timeout - How long to wait, in milliseconds.
 * @returns The empty icons, in document order.
 */
export async function emptyIcons(
  page: Page,
  timeout = 2_000,
): Promise<EmptyIcon[]> {
  // Static attributes on an SVG element keep their case when Angular sets
  // them, but the HTML parser lowercases them, so both spellings count.
  const selector = 'svg[ndIcon], svg[ndicon]';
  await page
    .waitForFunction(
      (icons) =>
        [...document.querySelectorAll(icons)].every(
          (svg) => svg.childElementCount > 0,
        ),
      selector,
      { timeout },
    )
    .catch(() => undefined);
  return page.evaluate(
    (icons) =>
      [...document.querySelectorAll(icons)]
        .filter((svg) => svg.childElementCount === 0)
        .map((svg) => ({
          name: svg.getAttribute('ndIcon') ?? svg.getAttribute('ndicon') ?? '',
          // NdIcon always binds viewBox, so without one it never ran.
          applied: svg.hasAttribute('viewBox'),
        })),
    selector,
  );
}

/**
 * Problems for a component's empty icons, one per icon name.
 *
 * @param component - The component.
 * @param icons - Its empty icons.
 * @returns The problems, at the line of each icon in the template.
 */
function iconProblems(
  component: FoundComponent,
  icons: readonly EmptyIcon[],
): Problem[] {
  const seen = new Set<string>();
  return icons.flatMap((icon) => {
    if (seen.has(icon.name)) return [];
    seen.add(icon.name);
    const template = component.template;
    const before = template?.text.split(`ndIcon="${icon.name}"`)[0];
    const line =
      (template?.start.line ?? 0) +
      (before !== undefined && before !== template?.text
        ? before.split('\n').length
        : 1);
    return [
      {
        file: template?.file ?? component.file,
        line,
        column: 1,
        rule: 'render/empty-icon',
        severity: 'error' as const,
        message: icon.applied
          ? `<svg ndIcon="${icon.name}"> in ${component.name} drew nothing: no icon named "${icon.name}" is registered.`
          : `<svg ndIcon="${icon.name}"> in ${component.name} drew nothing: ${component.name} doesn't import NdIcon, so the attribute does nothing.`,
        fix: icon.applied
          ? `Add "${icon.name}" to the icons in the lib folder's icons.ts, and keep provideIcons() in app.config.ts's providers.`
          : "Add NdIcon to the component's imports: import { NdIcon } from '@ndop/core'.",
      },
    ];
  });
}

/** One axe violation, as `axe.run` returns it. */
interface Violation {
  id: string;
  help: string;
  helpUrl: string;
  nodes: { target: string[]; failureSummary?: string }[];
}

/**
 * Renders each component in the built harness, in Chromium, in light and
 * dark (ADR-0018): waits for its icons to draw and reports those that
 * don't, runs axe on it, reports console errors, and saves a screenshot
 * of each to `.ndop/verify/<Name>.<scheme>.png`. Components
 * with required inputs are skipped, since verify can't invent their data.
 *
 * @param root - Workspace root.
 * @param output - Folder of the built harness.
 * @param components - Components to render.
 * @returns Problems and screenshots, or why it was skipped.
 */
export async function renderComponents(
  root: string,
  output: string,
  components: readonly FoundComponent[],
): Promise<RenderResult> {
  if (!existsSync(chromium.executablePath())) {
    return {
      problems: [],
      screenshots: [],
      skipped:
        "Chromium isn't installed for Playwright; run `npx playwright install chromium`.",
    };
  }
  const axe = await readFile(
    createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
    'utf-8',
  );
  const server = createServer((request, response) => {
    const path = normalize(
      join(output, new URL(request.url ?? '/', 'http://localhost').pathname),
    );
    const file =
      path.startsWith(output + sep) && existsSync(path) && extname(path)
        ? path
        : join(output, 'index.html');
    readFile(file).then(
      (body) =>
        response
          .writeHead(200, {
            'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
          })
          .end(body),
      () => response.writeHead(404).end(),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const browser = await chromium.launch();
  const problems: Problem[] = [];
  const screenshots: string[] = [];
  try {
    for (const component of components) {
      const at = {
        file: component.template?.file ?? component.file,
        line: (component.template?.start.line ?? 0) + 1,
        column: 1,
      };
      if (component.requiredInputs.length) {
        problems.push({
          ...at,
          rule: 'render/skipped',
          severity: 'warning',
          message: `${component.name} wasn't rendered: it has required inputs (${component.requiredInputs.join(', ')}), whose values verify can't invent. Verify the page that uses it.`,
        });
        continue;
      }
      for (const scheme of ['light', 'dark'] as const) {
        const page = await browser.newPage({
          colorScheme: scheme,
          viewport: { width: 1280, height: 800 },
        });
        const errors: string[] = [];
        page.on('console', (message) => {
          if (message.type() === 'error') errors.push(message.text());
        });
        page.on('pageerror', (error) => errors.push(error.message));
        await page.goto(`${url}/?c=${encodeURIComponent(component.name)}`);
        await page
          .waitForSelector('ndop-verify > :not(ng-container)', {
            timeout: 10_000,
          })
          .catch(() =>
            errors.push(`${component.name} didn't render within 10 seconds.`),
          );
        await page.waitForLoadState('networkidle');
        const icons = await emptyIcons(page);
        if (scheme === 'light') {
          problems.push(...iconProblems(component, icons));
        }
        await page.addScriptTag({ content: axe });
        const violations = (await page.evaluate(
          (rules) =>
            (
              window as unknown as {
                axe: {
                  run: (
                    context: unknown,
                    options: unknown,
                  ) => Promise<{ violations: unknown[] }>;
                };
              }
            ).axe
              .run(document, {
                resultTypes: ['violations'],
                rules: Object.fromEntries(
                  rules.map((rule) => [rule, { enabled: false }]),
                ),
              })
              .then((result) => result.violations),
          PAGE_RULES,
        )) as Violation[];
        for (const violation of violations) {
          problems.push({
            ...at,
            rule: `axe/${violation.id}`,
            severity: 'error',
            message: `${violation.help} (${scheme}): ${violation.nodes
              .map((node) => node.target.join(' '))
              .join(', ')}.`,
            fix: violation.helpUrl,
          });
        }
        for (const error of [...new Set(errors)]) {
          problems.push({
            ...at,
            rule: 'render/console-error',
            severity: 'error',
            message: `${component.name} (${scheme}): ${error}`,
          });
        }
        const path = join(root, VERIFY_DIR, `${component.name}.${scheme}.png`);
        await page.screenshot({ path, fullPage: true });
        screenshots.push(relative(root, path));
        await page.close();
      }
    }
  } finally {
    await browser.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  return { problems, screenshots };
}
