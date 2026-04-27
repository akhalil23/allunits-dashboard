import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ============================================================
// UNIT RANGE CONFIGURATION — STRICT, NO AUTO-DETECTION
// ============================================================

interface PillarRange {
  id: string;        // Pillar ID: I, II, III, IV, V
  sheetName: string; // Exact sheet name (including trailing spaces)
  lastRow: number;   // Last row of the range
}

// GSR ranges
const GSR_PILLARS: PillarRange[] = [
  { id: 'I',   sheetName: 'Pillar I',   lastRow: 62 },
  { id: 'II',  sheetName: 'Pillar II',  lastRow: 81 },
  { id: 'III', sheetName: 'Pillar III', lastRow: 100 },
  { id: 'IV',  sheetName: 'Pillar IV',  lastRow: 224 },
  { id: 'V',   sheetName: 'Pillar V',   lastRow: 157 },
];

// Libraries ranges (SPECIAL — DO NOT REUSE)
const LIBRARIES_PILLARS: PillarRange[] = [
  { id: 'I',   sheetName: 'Pillar I',   lastRow: 129 },
  { id: 'II',  sheetName: 'Pillar II',  lastRow: 164 },
  { id: 'III', sheetName: 'Pillar III', lastRow: 203 },
  { id: 'IV',  sheetName: 'Pillar IV',  lastRow: 457 },
  { id: 'V',   sheetName: 'Pillar V',   lastRow: 322 },
];

// Standard Template ranges (19 units)
const STANDARD_PILLARS: PillarRange[] = [
  { id: 'I',   sheetName: 'Pillar I GSR',          lastRow: 62 },
  { id: 'II',  sheetName: 'Pillar II SAS',          lastRow: 81 },
  { id: 'III', sheetName: 'Pillar III SOM',          lastRow: 100 },
  { id: 'IV',  sheetName: 'Pillar IV Development',   lastRow: 224 },
  { id: 'V',   sheetName: 'Pillar V ',               lastRow: 157 }, // trailing space required
];

// SArD exception: Pillar III ends at row 99
const SARD_PILLARS: PillarRange[] = [
  { id: 'I',   sheetName: 'Pillar I GSR',          lastRow: 62 },
  { id: 'II',  sheetName: 'Pillar II SAS',          lastRow: 81 },
  { id: 'III', sheetName: 'Pillar III SOM',          lastRow: 99 },  // SArD exception
  { id: 'IV',  sheetName: 'Pillar IV Development',   lastRow: 224 },
  { id: 'V',   sheetName: 'Pillar V ',               lastRow: 157 },
];

const STANDARD_UNITS = new Set([
  'AKSOB', 'BDGA', 'CIL', 'DIRA', 'Facilities', 'Finance', 'IT',
  'Advancement', 'PwD', 'Provost', 'SAS', 'SDEM', 'SOE', 'SOM',
  'SON', 'SOP', 'StratCom_Alumni', 'UGRC', 'OfS', 'HR', 'Procurement',
  'ADM',
]);

function getPillarConfig(unitId: string): PillarRange[] {
  if (unitId === 'GSR') return GSR_PILLARS;
  if (unitId === 'Libraries') return LIBRARIES_PILLARS;
  if (unitId === 'SArD') return SARD_PILLARS;
  if (STANDARD_UNITS.has(unitId)) return STANDARD_PILLARS;
  throw new Error(`Unknown unit: ${unitId}. No range configuration exists.`);
}

// Term data columns:
//   Default (23 units): BX:CY  → SP Status at BY/CF/CM/CT, Yearly Status at CB/CI/CP/CW
//   Finance ONLY:       BY:CZ  → SP Status at BZ/CG/CN/CU, Yearly Status at CC/CJ/CQ/CX
// Finance sheet is structured one column to the right of the standard template.
const TERM_START_COL = 75; // Column BX (0-indexed) — kept for non-Finance units
const TERM_TOTAL_COLS = 28; // 4 windows × 7 fields

