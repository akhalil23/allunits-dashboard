import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Finance unit spreadsheet (contains university-wide budget data)
const FINANCE_SPREADSHEET_ID = '1SWb0okdTuFZub8XFS6tclitCv-FRaSXbcvx6kagvvu4';

// Pillar subtotal rows and sheet names — STRICT, no auto-detection
const PILLAR_BUDGET_CONFIG = [
  { id: 'I', sheetName: 'Pillar I GSR', subtotalRow: 62, dataStartRow: 5 },
  { id: 'II', sheetName: 'Pillar II SAS', subtotalRow: 81, dataStartRow: 5 },
  { id: 'III', sheetName: 'Pillar III SOM', subtotalRow: 101, dataStartRow: 5 },
  { id: 'IV', sheetName: 'Pillar IV Development', subtotalRow: 225, dataStartRow: 5 },
  { id: 'V', sheetName: 'Pillar V ', subtotalRow: 157, dataStartRow: 5 }, // trailing space required
];

// Column mapping within Q:AC range (0-indexed):
const COL_YEAR4 = 0; // Q - Year 4 (2025-2026)
const COL_YEAR5 = 1; // R - Year 5 (2026-2027)
const COL_ALLOCATION = 5; // V - Total Budget (Allocation)
const COL_UNSPENT = 8; // Y - Unspent Commitment
const COL_SPENT = 9; // Z - Spent Commitment
const COL_COMMITTED = 10; // AA - Total Committed
const COL_AVAILABLE = 12; // AC - Available Balance

// Core columns for action step identification (A:G, 0-indexed)
const CORE_GOAL = 0;       // A - Goal
const CORE_ACTION = 1;     // B - Action / Objective
const CORE_ACTION_STEP = 3; // D - Action Step

const RATE_LIMIT_PATTERN = /(RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|RATE_LIMITED|\b429\b)/i;
const BUDGET_CACHE_TTL_MS = 2 * 60 * 1000;

interface ActionStepBudget {
  pillar: string;
  goal: string;
  objective: string;
  actionStep: string;
  sheetRow: number;
  year4: number;
  year5: number;
  allocation: number;
  spent: number;
  unspent: number;
  committed: number;
  available: number;
}

type BudgetDataPayload = {
  pillars: Record<string, {
    allocation: number;
    spent: number;
    unspent: number;
    committed: number;
    available: number;
    year4: number;
    year5: number;
  }>;
  actionStepBudgets: ActionStepBudget[];
  observedAt: string;
  validationErrors: string[];
  stale?: boolean;
  warning?: string;
};

type BudgetCacheEntry = {
  data: BudgetDataPayload;
  cachedAt: number;
  expiresAt: number;
};

type BudgetCacheGlobal = typeof globalThis & {
  __budget_data_cache__?: BudgetCacheEntry;
};

const budgetCacheGlobal = globalThis as BudgetCacheGlobal;

function getBudgetCache(): BudgetCacheEntry | null {
  return budgetCacheGlobal.__budget_data_cache__ ?? null;
}

