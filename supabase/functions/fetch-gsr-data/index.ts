import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SPREADSHEET_ID = '14Z6hsOOx4reMzE5KYIkWgVi31BAuQSOwkZnE7Qhzqvk';

// Explicit cell ranges with generous upper bounds for full row coverage
const RANGES = [
  "'Pillar I'!A4:G300",
  "'Pillar I'!BX4:CY300",
  "'Pillar II'!A4:G300",
  "'Pillar II'!BX4:CY300",
  "'Pillar III'!A4:G300",
  "'Pillar III'!BX4:CY300",
  "'Pillar IV'!A4:G400",
  "'Pillar IV'!BX4:CY400",
  "'Pillar V'!A4:G300",
  "'Pillar V'!BX4:CY300",
];

// Term window indices (each window = 7 columns in the BX:CY range)
const TERM_WINDOW_KEYS = [
  'mid-2025-2026',
  'end-2025-2026',
  'mid-2026-2027',
  'end-2026-2027',
] as const;

// Within each 7-column window:
// 0: SP Target, 1: SP Status, 2: % Completion (SP), 3: Yearly Target, 4: Yearly Status, 5: % Completion (Yearly), 6: Supporting Doc.
const WIN_SP_TARGET = 0;
const WIN_SP_STATUS = 1;
const WIN_SP_COMP = 2;
const WIN_YEARLY_TARGET = 3;
const WIN_YEARLY_STATUS = 4;
const WIN_YEARLY_COMP = 5;
const WIN_SUPPORTING_DOC = 6;
const WINDOW_SIZE = 7;

// Core columns (A:G)
const CORE_GOAL = 0;
const CORE_ACTION = 1;
const CORE_ACTION_STEP = 3;
const CORE_OWNER = 5;

// --- Helpers ---

async function createJWT(serviceAccount: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64url(encoder.encode(JSON.stringify(header)));
  const claimB64 = base64url(encoder.encode(JSON.stringify(claim)));
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

  const signatureB64 = base64url(new Uint8Array(signature));
  return `${unsignedToken}.${signatureB64}`;
}