// Units whose term-data block starts at column BY instead of BX.
// DO NOT add other units here without explicit confirmation against the live sheet.
const TERM_RANGE_OVERRIDES: Record<string, { startCol: string; endCol: string }> = {
  Finance: { startCol: 'BY', endCol: 'CZ' },
};

function getTermRangeCols(unitId: string): { startCol: string; endCol: string } {
  return TERM_RANGE_OVERRIDES[unitId] ?? { startCol: 'BX', endCol: 'CY' };
}

function buildRanges(pillars: PillarRange[], unitId: string): { ranges: string[]; pillarMap: PillarRange[] } {
  const { startCol, endCol } = getTermRangeCols(unitId);
  const ranges: string[] = [];
  for (const p of pillars) {
    const escaped = `'${p.sheetName}'`;
    ranges.push(`${escaped}!A4:G${p.lastRow}`);
    ranges.push(`${escaped}!${startCol}4:${endCol}${p.lastRow}`);
  }
  return { ranges, pillarMap: pillars };
}

function buildCoreOnlyRanges(pillars: PillarRange[]): { ranges: string[]; pillarMap: PillarRange[] } {
  const ranges: string[] = [];
  for (const p of pillars) {
    const escaped = `'${p.sheetName}'`;
    ranges.push(`${escaped}!A4:G${p.lastRow}`);
  }
  return { ranges, pillarMap: pillars };
}

// ============================================================
// Unit ID → Spreadsheet ID (server-side only)
// ============================================================

const UNIT_SPREADSHEETS: Record<string, string> = {
  SON: '19CETyNi3jWANW2uo8kchiYjkApAZuULU_OPUAHxvbX0',
  SArD: '1RfVZl-XYzQdo6FQK70PJhyw-qnnORM6LaE8Sg_cpFbA',
  SOP: '18dM2q_hWLGUQjBw9PHUjKwWh9NMDYCNFzjvMipFt9Do',
  SOM: '1u32vOYd1vEcHfPkHtNJWTk_AkQLpSUOcsV28k_yePXM',
  AKSOB: '1x2ItlwuWShCIXm40EvpKFF8wCoXWf_YRnfGExwFXoFE',
  SOE: '1wu1tdcZ_ouNasgSc5RqnDLQFemvXgIuOmUHF8-i_U14',
  SAS: '1-VysXFHNlvL5oUYolBUQ-TasLufO4yF7xatFpaWel2E',
  GSR: '14Z6hsOOx4reMzE5KYIkWgVi31BAuQSOwkZnE7Qhzqvk',
  DIRA: '1iAKPKguUvCYEN-Tojo91TXR-f-RXLtaeO3awt0nDCDk',
  CIL: '1KNm1MpH-vxgpD-z-_eguZyqsZd6nvEOk_S6LZG0WsvQ',
  Libraries: '17mx75Ejrvnb_sWkN4QyWUs2D-V7UHcrnHjR_lsTYCaY',
  BDGA: '16N8vAsbQ0JA09bfKRZxCP7xojzFWEboj8ugZPr8RDX8',
  SDEM: '19423B49RTOlsR1oD7A9YhVfz14w5rP-wA7-sy-x4V04',
  IT: '1MYMfXSMFYksiMS3GUXGSoI12-2qg5V-UwMXv7XFshqw',
  Facilities: '1FOwt5PkOPQnUX_NdmPbzPRbaan9MEeRoXiWB1i-FR0g',
  Finance: '1SWb0okdTuFZub8XFS6tclitCv-FRaSXbcvx6kagvvu4',
  UGRC: '1fX5EtFll-K2kFTIym1bf-SS_pbrcOwTpvAsEFdZHDuE',
  StratCom_Alumni: '1jyGyHMJTie_iy044AuB7TBOgxBjVNXzqAd2sQMYENgk',
  Advancement: '12xmb1qYhAGSBMkqQO-6LUrgp4uiGcdP3D0nyf3FF6Rs',
  Provost: '1cVGQZz1GGuoyEv0kljKJY4jCqauvR6K8IM_FIfYwkqE',
  PwD: '1TEr6TeZ_rfHewK7_Pozl3DgHyK6Y1LTfyIt-P139T58',
  OfS: '1vzHWVOOL02qwdSX4RnT3rvECGcB0FSvXCgxPRKbha1Q',
  HR: '1OsPfYkNQ1gVqBbFyGkulNFwfRR1WvyHYWMX1hLPAkGY',
  Procurement: '1bmH7Y_yKEOFJmo6hXB1WPNpkG15x673ai9DVjLbXMLA',
  ADM: '1Uy1r2ZGzAB-Gb2uTfrd9heKkwBu75IDP1ME2sL5lrWs',
};