function setBudgetCache(data: BudgetDataPayload) {
  budgetCacheGlobal.__budget_data_cache__ = {
    data,
    cachedAt: Date.now(),
    expiresAt: Date.now() + BUDGET_CACHE_TTL_MS,
  };
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
  const cryptoKey = await crypto.subtle.importKey("pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(unsignedToken));
  return `${unsignedToken}.${base64url(new Uint8Array(signature))}`;
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

function cleanCellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  let text = String(value);
  text = text.replace(/\u00A0/g, ' ');
  text = text.replace(/\t/g, ' ');
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  text = text.trim();
  return text;
}

function parseNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).replace(/[,$\s]/g, '').replace(/\u00A0/g, '').trim();
  if (s === '' || s === '-' || s === '—') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function isRowFullyBlank(row: any[]): boolean {
  if (!row || row.length === 0) return true;
  return row.every((c: any) => cleanCellText(c) === '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const freshCache = getBudgetCache();
    if (freshCache && freshCache.expiresAt > Date.now()) {
      return new Response(JSON.stringify({
        ...freshCache.data,
        cache: {
          hit: true,
          stale: false,
          cachedAt: new Date(freshCache.cachedAt).toISOString(),
        },
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get service account
    const serviceAccountRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountRaw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not configured');
    const serviceAccount = JSON.parse(serviceAccountRaw);
    const accessToken = await getAccessToken(serviceAccount);

    // Build ranges: 
    // For each pillar: subtotal row Q:AC (for pillar totals) + core A:G rows + budget Q:AC rows (for action steps)
    const ranges: string[] = [];
    for (const p of PILLAR_BUDGET_CONFIG) {
      const escaped = `'${p.sheetName}'`;
      // Subtotal row for pillar totals
      ranges.push(`${escaped}!Q${p.subtotalRow}:AC${p.subtotalRow}`);
      // Core data (A:G) for action step identification — rows dataStartRow to subtotalRow-1
      const lastDataRow = p.subtotalRow - 1;
      ranges.push(`${escaped}!A${p.dataStartRow}:G${lastDataRow}`);
      // Budget data (Q:AC) for each action step row
      ranges.push(`${escaped}!Q${p.dataStartRow}:AC${lastDataRow}`);
    }

    const rangeParams = ranges.map((r) => `ranges=${encodeURIComponent(r)}`).join('&');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${FINANCE_SPREADSHEET_ID}/values:batchGet?${rangeParams}&valueRenderOption=UNFORMATTED_VALUE`;

    const sheetsResp = await fetchWithRateLimitRetry(url, accessToken);

    if (!sheetsResp.ok) {
      const errText = await sheetsResp.text();
      throw new Error(`Google Sheets API error: ${sheetsResp.status} ${errText}`);
    }

    const sheetsData = await sheetsResp.json();
    const valueRanges = sheetsData.valueRanges || [];

    const pillars: Record<string, {
      allocation: number;
      spent: number;
      unspent: number;
      committed: number;
      available: number;
      year4: number;
      year5: number;
    }> = {};

    const validationErrors: string[] = [];
    const allActionStepBudgets: ActionStepBudget[] = [];

    for (let i = 0; i < PILLAR_BUDGET_CONFIG.length; i++) {
      const config = PILLAR_BUDGET_CONFIG[i];
      // Each pillar has 3 ranges: subtotal, core, budget
      const subtotalRow = valueRanges[i * 3]?.values?.[0] || [];
      const coreRows: any[][] = valueRanges[i * 3 + 1]?.values || [];
      const budgetRows: any[][] = valueRanges[i * 3 + 2]?.values || [];

      // --- Pillar subtotals ---
      const allocation = parseNumber(subtotalRow[COL_ALLOCATION]);
      const spent = parseNumber(subtotalRow[COL_SPENT]);
      const unspent = parseNumber(subtotalRow[COL_UNSPENT]);
      const committed = parseNumber(subtotalRow[COL_COMMITTED]);
      const available = parseNumber(subtotalRow[COL_AVAILABLE]);
      const year4 = parseNumber(subtotalRow[COL_YEAR4]);
      const year5 = parseNumber(subtotalRow[COL_YEAR5]);

      // Validation
      const commitSum = spent + unspent;
      if (Math.abs(commitSum - committed) > 1) {
        validationErrors.push(`Pillar ${config.id}: Spent(${spent}) + Unspent(${unspent}) = ${commitSum} ≠ Committed(${committed})`);
      }
      const totalCheck = committed + available;
      if (Math.abs(totalCheck - allocation) > 1) {
        validationErrors.push(`Pillar ${config.id}: Committed(${committed}) + Available(${available}) = ${totalCheck} ≠ Allocation(${allocation})`);
      }

      pillars[config.id] = { allocation, spent, unspent, committed, available, year4, year5 };

      // --- Per-action-step budget data ---
      const maxRows = Math.max(coreRows.length, budgetRows.length);
      let lastGoal = '';
      let lastAction = '';
      let consecutiveBlanks = 0;
      const BLANK_THRESHOLD = 10;

      for (let r = 0; r < maxRows; r++) {
        const core = coreRows[r] || [];
        const budget = budgetRows[r] || [];

        if (isRowFullyBlank(core) && isRowFullyBlank(budget)) {
          consecutiveBlanks++;
          if (consecutiveBlanks >= BLANK_THRESHOLD) break;
          continue;
        }
        consecutiveBlanks = 0;

        const rawGoal = cleanCellText(core[CORE_GOAL]);
        const rawAction = cleanCellText(core[CORE_ACTION]);
        const rawActionStep = cleanCellText(core[CORE_ACTION_STEP]);

        // Forward-fill
        if (rawGoal !== '') lastGoal = rawGoal;
        if (rawAction !== '') lastAction = rawAction;

        const goal = rawGoal || lastGoal;
        const objective = rawAction || lastAction;
        const actionStep = rawActionStep || objective || `Action ${config.id}.${r + 1}`;

        // Skip rows with no meaningful content
        if (!actionStep && !goal && !objective) continue;

        const rowYear4 = parseNumber(budget[COL_YEAR4]);
        const rowYear5 = parseNumber(budget[COL_YEAR5]);
        const rowAllocation = parseNumber(budget[COL_ALLOCATION]);
        const rowSpent = parseNumber(budget[COL_SPENT]);
        const rowUnspent = parseNumber(budget[COL_UNSPENT]);
        const rowCommitted = parseNumber(budget[COL_COMMITTED]);
        const rowAvailable = parseNumber(budget[COL_AVAILABLE]);

        // Only include rows that have some budget data OR have an action step name
        if (rowAllocation > 0 || rowCommitted > 0 || rowSpent > 0 || rawActionStep !== '') {
          allActionStepBudgets.push({
            pillar: config.id,
            goal,
            objective,
            actionStep,
            sheetRow: config.dataStartRow + r,
            year4: rowYear4,
            year5: rowYear5,
            allocation: rowAllocation,
            spent: rowSpent,
            unspent: rowUnspent,
            committed: rowCommitted,
            available: rowAvailable,
          });
        }
      }
    }

    if (validationErrors.length > 0) {
      console.warn('Budget validation warnings:', validationErrors);
    }

    const result: BudgetDataPayload = {
      pillars,
      actionStepBudgets: allActionStepBudgets,
      observedAt: new Date().toISOString(),
      validationErrors,
    };

    setBudgetCache(result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('fetch-budget-data error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    const isRateLimited = RATE_LIMIT_PATTERN.test(msg);

    if (isRateLimited) {
      const staleCache = getBudgetCache();
      if (staleCache) {
        return new Response(JSON.stringify({
          ...staleCache.data,
          stale: true,
          warning: 'Budget data is temporarily using a cached snapshot due to source rate limits.',
          cache: {
            hit: true,
            stale: true,
            cachedAt: new Date(staleCache.cachedAt).toISOString(),
          },
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({
        error: 'Data source is temporarily rate-limited. Please retry in about a minute.',
        code: 'RATE_LIMITED',
      }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
