import type { ActionItem, PillarId } from './types';

export function normalizeHierarchyText(raw: string | null | undefined): string {
  if (!raw) return '';

  return raw
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\r\n\f\v]/g, ' ')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeHierarchyGroupKey(raw: string | null | undefined): string {
  return normalizeHierarchyText(raw).toLowerCase();
}

/**
 * Aggressive, punctuation-insensitive matching key for cross-unit step union.
 * NFKC-normalizes, lowercases, folds Unicode dashes/quotes/apostrophes to ASCII,
 * strips all non-alphanumeric characters. Used ONLY for matching (e.g. uniting
 * the same action step across 24 unit sheets when one sheet uses a non-breaking
 * hyphen, smart quote, or trailing punctuation). Never used for display.
 */
export function normalizeHierarchyMatchKey(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = raw.normalize('NFKC');
  // Fold Unicode dashes/hyphens to ASCII hyphen
  s = s.replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-');
  // Fold smart quotes/apostrophes
  s = s.replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'");
  s = s.replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"');
  // Strip every non-alphanumeric char (drops spaces, punctuation, control chars)
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function buildSourceRowKey(pillar: PillarId, sheetRow: number): string {
  return `${pillar}|row-${sheetRow}`;
}

function buildHierarchySourceKey(item: Pick<ActionItem, 'pillar' | 'goal' | 'objective' | 'actionStep'>): string {
  const pillarKey = item.pillar;
  const goalKey = normalizeHierarchyGroupKey(item.goal);
  const actionKey = normalizeHierarchyGroupKey(item.objective);
  const stepKey = normalizeHierarchyGroupKey(item.actionStep);

  if (goalKey && actionKey && stepKey) {
    return `${pillarKey}|goal:${goalKey}|action:${actionKey}|step:${stepKey}`;
  }

  if (actionKey && stepKey) {
    return `${pillarKey}|action:${actionKey}|step:${stepKey}`;
  }

  if (stepKey) {
    return `${pillarKey}|step:${stepKey}`;
  }

  return '';
}

export function getActionItemSourceKey(item: Pick<ActionItem, 'pillar' | 'goal' | 'objective' | 'actionStep' | 'sheetRow' | 'sourceKey'>): string {
  return buildHierarchySourceKey(item) || item.sourceKey || buildSourceRowKey(item.pillar, item.sheetRow);
}