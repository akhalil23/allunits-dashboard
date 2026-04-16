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

export function buildSourceRowKey(pillar: PillarId, sheetRow: number): string {
  return `${pillar}|row-${sheetRow}`;
}

export function getActionItemSourceKey(item: Pick<ActionItem, 'pillar' | 'sheetRow' | 'sourceKey'>): string {
  return item.sourceKey || buildSourceRowKey(item.pillar, item.sheetRow);
}