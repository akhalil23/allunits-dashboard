/**
 * Official Strategic Plan IV Pillar Labels
 * Short, medium, and full formats for consistent display.
 */

import type { PillarId } from './types';

/** Ultra-short for charts: PI, PII, etc. */
export const PILLAR_ABBREV: Record<PillarId, string> = {
  I: 'PI', II: 'PII', III: 'PIII', IV: 'PIV', V: 'PV',
};

/** Short label for charts with limited space */
export const PILLAR_SHORT: Record<PillarId, string> = {
  I: 'PI — Scholarly Footprint',
  II: 'PII — Impact & Innovation',
  III: 'PIII — Inspire Innovation',
  IV: 'PIV — Beyond Boundaries',
  V: 'PV — Strategic Accelerator',
};

/** Full official pillar titles */
export const PILLAR_FULL: Record<PillarId, string> = {
  I: 'Pillar I — Enhance Scholarly Footprint and Visibility',
  II: 'Pillar II — Educate for Impact & Innovate',
  III: 'Pillar III — Innovate to Inspire',
  IV: 'Pillar IV — Advance & Educate Beyond Boundaries',
  V: 'Pillar V — Strategic Accelerator: Empower with Purpose, Agility, and Sustainability',
};

/** Get short label for a pillar (for charts) */
export function getPillarShort(pillar: PillarId): string {
  return PILLAR_SHORT[pillar] || `Pillar ${pillar}`;
}

/** Get full label for a pillar (for tooltips/expanded views) */
export function getPillarFull(pillar: PillarId): string {
  return PILLAR_FULL[pillar] || `Pillar ${pillar}`;
}