// ============================================================
// Term window & parsing helpers (unchanged)
// ============================================================

const TERM_WINDOW_KEYS = [
  'mid-2025-2026',
  'end-2025-2026',
  'mid-2026-2027',
  'end-2026-2027',
] as const;

const WIN_SP_TARGET = 0;
const WIN_SP_STATUS = 1;
const WIN_SP_COMP = 2;
const WIN_YEARLY_TARGET = 3;
const WIN_YEARLY_STATUS = 4;
const WIN_YEARLY_COMP = 5;
const WIN_SUPPORTING_DOC = 6;
const WINDOW_SIZE = 7;

const CORE_GOAL = 0;
const CORE_ACTION = 1;
const CORE_ACTION_STEP = 3;
const CORE_OWNER = 5;

async function createJWT(serviceAccount: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.metadata.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)).buffer as ArrayBuffer);
  const claimB64 = base64url(encoder.encode(JSON.stringify(claim)).buffer as ArrayBuffer);
  const unsignedToken = `${headerB64}.${claimB64}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    encoder.encode(unsignedToken)
  );

  const signatureB64 = base64url(signature);
  return `${unsignedToken}.${signatureB64}`;
}

async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const { timeoutMs = 20000, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...rest, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createJWT(serviceAccount);
  const resp = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    timeoutMs: 15000,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to get access token: ${resp.status} ${errText}`);
  }

  const data = await resp.json();
  return data.access_token;
}

type Status = 'Not Applicable' | 'Not Started' | 'In Progress' | 'Completed – On Target' | 'Completed – Below Target';

function isNotApplicableRaw(raw: string | undefined | null): boolean {
  if (raw === null || raw === undefined) return true;
  const s = raw.trim();
  if (s === '') return true;
  const lower = s.toLowerCase();
  return lower === 'na' || lower === 'n/a' || lower === 'not applicable' || s === '-' || s === '—';
}

function normalizeStatus(raw: string | undefined): Status | null {
  if (!raw || raw.trim() === '') return null;
  const s = raw.trim().toLowerCase();

  if (s === 'na' || s === 'n/a' || s === 'not applicable' || s === '-' || s === '—') return 'Not Applicable';
  if (s === 'not started') return 'Not Started';
  if (s.startsWith('in progress')) return 'In Progress';
  if (s.includes('on target') && s.includes('completed')) return 'Completed – On Target';
  if (s.includes('below target') && s.includes('completed')) return 'Completed – Below Target';
  if (s.includes('above target')) return null;

  if (s.includes('%')) return 'In Progress';

  return null;
}

function parseCompletion(raw: string | undefined): { value: number | null; isInvalid: boolean } {
  if (!raw || raw.trim() === '') return { value: null, isInvalid: false };
  if (isNotApplicableRaw(raw)) return { value: null, isInvalid: false };
  const cleaned = raw.replace('%', '').replace(',', '.').trim();
  const n = parseFloat(cleaned);
  if (isNaN(n) || n < 0 || n > 100) return { value: null, isInvalid: true };
  return { value: Math.round(n), isInvalid: false };
}

/**
 * Clean and normalize cell text: handle non-breaking spaces, tabs,
 * control characters, then trim. Never discard text that has visible
 * characters after cleaning.
 */
function cleanCellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  // Normalize non-breaking spaces (U+00A0) → regular space
  text = text.replace(/\u00A0/g, ' ');
  // Normalize tabs → space
  text = text.replace(/\t/g, ' ');
  // Remove invisible control characters (but keep normal whitespace)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  // Trim leading and trailing whitespace
  text = text.trim();
  return text;
}

