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