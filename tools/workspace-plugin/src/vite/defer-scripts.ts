import type { Plugin } from 'vite';

/**
 * Starts a built page's JavaScript after its first paint instead of while
 * its HTML is still being read. Vite's entry script and module preloads
 * begin downloading as soon as the HTML names them, so on a slow
 * connection the prerendered page's first paint competes with them;
 * Lighthouse's mobile profile counted about 200 KB of it against the docs'
 * first paint (ADR-0016, "Quality gates"). The entry and preloads are
 * started from a small inline module once a frame has painted, or at once
 * in a hidden tab, which paints no frames; the preloads still fetch the
 * chunks in parallel. Hydration starts a frame later, and Angular's event
 * replay keeps clicks made before it.
 *
 * @returns The Vite plugin, for production builds only.
 */
export function deferScripts(): Plugin {
  return {
    name: 'ndop:defer-scripts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const preloads: string[] = [];
        let entry: string | undefined;
        const stripped = html
          .replace(
            /<link\b[^>]*\brel="modulepreload"[^>]*\bhref="([^"]+)"[^>]*>\s*/g,
            (_tag, href: string) => {
              preloads.push(href);
              return '';
            },
          )
          .replace(
            /<script\b[^>]*\btype="module"[^>]*\bsrc="([^"]+)"[^>]*><\/script>/,
            (_tag, src: string) => {
              entry = src;
              return '%ndop-entry%';
            },
          );
        if (!entry) return html;
        const loader = `<script type="module">const start=()=>{for(const href of ${JSON.stringify(preloads)}){const link=document.createElement('link');link.rel='modulepreload';link.crossOrigin='';link.href=href;document.head.append(link)}import(${JSON.stringify(entry)})};document.visibilityState==='hidden'?start():requestAnimationFrame(()=>setTimeout(start))</script>`;
        return stripped.replace('%ndop-entry%', loader);
      },
    },
  };
}