function safeGet(arr: any[], idx: number): string {
  if (idx < 0 || !arr || idx >= arr.length) return '';
  return cleanCellText(arr[idx]);
}

function isRowFullyBlank(row: any[]): boolean {
  if (!row || row.length === 0) return true;
  return row.every((c: any) => cleanCellText(c) === '');
}

function isValidItemRow(coreRow: any[], termRow: any[]): boolean {
  const colA = safeGet(coreRow, 0);
  if (colA !== '') return true;
  if (termRow && termRow.length > 0 && !isRowFullyBlank(termRow)) return true;
  return false;
}

interface TermData {
  spStatus: Status;
  spStatusRaw?: string;
  spStatusProvided?: boolean;
  spCompletion: number;
  spTarget: string;
  yearlyStatus: Status;
  yearlyStatusRaw?: string;
  yearlyStatusProvided?: boolean;
  yearlyCompletion: number;
  yearlyTarget: string;
  supportingDoc: string;
}

interface AnomalyLog {
  unexpectedStatuses: { row: string; rawValue: string }[];
  outOfRangeCompletions: string[];
  missingTermColumns: string[];
}

function extractTermData(
  termRow: any[],
  windowIdx: number,
  anomalies: AnomalyLog,
  rowId: string
): { td: TermData; invalidStatuses: number; invalidCompletions: number } {
  const offset = windowIdx * WINDOW_SIZE;
  let invalidStatuses = 0;
  let invalidCompletions = 0;

  const rawSpStatus = safeGet(termRow, offset + WIN_SP_STATUS);
  const rawYearlyStatus = safeGet(termRow, offset + WIN_YEARLY_STATUS);
  const rawSpComp = safeGet(termRow, offset + WIN_SP_COMP);
  const rawYearlyComp = safeGet(termRow, offset + WIN_YEARLY_COMP);
  const spStatusProvided = rawSpStatus.trim() !== '';
  const yearlyStatusProvided = rawYearlyStatus.trim() !== '';

  if (termRow.length < offset + WINDOW_SIZE) {
    anomalies.missingTermColumns.push(`${rowId}:window-${windowIdx}`);
  }

  const spStatus = normalizeStatus(rawSpStatus);
  const yearlyStatus = normalizeStatus(rawYearlyStatus);

  if (rawSpStatus && rawSpStatus.trim() !== '' && !spStatus) {
    invalidStatuses++;
    anomalies.unexpectedStatuses.push({ row: rowId, rawValue: `sp="${rawSpStatus}"` });
  }
  if (rawYearlyStatus && rawYearlyStatus.trim() !== '' && !yearlyStatus) {
    invalidStatuses++;
    anomalies.unexpectedStatuses.push({ row: rowId, rawValue: `yearly="${rawYearlyStatus}"` });
  }

  const spCompResult = parseCompletion(rawSpComp);
  const yearlyCompResult = parseCompletion(rawYearlyComp);

  if (spCompResult.isInvalid) {
    invalidCompletions++;
    anomalies.outOfRangeCompletions.push(`${rowId}:sp="${rawSpComp}"`);
  }
  if (yearlyCompResult.isInvalid) {
    invalidCompletions++;
    anomalies.outOfRangeCompletions.push(`${rowId}:yearly="${rawYearlyComp}"`);
  }

  const resolvedSpStatus = spStatus ?? (isNotApplicableRaw(rawSpStatus) ? 'Not Applicable' : 'Not Started');
  const resolvedYearlyStatus = yearlyStatus ?? (isNotApplicableRaw(rawYearlyStatus) ? 'Not Applicable' : 'Not Started');

  return {
    td: {
      spStatus: resolvedSpStatus,
      spStatusRaw: rawSpStatus,
      spStatusProvided,
      spCompletion: spCompResult.value ?? 0,
      spTarget: safeGet(termRow, offset + WIN_SP_TARGET),
      yearlyStatus: resolvedYearlyStatus,
      yearlyStatusRaw: rawYearlyStatus,
      yearlyStatusProvided,
      yearlyCompletion: yearlyCompResult.value ?? 0,
      yearlyTarget: safeGet(termRow, offset + WIN_YEARLY_TARGET),
      supportingDoc: safeGet(termRow, offset + WIN_SUPPORTING_DOC),
    },
    invalidStatuses,
    invalidCompletions,
  };
}

