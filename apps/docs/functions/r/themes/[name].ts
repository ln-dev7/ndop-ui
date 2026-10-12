// By path: Wrangler bundles Functions on its own, without the workspace's
// tsconfig paths. The module has no dependencies, so it bundles whole.
// eslint-disable-next-line @nx/enforce-module-boundaries
import { customThemeResponse } from '../../../../../packages/schema/src/theme';

/**
 * What this Function reads of Cloudflare Pages' `EventContext`
 * (https://developers.cloudflare.com/pages/functions/api-reference/).
 */
export interface ThemeRouteContext {
  /** The incoming request. */
  request: Request;
  /** The dynamic route's values: `name` is the file name asked for. */
  params: { name?: string | string[] };
  /** Passes the request on to the static assets. */
  next: () => Promise<Response>;
}

/**
 * The site's only server code (ADR-0016, amendment 12; ADR-0023): serves
 * theme URLs, `/r/themes/custom.json?t=…`, by decoding `t` into a
 * `registry:theme` item. It stores nothing and reads nothing but the URL.
 *
 * Pages routes a Function by its file's path, and its docs only show
 * names without dots, so the route is the documented dynamic segment
 * `[name]`: any other file under `/r/themes/` falls through to the static
 * site.
 *
 * @param context - The request, the route's `name` and the asset server.
 * @returns The theme item, a 400 with a plain message, or the static file.
 */
export function onRequestGet(context: ThemeRouteContext): Promise<Response> {
  if (context.params.name !== 'custom.json') return context.next();
  const { status, headers, body } = customThemeResponse(
    new URL(context.request.url).searchParams.get('t'),
  );
  return Promise.resolve(new Response(body, { status, headers }));
}
