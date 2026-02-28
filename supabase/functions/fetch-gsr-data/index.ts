import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const DEFAULT_SPREADSHEET_ID = '14Z6hsOOx4reMzE5KYIkWgVi31BAuQSOwkZnE7Qhzqvk';

// ... (all existing RANGES, TERM_WINDOW_KEYS, helper functions remain identical)

// Pillar search patterns - we'll match sheet names dynamically
const PILLAR_PATTERNS = [
  { id: 'I', patterns: ['Pillar I', 'Pillar 1', 'pillar i', 'pillar 1'], maxRow: 300 },
  { id: 'II', patterns: ['Pillar II', 'Pillar 2', 'pillar ii', 'pillar 2'], maxRow: 300 },
  { id: 'III', patterns: ['Pillar III', 'Pillar 3', 'pillar iii', 'pillar 3'], maxRow: 300 },
  { id: 'IV', patterns: ['Pillar IV', 'Pillar 4', 'pillar iv', 'pillar 4'], maxRow: 400 },
  { id: 'V', patterns: ['Pillar V', 'Pillar 5', 'pillar v', 'pillar 5'], maxRow: 300 },
];

function buildRangesFromSheetNames(sheetNames: string[]): { ranges: string[]; pillarMap: { id: string; sheetName: string }[] } {
  const ranges: string[] = [];
  const pillarMap: { id: string; sheetName: string }[] = [];
  
  for (const pillar of PILLAR_PATTERNS) {
    // Find matching sheet name (case-insensitive, trimmed)
    const match = sheetNames.find(name => {
      const lower = name.trim().toLowerCase();
      return pillar.patterns.some(p => lower === p.toLowerCase());
    });
    
    if (match) {
      const escaped = `'${match}'`;
      ranges.push(`${escaped}!A4:G${pillar.maxRow}`);
      ranges.push(`${escaped}!BX4:CY${pillar.maxRow}`);
      pillarMap.push({ id: pillar.id, sheetName: match });
    } else {
      console.warn(`No sheet found for Pillar ${pillar.id}. Available sheets: ${sheetNames.join(', ')}`);
    }
  }
  
  return { ranges, pillarMap };
}

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

function safeGet(arr: any[], idx: number): string {
  if (idx < 0 || !arr || idx >= arr.length) return '';
  return String(arr[idx] ?? '');
}

function isRowFullyBlank(row: any[]): boolean {
  if (!row || row.length === 0) return true;
  return row.every((c: any) => !c || String(c).trim() === '');
}

function isValidItemRow(coreRow: any[], termRow: any[]): boolean {
  const colA = safeGet(coreRow, 0);
  if (colA.trim() !== '') return true;
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
  let consecutiveBlanks = 0;
  const BLANK_THRESHOLD = 10;

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
      sheetRow: i + 5,
    });
  }

  return { items, invalidStatuses: totalInvalidStatuses, invalidCompletions: totalInvalidCompletions };
}

// Unit ID to spreadsheet ID mapping for server-side validation
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
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Get user role and unit
    const { data: userRole } = await userClient.rpc('get_user_role', { _user_id: user.id });
    const { data: userUnit } = await userClient.rpc('get_user_unit', { _user_id: user.id });

    // Parse requested unit_id from body
    let requestedUnitId = 'GSR';
    let spreadsheetId = DEFAULT_SPREADSHEET_ID;
    try {
      if (req.method === 'POST') {
        const body = await req.json();
        if (body?.unitId) requestedUnitId = body.unitId;
        // Ignore client-provided spreadsheetId — resolve server-side
      }
    } catch { /* use default */ }

    // Enforce unit isolation
    if (userRole !== 'admin') {
      // unit_user can only access their own unit
      if (userUnit && requestedUnitId !== userUnit) {
        return new Response(JSON.stringify({ error: 'Access denied: you can only access your assigned unit' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Resolve spreadsheetId server-side from unit_id
    spreadsheetId = UNIT_SPREADSHEETS[requestedUnitId] || DEFAULT_SPREADSHEET_ID;

    const serviceAccountRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountRaw) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not configured');
    }

    const serviceAccount = JSON.parse(serviceAccountRaw);
    const accessToken = await getAccessToken(serviceAccount);

    // Step 1: Discover sheet names from spreadsheet metadata
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const metaResp = await fetch(metaUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!metaResp.ok) {
      const metaErr = await metaResp.text();
      throw new Error(`Failed to fetch sheet metadata: ${metaResp.status} ${metaErr}`);
    }
    const metaData = await metaResp.json();
    const sheetNames: string[] = (metaData.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);
    console.log(`Spreadsheet ${requestedUnitId} sheets: ${sheetNames.join(', ')}`);

    // Step 2: Build ranges dynamically based on actual sheet names
    const { ranges: RANGES, pillarMap } = buildRangesFromSheetNames(sheetNames);
    
    if (RANGES.length === 0) {
      throw new Error(`No pillar sheets found in spreadsheet. Available sheets: ${sheetNames.join(', ')}`);
    }

    const rangeParams = RANGES.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangeParams}`;

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
      const coreRange = valueRanges[p * 2];
      const termRange = valueRanges[p * 2 + 1];

      if (!coreRange?.values || !termRange?.values) {
        missingBlocks++;
        console.error(`Missing data for Pillar ${pillarMap[p].id} (sheet: ${pillarMap[p].sheetName})`);
        continue;
      }

      const coreRows = coreRange.values.slice(1);
      const termRows = termRange.values.slice(1);

      const { items, invalidStatuses, invalidCompletions } = processPillarData(
        pillarMap[p].id, coreRows, termRows, anomalies
      );

      allItems = allItems.concat(items);
      totalInvalidStatuses += invalidStatuses;
      totalInvalidCompletions += invalidCompletions;
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

    // Fetch sheet metadata
    let sheetLastModified: string | null = null;
    let sheetLastModifiedBy: string | null = null;
    try {
      const driveUrl = `https://www.googleapis.com/drive/v3/files/${spreadsheetId}?fields=modifiedTime,lastModifyingUser/displayName`;
      const driveResp = await fetch(driveUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (driveResp.ok) {
        const driveData = await driveResp.json();
        sheetLastModified = driveData.modifiedTime || null;
        sheetLastModifiedBy = driveData.lastModifyingUser?.displayName || null;
      }
    } catch (driveErr) {
      console.warn('Drive metadata fetch error:', driveErr);
    }

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
