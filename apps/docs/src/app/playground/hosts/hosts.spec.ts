import { Component, type Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Badge } from '@/ui/badge/badge';
import { Button } from '@/ui/button/button';
import * as dialog from '@/ui/dialog/dialog';
import { Input } from '@/ui/input/input';
import * as popover from '@/ui/popover/popover';
import { Separator } from '@/ui/separator/separator';
import * as tooltip from '@/ui/tooltip/tooltip';
import type { PartData } from '../../components/component-data';
import {
  controlsFor,
  defaultValues,
  snippetFor,
  type PlaygroundControl,
  type PlaygroundValues,
} from '../playground';
import { playgrounds } from '.';

/** Compiles a snippet, given as its template. */
@Component({ template: '' })
class Snippet {}

/** Every registry part a snippet may use. */
const PARTS: Type<unknown>[] = [
  Badge,
  Button,
  Input,
  Separator,
  ...Object.values(dialog),
  ...Object.values(popover),
  ...Object.values(tooltip),
];

/** The metadata the docs build reads, written by the registry build. */
const METADATA = join(
  import.meta.dirname,
  '../../../../../../dist/registry/r/metadata',
);

/**
 * A part as the page gets it, from the built metadata.
 *
 * @param item - Registry item name.
 * @param name - Part name.
 * @returns The part.
 */
function partOf(item: string, name: string): PartData {
  const metadata = JSON.parse(
    readFileSync(join(METADATA, `${item}.json`), 'utf-8'),
  );
  const part = metadata.parts.find(
    (entry: { name: string }) => entry.name === name,
  );
  const members = (list: object[]) =>
    list.map((member) => ({ ...member, descriptionHtml: '' }));
  return {
    ...part,
    descriptionHtml: '',
    ariaAttributes: part.ariaAttributes ?? [],
    dataAttributes: part.dataAttributes ?? [],
    inputs: members(part.inputs),
    models: members(part.models),
    outputs: members(part.outputs),
  };
}

/**
 * A value each control doesn't have by default.
 *
 * @param control - The control.
 * @returns The value.
 */
function changed(control: PlaygroundControl) {
  switch (control.kind) {
    case 'enum':
      return (
        control.options.find((option) => option !== control.default) ??
        control.default
      );
    case 'boolean':
      return !control.default;
    case 'number':
      return Math.min(control.max, control.default + control.step);
    case 'string':
      return 'changed';
  }
}

/**
 * The classes, data and ARIA attributes of an element, which is what the
 * part's inputs change.
 *
 * @param element - The element.
 * @returns Them, sorted.
 */
function styling(element: Element): string[] {
  return [
    ...[...element.classList].map((name) => `.${name}`),
    ...element
      .getAttributeNames()
      .filter((name) => /^(data-|aria-|role$)/.test(name))
      .map((name) => `${name}=${element.getAttribute(name)}`),
  ].sort();
}

/**
 * Renders a component and returns its element, after rendering settles.
 *
 * @param type - The component.
 * @param values - Values for a host, if it is one.
 * @returns Its host element.
 */
async function render(type: Type<unknown>, values?: PlaygroundValues) {
  const fixture = TestBed.createComponent(type);
  if (values) fixture.componentRef.setInput('values', values);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe.each(Object.entries(playgrounds))('%s playground', (item, load) => {
  it.each(['defaults', 'every control changed'])(
    'renders the same part as its snippet, with %s',
    async (variation) => {
      const host = await load();
      const part = partOf(item, host.part);
      const controls = controlsFor(part, host);
      expect(controls.length).toBeGreaterThan(0);
      const values: PlaygroundValues =
        variation === 'defaults'
          ? defaultValues(controls)
          : Object.fromEntries(
              controls.map((control) => [control.name, changed(control)]),
            );

      TestBed.overrideComponent(Snippet, {
        set: { template: snippetFor(host, controls, values), imports: PARTS },
      });
      const errors = vi.spyOn(console, 'error');
      const fromHost = await render(host.component, values);
      const fromSnippet = await render(Snippet);
      expect(errors).not.toHaveBeenCalled();

      // Overlay parts render only once opened; their snippets still compile.
      const selector = part.selector;
      const target = fromHost.querySelector(selector);
      if (target) {
        const other = fromSnippet.querySelector(selector);
        expect(other).not.toBeNull();
        expect(styling(other as Element)).toEqual(styling(target));
      }
    },
  );
});
