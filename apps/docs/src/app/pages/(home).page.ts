import { Component } from '@angular/core';
import { AccessibilitySection } from '../landing/accessibility-section';
import { AgentsSection } from '../landing/agents-section';
import { BlocksSection } from '../landing/blocks-section';
import { ClosingSection } from '../landing/closing-section';
import { Hero } from '../landing/hero';
import { MergeSection } from '../landing/merge-section';
import { ProofSection } from '../landing/proof-section';
import { Showcase } from '../landing/showcase';

/**
 * Landing page (`/`), ADR-0026 and its amendment 1: the hero and the
 * component showcase, then updates, agents, accessibility, blocks, the
 * numbers and a closing call to action.
 */
@Component({
  selector: 'docs-home',
  imports: [
    AccessibilitySection,
    AgentsSection,
    BlocksSection,
    ClosingSection,
    Hero,
    MergeSection,
    ProofSection,
    Showcase,
  ],
  template: `
    <main id="main">
      <docs-hero />
      <docs-showcase />
      <docs-merge-section />
      <docs-agents-section />
      <docs-accessibility-section />
      <docs-blocks-section />
      <docs-proof-section />
      <docs-closing-section />
    </main>
  `,
})
export default class HomePage {}
