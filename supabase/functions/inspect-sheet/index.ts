// TEMP inspection function — safe to delete after ADM onboarding.
// Uses GOOGLE_SERVICE_ACCOUNT_KEY to read sheet metadata + tiny samples.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  const unsigned = `${headerB64}.${claimB64}`;
  const pem = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');
  const bin = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", bin,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  return `${unsigned}.${base64url(new Uint8Array(sig))}`;
}

async function getToken(sa: any) {
  const jwt = await createJWT(sa);
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  if (!r.ok) throw new Error(`token: ${r.status} ${await r.text()}`);
  return (await r.json()).access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const spreadsheetId = url.searchParams.get('id');
    if (!spreadsheetId) throw new Error('missing ?id=');

    const sa = JSON.parse(Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY')!);
    const token = await getToken(sa);

    // 1. Metadata (sheet names + grid dims)
    const metaR = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title,gridProperties))`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const meta = await metaR.json();
    if (!metaR.ok) throw new Error(`meta: ${metaR.status} ${JSON.stringify(meta)}`);

    const sheets = (meta.sheets || []).map((s: any) => ({
      title: s.properties.title,
      rows: s.properties.gridProperties?.rowCount,
      cols: s.properties.gridProperties?.columnCount,
    }));

    // 2. For each pillar-looking sheet, fetch row 4 header + a couple sample rows
    //    Check core columns A:G and term-block columns BX:CY and BY:CZ
    const samples: any = {};
    const ranges: string[] = [];
    for (const s of sheets) {
      const t = s.title;
      const escaped = `'${t.replace(/'/g, "''")}'`;
      ranges.push(`${escaped}!A1:G6`);
      ranges.push(`${escaped}!BX1:CZ6`);
    }
    if (ranges.length > 0) {
      const batchUrl = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet`);
      ranges.forEach(r => batchUrl.searchParams.append('ranges', r));
      batchUrl.searchParams.set('valueRenderOption', 'FORMATTED_VALUE');
      const br = await fetch(batchUrl.toString(), { headers: { Authorization: `Bearer ${token}` } });
      const bj = await br.json();
      if (!br.ok) throw new Error(`batch: ${br.status} ${JSON.stringify(bj)}`);
      for (const v of bj.valueRanges || []) {
        samples[v.range] = v.values || [];
      }
    }

    return new Response(JSON.stringify({ sheets, samples }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
