import { Component, computed, input } from '@angular/core';
import type { MemberData, PartData } from './component-data';

/** A member with the kind of binding it is. */
interface Row extends MemberData {
  kind: 'input' | 'model' | 'output';
}

/**
 * The API reference of one part, from its metadata: selector, role and
 * ARIA attributes, then tables of its bindings and data attributes.
 */
@Component({
  selector: 'docs-api-reference',
  template: `
    <div class="flex flex-wrap items-center gap-2 text-sm">
      <code class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.8rem]">{{
        part().selector
      }}</code>
      @if (part().role; as role) {
        <span class="text-muted-foreground"
          >role <code class="font-mono">{{ role }}</code></span
        >
      }
      @if (part().source !== 'item') {
        <span class="text-muted-foreground"
          >from <code class="font-mono">{{ part().source }}</code></span
        >
      }
    </div>
    <p
      class="mt-3 text-sm leading-relaxed text-muted-foreground"
      [innerHTML]="part().descriptionHtml"
    ></p>
    @if (part().ariaAttributes.length) {
      <p class="mt-2 text-sm text-muted-foreground">
        Manages
        @for (attribute of part().ariaAttributes; track attribute) {
          <code class="font-mono text-foreground">{{ attribute }}</code
          >{{ $last ? '.' : ', ' }}
        }
      </p>
    }
    @if (rows().length) {
      <div class="mt-4 overflow-x-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead class="bg-muted/50">
            <tr>
              <th scope="col" class="px-4 py-2 text-start font-medium">
                {{ part().name }} binding
              </th>
              <th scope="col" class="px-4 py-2 text-start font-medium">Type</th>
              <th scope="col" class="px-4 py-2 text-start font-medium">
                Default
              </th>
            </tr>
          </thead>
          <tbody>
            @for (row of rows(); track row.name) {
              <tr class="border-t align-top">
                <td class="px-4 py-2.5">
                  <code class="font-mono text-[0.8rem] font-medium">{{
                    row.kind === 'output'
                      ? '(' + row.name + ')'
                      : row.kind === 'model'
                        ? '[(' + row.name + ')]'
                        : '[' + row.name + ']'
                  }}</code>
                  @if (row.required) {
                    <span class="ms-1 text-xs text-destructive">required</span>
                  }
                  <div
                    class="mt-1 text-muted-foreground"
                    [innerHTML]="row.descriptionHtml"
                  ></div>
                </td>
                <td class="px-4 py-2.5">
                  <code class="font-mono text-[0.8rem] break-words">{{
                    row.type
                  }}</code>
                </td>
                <td class="px-4 py-2.5">
                  <code class="font-mono text-[0.8rem]">{{
                    row.default ?? '—'
                  }}</code>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
    @if (part().dataAttributes.length) {
      <div class="mt-4 overflow-x-auto rounded-lg border">
        <table class="w-full text-sm">
          <thead class="bg-muted/50">
            <tr>
              <th scope="col" class="px-4 py-2 text-start font-medium">
                Data attribute
              </th>
              <th scope="col" class="px-4 py-2 text-start font-medium">
                Values
              </th>
            </tr>
          </thead>
          <tbody>
            @for (attribute of part().dataAttributes; track attribute.name) {
              <tr class="border-t">
                <td class="px-4 py-2.5">
                  <code class="font-mono text-[0.8rem] font-medium">{{
                    attribute.name
                  }}</code>
                </td>
                <td class="px-4 py-2.5 text-muted-foreground">
                  @for (value of attribute.values ?? []; track value) {
                    <code class="font-mono text-[0.8rem]">{{ value }}</code
                    >{{ $last ? '' : ', ' }}
                  } @empty {
                    —
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class ApiReference {
  /** The part. */
  readonly part = input.required<PartData>();

  protected readonly rows = computed<Row[]>(() => [
    ...this.part().inputs.map((member) => ({
      ...member,
      kind: 'input' as const,
    })),
    ...this.part().models.map((member) => ({
      ...member,
      kind: 'model' as const,
    })),
    ...this.part().outputs.map((member) => ({
      ...member,
      kind: 'output' as const,
    })),
  ]);
}
