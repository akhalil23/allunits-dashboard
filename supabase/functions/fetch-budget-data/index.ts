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
  { id: 'I',   sheetName: 'Pillar I GSR',         subtotalRow: 62 },
  { id: 'II',  sheetName: 'Pillar II SAS',         subtotalRow: 81 },
  { id: 'III', sheetName: 'Pillar III SOM',         subtotalRow: 101 },
  { id: 'IV',  sheetName: 'Pillar IV Development',  subtotalRow: 225 },
  { id: 'V',   sheetName: 'Pillar V ',              subtotalRow: 157 }, // trailing space required
];

// Column mapping within Q:AC range (0-indexed):
// Q=0(Year4), R=1(Year5), S=2, T=3, U=4, V=5(Allocation), W=6, X=7, Y=8(Unspent), Z=9(Spent), AA=10(TotalCommitted), AB=11, AC=12(Available)
const COL_YEAR4 = 0;       // Q - Year 4 (2025-2026)
const COL_YEAR5 = 1;       // R - Year 5 (2026-2027)
const COL_ALLOCATION = 5;  // V - Total Budget (Allocation)
const COL_UNSPENT = 8;     // Y - Unspent Commitment
const COL_SPENT = 9;       // Z - Spent Commitment
const COL_COMMITTED = 10;  // AA - Total Committed
const COL_AVAILABLE = 12;  // AC - Available Balance

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

function parseNumber(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).replace(/[,$\s]/g, '').replace(/\u00A0/g, '').trim();
  if (s === '' || s === '-' || s === '—') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
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

    // Get service account
    const serviceAccountRaw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountRaw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY is not configured');
    const serviceAccount = JSON.parse(serviceAccountRaw);
    const accessToken = await getAccessToken(serviceAccount);

    // Build ranges: one row per pillar, columns Q:AC
    const ranges = PILLAR_BUDGET_CONFIG.map(p => {
      const escaped = `'${p.sheetName}'`;
      return `${escaped}!Q${p.subtotalRow}:AC${p.subtotalRow}`;
    });

    const rangeParams = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${FINANCE_SPREADSHEET_ID}/values:batchGet?${rangeParams}&valueRenderOption=UNFORMATTED_VALUE`;

    const sheetsResp = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

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

    for (let i = 0; i < PILLAR_BUDGET_CONFIG.length; i++) {
      const config = PILLAR_BUDGET_CONFIG[i];
      const row = valueRanges[i]?.values?.[0] || [];

      const allocation = parseNumber(row[COL_ALLOCATION]);
      const spent = parseNumber(row[COL_SPENT]);
      const unspent = parseNumber(row[COL_UNSPENT]);
      const committed = parseNumber(row[COL_COMMITTED]);
      const available = parseNumber(row[COL_AVAILABLE]);
      const year4 = parseNumber(row[COL_YEAR4]);
      const year5 = parseNumber(row[COL_YEAR5]);

      // Validation: Spent + Unspent = Committed (with tolerance)
      const commitSum = spent + unspent;
      if (Math.abs(commitSum - committed) > 1) {
        validationErrors.push(`Pillar ${config.id}: Spent(${spent}) + Unspent(${unspent}) = ${commitSum} ≠ Committed(${committed})`);
      }

      // Validation: Committed + Available = Allocation (with tolerance)
      const totalCheck = committed + available;
      if (Math.abs(totalCheck - allocation) > 1) {
        validationErrors.push(`Pillar ${config.id}: Committed(${committed}) + Available(${available}) = ${totalCheck} ≠ Allocation(${allocation})`);
      }

      pillars[config.id] = { allocation, spent, unspent, committed, available, year4, year5 };
    }

    if (validationErrors.length > 0) {
      console.warn('Budget validation warnings:', validationErrors);
    }

    const result = {
      pillars,
      observedAt: new Date().toISOString(),
      validationErrors,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('fetch-budget-data error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
