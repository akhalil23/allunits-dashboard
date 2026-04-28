import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SPREADSHEET_ID = '1jZCAJdmH1_72K8NKI0WMks660u2yCHL7c0MKbOI0KLc';

// In-memory cache (per edge function instance)
interface CacheEntry {
  summaries: any[];
  fetchedAt: number;
}
let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_FALLBACK_MS = 60 * 60 * 1000; // serve stale up to 1h on rate-limit

// Cached access token
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
  if (!raw) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_KEY');
  const sa = JSON.parse(raw);

  const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const claims = base64url(new TextEncoder().encode(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })));

  const sigInput = `${header}.${claims}`;
  const keyData = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, '');
  const binaryKey = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey(
    'pkcs8', binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = base64url(new Uint8Array(
    await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput))
  ));

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${sigInput}.${sig}`,
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('Failed to get access token');
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 3500_000 };
  return data.access_token;
}

async function fetchWithRetry(url: string, token: string, maxAttempts = 4): Promise<Response> {
  let lastResp: Response | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const resp = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (resp.ok) return resp;
    lastResp = resp;
    if (resp.status === 429 || resp.status === 503) {
      if (attempt < maxAttempts - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
    } else {
      return resp;
    }
  }
  return lastResp!;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const ok = (summaries: any[], extra: Record<string, unknown> = {}) =>
    new Response(JSON.stringify({ summaries, ...extra }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  // Serve fresh cache
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return ok(cache.summaries, { cached: true });
  }

  try {
    const token = await getAccessToken();
    const range = encodeURIComponent('C4:H1000');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${range}?majorDimension=ROWS`;
    const resp = await fetchWithRetry(url, token);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`Sheets API error ${resp.status}: ${errText}`);
      // Serve stale cache on rate-limit / unavailable
      if ((resp.status === 429 || resp.status === 503) && cache && Date.now() - cache.fetchedAt < STALE_FALLBACK_MS) {
        return ok(cache.summaries, { cached: true, stale: true });
      }
      // Degrade gracefully: return empty list with a flag instead of 500
      return ok([], {
        error: resp.status === 429 ? 'RATE_LIMITED' : `Sheets API error ${resp.status}`,
        fallback: true,
      });
    }

    const sheet = await resp.json();

    if (!sheet.values || sheet.values.length < 2) {
      cache = { summaries: [], fetchedAt: Date.now() };
      return ok([]);
    }

    const dataRows = sheet.values.slice(1);
    const summaries = dataRows
      .filter((row: string[]) => row[0] && row[1] && row[2])
      .map((row: string[]) => ({
        academicYear: (row[0] || '').trim(),
        period: (row[1] || '').trim(),
        pillar: (row[2] || '').trim(),
        achievements: (row[3] || '').trim(),
        challenges: (row[4] || '').trim(),
        priorities: (row[5] || '').trim(),
      }));

    cache = { summaries, fetchedAt: Date.now() };
    return ok(summaries);
  } catch (err) {
    console.error('fetch-executive-summaries error:', err);
    if (cache && Date.now() - cache.fetchedAt < STALE_FALLBACK_MS) {
      return ok(cache.summaries, { cached: true, stale: true });
    }
    return ok([], { error: (err as Error).message, fallback: true });
  }
});