async function getAccessToken(serviceAccount: any): Promise<string> {
  const jwt = await createJWT(serviceAccount);
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Failed to get access token: ${resp.status} ${errText}`);
  }

  const data = await resp.json();
  return data.access_token;
}

type Status = 'Not Applicable' | 'Not Started' | 'In Progress' | 'Completed – On Target' | 'Completed – Below Target';

/** Check if a raw value should be treated as Not Applicable */
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
  if (s.includes('above target')) return null; // Forbidden

  // FIX: Any status containing "%" (e.g. "% Completion of activity", "In progress (%)") → In Progress
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

function safeGet(arr: any[], idx: number): string {
  if (idx < 0 || !arr || idx >= arr.length) return '';
  return String(arr[idx] ?? '');
}

/** Check if an entire row is blank (all cells empty or whitespace) */
function isRowFullyBlank(row: any[]): boolean {
  if (!row || row.length === 0) return true;
  return row.every((c: any) => !c || String(c).trim() === '');
}

/** 
 * Check if a row is a valid ITEM row.
 * A row is valid if Column A in core is non-empty OR any cell in the term row is non-empty.
 */
function isValidItemRow(coreRow: any[], termRow: any[]): boolean {
  const colA = safeGet(coreRow, 0);
  if (colA.trim() !== '') return true;
  // Also valid if any BX:CY cell has data
  if (termRow && termRow.length > 0 && !isRowFullyBlank(termRow)) return true;
  return false;
}

interface TermData {
  spStatus: Status;
  spCompletion: number;
  spTarget: string;
  yearlyStatus: Status;
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

  // Check if term window columns exist
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

  // Default empty/null status to Not Applicable (not Not Started) for cleaner applicability
  const resolvedSpStatus = spStatus ?? (isNotApplicableRaw(rawSpStatus) ? 'Not Applicable' : 'Not Started');
  const resolvedYearlyStatus = yearlyStatus ?? (isNotApplicableRaw(rawYearlyStatus) ? 'Not Applicable' : 'Not Started');

  return {
    td: {
      spStatus: resolvedSpStatus,
      spCompletion: spCompResult.value ?? 0,
      spTarget: safeGet(termRow, offset + WIN_SP_TARGET),
      yearlyStatus: resolvedYearlyStatus,
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

  // Track consecutive blank rows — stop after 10 consecutive fully blank rows
  let consecutiveBlanks = 0;
  const BLANK_THRESHOLD = 10;

  for (let i = 0; i < maxRows; i++) {
    const core = coreRows[i] || [];
    const term = termRows[i] || [];

    // Check if both core and term rows are fully blank
    if (isRowFullyBlank(core) && isRowFullyBlank(term)) {
      consecutiveBlanks++;
      if (consecutiveBlanks >= BLANK_THRESHOLD) {
        break;
      }
      continue;
    }
    consecutiveBlanks = 0; // Reset on non-blank row

    // Valid item: Column A non-empty OR any BX:CY cell non-empty
    if (!isValidItemRow(core, term)) continue;

    const actionStep = safeGet(core, CORE_ACTION_STEP);
    const goal = safeGet(core, CORE_GOAL);
    const action = safeGet(core, CORE_ACTION);
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
      sheetRow: i + 5, // row 4 is header (index 0), data starts at row 5
    });
  }

  return { items, invalidStatuses: totalInvalidStatuses, invalidCompletions: totalInvalidCompletions };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountRaw) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountRaw);
    const accessToken = await getAccessToken(serviceAccount);

    const rangeParams = RANGES.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values:batchGet?${rangeParams}`;

    const sheetsResp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!sheetsResp.ok) {
      const errText = await sheetsResp.text();
      throw new Error(`Google Sheets API error: ${sheetsResp.status} ${errText}`);
    }

    const sheetsData = await sheetsResp.json();
    const valueRanges = sheetsData.valueRanges || [];

    const observedAt = new Date().toISOString();
    const pillarIds = ['I', 'II', 'III', 'IV', 'V'];
    let allItems: ActionItem[] = [];
    let totalInvalidStatuses = 0;
    let totalInvalidCompletions = 0;
    let missingBlocks = 0;

    const anomalies: AnomalyLog = {
      unexpectedStatuses: [],
      outOfRangeCompletions: [],
      missingTermColumns: [],
    };

    for (let p = 0; p < 5; p++) {
      const coreRange = valueRanges[p * 2];
      const termRange = valueRanges[p * 2 + 1];

      if (!coreRange?.values || !termRange?.values) {
        missingBlocks++;
        console.error(`Missing data for Pillar ${pillarIds[p]}`);
        continue;
      }

      // Skip header row (row 4 = index 0)
      const coreRows = coreRange.values.slice(1);
      const termRows = termRange.values.slice(1);

      const { items, invalidStatuses, invalidCompletions } = processPillarData(
        pillarIds[p], coreRows, termRows, anomalies
      );

      allItems = allItems.concat(items);
      totalInvalidStatuses += invalidStatuses;
      totalInvalidCompletions += invalidCompletions;
    }

    // Log anomalies server-side for diagnostics
    if (anomalies.unexpectedStatuses.length > 0) {
      console.warn('Unexpected statuses:', anomalies.unexpectedStatuses.slice(0, 20));
    }
    if (anomalies.outOfRangeCompletions.length > 0) {
      console.warn('Out-of-range completions:', anomalies.outOfRangeCompletions.slice(0, 20));
    }
    if (anomalies.missingTermColumns.length > 0) {
      console.warn('Missing term columns:', anomalies.missingTermColumns.slice(0, 20));
    }

    const result = {
      data: allItems,
      observedAt,
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

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('fetch-gsr-data error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});