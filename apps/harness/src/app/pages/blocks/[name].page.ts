import { NgComponentOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { BLOCKS } from '../../blocks/blocks';

/**
 * Block page (`/blocks/<name>`): renders one registry block as the whole
 * page, as a user's route would, so its own landmarks are the page's.
 */
@Component({
  selector: 'harness-block',
  imports: [NgComponentOutlet],
  template: `
    @if (block(); as component) {
      <ng-container *ngComponentOutlet="component" />
    } @else {
      <main class="mx-auto max-w-3xl p-8">
        <h1 class="text-2xl font-semibold">No block named {{ name() }}</h1>
      </main>
    }
  `,
})
export default class BlockPage {
  protected readonly name = toSignal(
    inject(ActivatedRoute).paramMap.pipe(
      map((params) => params.get('name') ?? ''),
    ),
    { initialValue: '' },
  );

  protected readonly block = computed(() => BLOCKS[this.name()]);
}