interface ActionItem {
  id: string;
  pillar: string;
  goal: string;
  objective: string;
  actionStep: string;
  owner: string;
  terms: Record<string, TermData>;
  sheetRow: number;
  sourceKey: string;
}

function processPillarData(
  pillarId: string,
  coreRows: any[][],
  termRows: any[][],
  anomalies: AnomalyLog
): { items: ActionItem[]; invalidStatuses: number; invalidCompletions: number } {
  let totalInvalidStatuses = 0;
  let totalInvalidCompletions = 0;
  const items: ActionItem[] = [];

  const maxRows = Math.max(coreRows.length, termRows.length);
  let consecutiveBlanks = 0;
  const BLANK_THRESHOLD = 10;

  // Forward-fill state: carry forward last non-empty goal and action/objective
  let lastGoal = '';
  let lastAction = '';

  for (let i = 0; i < maxRows; i++) {
    const core = coreRows[i] || [];
    const term = termRows[i] || [];

    if (isRowFullyBlank(core) && isRowFullyBlank(term)) {
      consecutiveBlanks++;
      if (consecutiveBlanks >= BLANK_THRESHOLD) break;
      continue;
    }
    consecutiveBlanks = 0;

    if (!isValidItemRow(core, term)) continue;

    const actionStep = safeGet(core, CORE_ACTION_STEP);
    const rawGoal = safeGet(core, CORE_GOAL);
    const rawAction = safeGet(core, CORE_ACTION);

    // Forward-fill: use last non-empty value if current is blank
    if (rawGoal !== '') lastGoal = rawGoal;
    if (rawAction !== '') lastAction = rawAction;

    const goal = rawGoal || lastGoal;
    const action = rawAction || lastAction;

    const rowId = `P${pillarId}-R${i + 5}`;

    const terms: Record<string, TermData> = {};

    for (let w = 0; w < 4; w++) {
      const { td, invalidStatuses, invalidCompletions } = extractTermData(term, w, anomalies, rowId);
      terms[TERM_WINDOW_KEYS[w]] = td;
      totalInvalidStatuses += invalidStatuses;
      totalInvalidCompletions += invalidCompletions;
    }

    items.push({
      id: `${pillarId}-${items.length + 1}`,
      pillar: pillarId,
      goal,
      objective: action,
      actionStep: actionStep || action || `Action ${pillarId}.${items.length + 1}`,
      owner: safeGet(core, CORE_OWNER),
      terms,
      sheetRow: i + 5,
      sourceKey: `${pillarId}|row-${i + 5}`,
    });
  }

  return { items, invalidStatuses: totalInvalidStatuses, invalidCompletions: totalInvalidCompletions };
}

// ============================================================
// MAIN HANDLER
// ============================================================

const RATE_LIMIT_PATTERN = /(RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|RATE_LIMITED|\b429\b)/i;
const GSR_CACHE_TTL_MS = 5 * 60 * 1000;

type GsrCacheEntry = {
  data: any;
  cachedAt: number;
  expiresAt: number;
};

type GsrCacheGlobal = typeof globalThis & {
  __gsr_data_cache__?: Map<string, GsrCacheEntry>;
};

const gsrCacheGlobal = globalThis as GsrCacheGlobal;
const gsrDataCache = gsrCacheGlobal.__gsr_data_cache__ ?? new Map<string, GsrCacheEntry>();
gsrCacheGlobal.__gsr_data_cache__ = gsrDataCache;

function getGsrCache(unitId: string): GsrCacheEntry | null {
  return gsrDataCache.get(unitId) ?? null;
}

