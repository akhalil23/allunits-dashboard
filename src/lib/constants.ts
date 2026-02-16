import type { Status, Qualifier, PillarId } from './types';

export const STATUS_COLORS: Record<Status, string> = {
  'Not Applicable': '#B0B7C3',
  'Not Started': '#94A3B8',
  'In Progress': '#E6A23C',
  'Completed – On Target': '#00843D',
  'Completed – Below Target': '#B23A48',
};

export const QUALIFIER_COLORS: Record<Qualifier, string> = {
  'Not Applicable': '#B0B7C3',
  'Achieved': '#00843D',
  'Execution Shortfall': '#B23A48',
  'On Track': '#5CA874',
  'Emerging Risk': '#E6A23C',
  'Critical Risk': '#D9534F',
};

export const PILLAR_LABELS: Record<PillarId, string> = {
  I: 'Academic Excellence',
  II: 'Research & Innovation',
  III: 'Community & Impact',
  IV: 'Institutional Capacity',
  V: 'Student Experience',
};

export const AY_BOUNDARIES = {
  '2025-2026': {
    start: new Date('2025-07-01T00:00:00Z'),
    end: new Date('2026-06-30T23:59:59Z'),
  },
  '2026-2027': {
    start: new Date('2026-07-01T00:00:00Z'),
    end: new Date('2027-06-30T23:59:59Z'),
  },
};

export const RISK_WEIGHTS: Record<Qualifier, number> = {
  'Critical Risk': 3,
  'Execution Shortfall': 3,
  'Emerging Risk': 2,
  'On Track': 1,
  'Achieved': 0,
  'Not Applicable': 0,
};
