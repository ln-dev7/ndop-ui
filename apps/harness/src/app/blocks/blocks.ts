import type { Type } from '@angular/core';
import { Dashboard01Block } from '@/blocks/dashboard-01/dashboard-01';
import { Dashboard02Block } from '@/blocks/dashboard-02/dashboard-02';
import { DataTable01Block } from '@/blocks/data-table-01/data-table-01';
import { Hero01Block } from '@/blocks/hero-01/hero-01';
import { Login01Block } from '@/blocks/login-01/login-01';
import { Login02Block } from '@/blocks/login-02/login-02';
import { Pricing01Block } from '@/blocks/pricing-01/pricing-01';
import { Settings01Block } from '@/blocks/settings-01/settings-01';
import { Settings02Block } from '@/blocks/settings-02/settings-02';
import { Sidebar01Block } from '@/blocks/sidebar-01/sidebar-01';
import { Sidebar02Block } from '@/blocks/sidebar-02/sidebar-02';
import { Signup01Block } from '@/blocks/signup-01/signup-01';

/**
 * Every registry block, by name. The home page links each one at
 * `/blocks/<name>`, so prerendering and the e2e quality crawl cover them
 * (ADR-0022). A unit test keeps this list in sync with `registry/blocks`;
 * the `block` generator adds to it.
 */
export const BLOCKS: Readonly<Record<string, Type<unknown>>> = {
  'dashboard-01': Dashboard01Block,
  'dashboard-02': Dashboard02Block,
  'data-table-01': DataTable01Block,
  'hero-01': Hero01Block,
  'login-01': Login01Block,
  'login-02': Login02Block,
  'pricing-01': Pricing01Block,
  'settings-01': Settings01Block,
  'settings-02': Settings02Block,
  'sidebar-01': Sidebar01Block,
  'sidebar-02': Sidebar02Block,
  'signup-01': Signup01Block,
};