function setGsrCache(unitId: string, data: any) {
  gsrDataCache.set(unitId, {
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + GSR_CACHE_TTL_MS,
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRateLimitRetry(url: string, accessToken: string, maxAttempts = 4): Promise<Response> {
  let lastRateLimitBody = '';

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (response.status !== 429) {
      return response;
    }

    lastRateLimitBody = await response.text();

    if (attempt < maxAttempts - 1) {
      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterMs = retryAfterHeader ? Number.parseInt(retryAfterHeader, 10) * 1000 : NaN;
      const backoffMs = Number.isFinite(retryAfterMs) && retryAfterMs > 0
        ? retryAfterMs
        : 1000 * Math.pow(2, attempt);
      await sleep(backoffMs + Math.floor(Math.random() * 250));
      continue;
    }

    throw new Error(`RATE_LIMITED: Google Sheets API error: 429 ${lastRateLimitBody}`);
  }

  throw new Error(`RATE_LIMITED: Google Sheets API error: 429 ${lastRateLimitBody}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let requestedUnitId = 'GSR';

  try {
    // --- SERVER-SIDE AUTH & UNIT ISOLATION ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userRole } = await userClient.rpc('get_user_role', { _user_id: user.id });
    const { data: userUnit } = await userClient.rpc('get_user_unit', { _user_id: user.id });

    try {
      if (req.method === 'POST') {
        const body = await req.json();
        if (body?.unitId) requestedUnitId = body.unitId;
      }
    } catch {
      // Use default
    }

    // Enforce unit isolation
    if (userRole !== 'admin') {
      if (userUnit && requestedUnitId !== userUnit) {
        return new Response(JSON.stringify({ error: 'Access denied: you can only access your assigned unit' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Resolve spreadsheetId server-side
    const spreadsheetId = UNIT_SPREADSHEETS[requestedUnitId];
    if (!spreadsheetId) {
      return new Response(JSON.stringify({ error: `Configuration error: unknown unit "${requestedUnitId}"` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const serviceAccountRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountRaw) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountRaw);
    const accessToken = await getAccessToken(serviceAccount);

    // Determine pillar config and build ranges — NO auto-detection
    const pillarConfig = getPillarConfig(requestedUnitId);
    const { ranges: RANGES, pillarMap } = buildRanges(pillarConfig, requestedUnitId);

    console.log(`Unit ${requestedUnitId}: fetching ${RANGES.length} ranges from spreadsheet`);

    const rangeParams = RANGES.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangeParams}`;

    let sheetsResp = await fetchWithRateLimitRetry(url, accessToken);

    // If BX:CY range exceeds grid limits, retry with core-only ranges
    let coreOnly = false;
    if (!sheetsResp.ok) {
      const errText = await sheetsResp.text();
      if (sheetsResp.status >= 500) {
        // Google API is temporarily unavailable (503, 500, etc.) — use cache or graceful error
        throw new Error(`SERVICE_UNAVAILABLE: Google Sheets API error: ${sheetsResp.status} ${errText}`);
      } else if (sheetsResp.status === 400 && errText.includes('exceeds grid limits')) {
        console.warn(`Unit ${requestedUnitId}: BX:CY exceeds grid limits, retrying with core-only ranges`);
        const { ranges: coreRanges } = buildCoreOnlyRanges(pillarConfig);
        const coreParams = coreRanges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
        const coreUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${coreParams}`;
        sheetsResp = await fetchWithRateLimitRetry(coreUrl, accessToken);
        if (!sheetsResp.ok) {
          const coreErrText = await sheetsResp.text();
          if (sheetsResp.status >= 500) {
            throw new Error(`SERVICE_UNAVAILABLE: Google Sheets API error: ${sheetsResp.status} ${coreErrText}`);
          }
          throw new Error(`Google Sheets API error: ${sheetsResp.status} ${coreErrText}`);
        }
        coreOnly = true;
      } else {
        throw new Error(`Google Sheets API error: ${sheetsResp.status} ${errText}`);
      }
    }

    const sheetsData = await sheetsResp.json();
    const valueRanges = sheetsData.valueRanges || [];

    const observedAt = new Date().toISOString();
    let allItems: ActionItem[] = [];
    let totalInvalidStatuses = 0;
    let totalInvalidCompletions = 0;
    let missingBlocks = 0;

    const anomalies: AnomalyLog = {
      unexpectedStatuses: [],
      outOfRangeCompletions: [],
      missingTermColumns: [],
    };

    for (let p = 0; p < pillarMap.length; p++) {
      if (coreOnly) {
        // Core-only mode: one range per pillar, no term data
        const coreRange = valueRanges[p];
        if (!coreRange?.values) {
          missingBlocks++;
          console.error(`Missing data for Pillar ${pillarMap[p].id} in unit ${requestedUnitId}`);
          continue;
        }
        const coreRows = coreRange.values.slice(1);
        const termRows = coreRows.map(() => [] as any[]);
        const { items, invalidStatuses, invalidCompletions } = processPillarData(
          pillarMap[p].id, coreRows, termRows, anomalies,
        );
        allItems = allItems.concat(items);
        totalInvalidStatuses += invalidStatuses;
        totalInvalidCompletions += invalidCompletions;
      } else {
        // Normal mode: two ranges per pillar (core + term)
        const coreRange = valueRanges[p * 2];
        const termRange = valueRanges[p * 2 + 1];
        if (!coreRange?.values || !termRange?.values) {
          missingBlocks++;
          console.error(`Missing data for Pillar ${pillarMap[p].id} in unit ${requestedUnitId}`);
          continue;
        }
        const coreRows = coreRange.values.slice(1);
        const termRows = termRange.values.slice(1);
        const { items, invalidStatuses, invalidCompletions } = processPillarData(
          pillarMap[p].id, coreRows, termRows, anomalies,
        );
        allItems = allItems.concat(items);
        totalInvalidStatuses += invalidStatuses;
        totalInvalidCompletions += invalidCompletions;
      }
    }

    if (anomalies.unexpectedStatuses.length > 0) {
      console.warn('Unexpected statuses:', anomalies.unexpectedStatuses.slice(0, 20));
    }
    if (anomalies.outOfRangeCompletions.length > 0) {
      console.warn('Out-of-range completions:', anomalies.outOfRangeCompletions.slice(0, 20));
    }
    if (anomalies.missingTermColumns.length > 0) {
      console.warn('Missing term columns:', anomalies.missingTermColumns.slice(0, 20));
    }

    // Disabled per-request Drive metadata lookup to reduce external API pressure.
    const sheetLastModified: string | null = null;
    const sheetLastModifiedBy: string | null = null;

    const result = {
      data: allItems,
      observedAt,
      sheetLastModified,
      sheetLastModifiedBy,
      dataQuality: {
        invalidStatuses: totalInvalidStatuses,
        invalidCompletions: totalInvalidCompletions,
        missingBlocks,
        totalItems: allItems.length,
        anomalies: {
          unexpectedStatusCount: anomalies.unexpectedStatuses.length,
          outOfRangeCompletionCount: anomalies.outOfRangeCompletions.length,
          missingTermColumnCount: anomalies.missingTermColumns.length,
          unexpectedStatusDetails: anomalies.unexpectedStatuses.slice(0, 50),
        },
      },
    };

    setGsrCache(requestedUnitId, result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('fetch-gsr-data error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const isRateLimited = RATE_LIMIT_PATTERN.test(msg);
    const isServiceUnavailable = /SERVICE_UNAVAILABLE/i.test(msg);

    if (isRateLimited || isServiceUnavailable) {
      const staleCache = getGsrCache(requestedUnitId);
      if (staleCache) {
        return new Response(JSON.stringify({
          ...staleCache.data,
          stale: true,
          warning: isServiceUnavailable
            ? `Unit ${requestedUnitId} is temporarily using a cached snapshot because the data source is unavailable.`
            : `Unit ${requestedUnitId} is temporarily using a cached snapshot due to source rate limits.`,
          cache: {
            hit: true,
            stale: true,
            cachedAt: new Date(staleCache.cachedAt).toISOString(),
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (isServiceUnavailable) {
        return new Response(JSON.stringify({
          error: 'Data source is temporarily unavailable. Please retry in a few minutes.',
          code: 'SERVICE_UNAVAILABLE',
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        error: 'Data source is temporarily rate-limited. Please retry in about a minute.',
        code: 'RATE_LIMITED',
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
