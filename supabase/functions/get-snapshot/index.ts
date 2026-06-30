/**
 * Snapshot Reader
 * ---------------
 * Returns dashboard data for a single unit, all units, the budget, or the
 * publication metadata.
 *
 * MODE TOGGLE (env var SNAPSHOT_MODE):
 *   - 'live'    (default) → bypasses the monthly snapshot tables and fetches
 *                          straight from the source spreadsheets (via the
 *                          fetch-gsr-data / fetch-budget-data edge functions).
 *                          The monthly refresh pipeline remains intact in the
 *                          codebase so it can be re-enabled at any time.
 *   - 'monthly'           → reads the most recent published monthly snapshot
 *                          (original behavior).
 *
 * Modes (POST body):
 *   { kind: 'unit', unitId }              → single unit payload
 *   { kind: 'all-units' }                 → array of { unitId, payload }
 *   { kind: 'budget' }                    → budget payload
 *   { kind: 'publication' }               → active publication metadata only
 *
 * Enforces unit isolation for unit_user role.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Same unit list as src/lib/unit-config.ts / monthly-refresh
const UNIT_IDS = [
  'GSR','SON','SArD','SOP','SOM','AKSOB','SOE','SAS','DIRA','CIL','Libraries',
  'BDGA','SDEM','IT','Facilities','Finance','UGRC','StratCom_Alumni','Advancement',
  'Provost','PwD','OfS','HR','Procurement','ADM','GC',
];

// In-memory cache for live mode so we don't refetch 25 sheets on every render.
// TTL is intentionally short — the user wants near-real-time updates.
const LIVE_CACHE_TTL_MS = 2 * 60 * 1000;
type CacheEntry = { value: unknown; expiresAt: number };
const liveCache = new Map<string, CacheEntry>();

function getCached(key: string): unknown | null {
  const entry = liveCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { liveCache.delete(key); return null; }
  return entry.value;
}
function setCached(key: string, value: unknown) {
  liveCache.set(key, { value, expiresAt: Date.now() + LIVE_CACHE_TTL_MS });
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function syntheticPublication(succeeded: number, total: number, budgetIncluded: boolean) {
  const now = new Date().toISOString();
  return {
    id: 'live',
    month: currentMonth(),
    published_at: now,
    total_units: total,
    succeeded_units: succeeded,
    budget_included: budgetIncluded,
  };
}

async function callInternal(fnName: string, body: unknown, baseUrl: string, serviceKey: string, timeoutMs = 90000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const resp = await fetch(`${baseUrl}/functions/v1/${fnName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-service': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify(body ?? {}),
      signal: ctl.signal,
    });
    const text = await resp.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    return { ok: resp.ok, status: resp.status, json: json as any };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLiveUnit(unitId: string, baseUrl: string, serviceKey: string) {
  const cacheKey = `unit:${unitId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const r = await callInternal('fetch-gsr-data', { unitId }, baseUrl, serviceKey);
  if (!r.ok || !r.json || r.json?.error) {
    throw new Error(r.json?.error || `Failed to fetch live data for unit ${unitId}`);
  }
  setCached(cacheKey, r.json);
  return r.json;
}

async function fetchLatestMonthlyUnitFallbacks(admin: ReturnType<typeof createClient>) {
  const { data: pub } = await admin
    .from('monthly_snapshot_publications')
    .select('id, month, published_at, total_units, succeeded_units, budget_included')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!pub) return { publication: null, unitsById: new Map<string, unknown>() };

  const { data: rows } = await admin
    .from('monthly_unit_snapshots')
    .select('unit_id, payload, observed_at')
    .eq('publication_id', pub.id)
    .eq('view_type', 'all');

  return {
    publication: pub,
    unitsById: new Map((rows ?? []).map((row: any) => [row.unit_id, row.payload as unknown])),
  };
}

function annotateSnapshotFallback(payload: unknown, unitId: string, publishedAt?: string) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;
  return {
    ...(payload as Record<string, unknown>),
    stale: true,
    warning: `Unit ${unitId} is using the latest validated snapshot because its live source sheet could not be loaded right now.`,
    cache: {
      hit: true,
      stale: true,
      source: 'monthly_snapshot',
      snapshotPublishedAt: publishedAt ?? null,
    },
  };
}

async function fetchLiveAllUnits(baseUrl: string, serviceKey: string, admin: ReturnType<typeof createClient>) {
  const cacheKey = 'all-units';
  const cached = getCached(cacheKey) as { units: Array<{ unitId: string; payload: unknown }>; succeeded: number; fallbackUnits: string[]; failedUnits: string[] } | null;
  if (cached) return cached;

  const concurrency = 5;
  const results: Array<{ unitId: string; payload: unknown } | null> = new Array(UNIT_IDS.length).fill(null);
  const failedByUnit = new Map<string, string>();

  // Run the unit fetcher with a configurable index list so retries can re-target
  // only the units that failed in the previous pass.
  const runPass = async (indices: number[]) => {
    let cursor = 0;
    const worker = async () => {
      while (true) {
        const localIdx = cursor++;
        if (localIdx >= indices.length) return;
        const idx = indices[localIdx];
        const unitId = UNIT_IDS[idx];
        try {
          const payload = await fetchLiveUnit(unitId, baseUrl, serviceKey);
          results[idx] = { unitId, payload };
          failedByUnit.delete(unitId);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`get-snapshot live unit ${unitId} failed:`, message);
          failedByUnit.set(unitId, message);
          results[idx] = null;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(concurrency, indices.length) }, () => worker()));
  };

  await runPass(UNIT_IDS.map((_, i) => i));

  // Retry pass — transient rate-limits / network blips frequently leave one
  // unit missing on the first attempt. Re-fetch only the failed indices with a
  // short backoff before falling back to the monthly snapshot.
  if (failedByUnit.size > 0) {
    const failedIndices = UNIT_IDS.map((u, i) => failedByUnit.has(u) ? i : -1).filter(i => i >= 0);
    await new Promise(r => setTimeout(r, 750));
    await runPass(failedIndices);
  }
  if (failedByUnit.size > 0) {
    const failedIndices = UNIT_IDS.map((u, i) => failedByUnit.has(u) ? i : -1).filter(i => i >= 0);
    await new Promise(r => setTimeout(r, 1500));
    await runPass(failedIndices);
  }

  const fallbackUnits: string[] = [];
  if (failedByUnit.size > 0) {
    const fallback = await fetchLatestMonthlyUnitFallbacks(admin);
    UNIT_IDS.forEach((unitId, idx) => {
      if (results[idx]) return;
      const payload = fallback.unitsById.get(unitId);
      if (!payload) return;
      results[idx] = {
        unitId,
        payload: annotateSnapshotFallback(payload, unitId, fallback.publication?.published_at),
      };
      fallbackUnits.push(unitId);
    });
  }

  const units = results.filter((u): u is { unitId: string; payload: unknown } => !!u);
  const failedUnits = UNIT_IDS.filter((unitId, idx) => !results[idx]);
  const out = { units, succeeded: UNIT_IDS.length - failedByUnit.size, fallbackUnits, failedUnits };
  if (units.length === UNIT_IDS.length) setCached(cacheKey, out);
  return out;
}

async function fetchLiveBudget(baseUrl: string, serviceKey: string) {
  const cacheKey = 'budget';
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const r = await callInternal('fetch-budget-data', {}, baseUrl, serviceKey);
  if (!r.ok || !r.json || r.json?.error) {
    throw new Error(r.json?.error || 'Failed to fetch live budget data');
  }
  setCached(cacheKey, r.json);
  return r.json;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // Default mode is 'monthly' — dashboards display the approved monthly
    // snapshot and only refresh from source spreadsheets at the start of each
    // month via the monthly-refresh job. Set SNAPSHOT_MODE=live to re-enable
    // continuous live fetching from source sheets.
    const MODE = (Deno.env.get('SNAPSHOT_MODE') ?? 'monthly').toLowerCase();
    const isLive = MODE === 'live';

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: userRole } = await userClient.rpc('get_user_role', { _user_id: user.id });
    const { data: userUnit } = await userClient.rpc('get_user_unit', { _user_id: user.id });

    let body: any = {};
    try { body = await req.json(); } catch { /* ok */ }
    const kind = body?.kind ?? 'publication';
    const forceRefresh = body?.forceRefresh === true;

    // Admin-triggered manual refresh: clear the live-mode server cache so the
    // next fetch goes straight to the source spreadsheets.
    if (forceRefresh && isLive) {
      const isAdmin = userRole === 'admin';
      if (kind === 'unit' && body?.unitId) {
        // Unit users may refresh their own unit; admins may refresh anything.
        if (isAdmin || userUnit === body.unitId) liveCache.delete(`unit:${body.unitId}`);
      } else if (isAdmin) {
        liveCache.clear();
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // LIVE MODE — fetch directly from source spreadsheets (default).
    // ─────────────────────────────────────────────────────────────────────
    if (isLive) {
      if (kind === 'publication') {
        return new Response(JSON.stringify({
          publication: syntheticPublication(UNIT_IDS.length, UNIT_IDS.length, true),
          mode: 'live',
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      if (kind === 'unit') {
        const requestedUnit = body?.unitId;
        if (!requestedUnit) {
          return new Response(JSON.stringify({ error: 'unitId required' }), {
            status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (userRole !== 'admin' && userUnit && requestedUnit !== userUnit) {
          return new Response(JSON.stringify({ error: 'Access denied: unit isolation' }), {
            status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        let payload: Record<string, unknown>;
        try {
          payload = await fetchLiveUnit(requestedUnit, SUPABASE_URL, SERVICE_KEY) as Record<string, unknown>;
        } catch (err) {
          const fallback = await fetchLatestMonthlyUnitFallbacks(admin);
          const fallbackPayload = fallback.unitsById.get(requestedUnit);
          if (!fallbackPayload) throw err;
          payload = annotateSnapshotFallback(fallbackPayload, requestedUnit, fallback.publication?.published_at) as Record<string, unknown>;
        }
        const pub = syntheticPublication(UNIT_IDS.length, UNIT_IDS.length, true);
        return new Response(JSON.stringify({
          ...payload,
          publication: pub,
          snapshotMonth: pub.month,
          snapshotPublishedAt: pub.published_at,
          mode: 'live',
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (kind === 'all-units') {
        const { units, succeeded, fallbackUnits, failedUnits } = await fetchLiveAllUnits(SUPABASE_URL, SERVICE_KEY, admin);
        return new Response(JSON.stringify({
          publication: syntheticPublication(units.length, UNIT_IDS.length, true),
          units,
          liveSucceededUnits: succeeded,
          fallbackUnits,
          failedUnits,
          mode: 'live',
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (kind === 'budget') {
        try {
          const payload = await fetchLiveBudget(SUPABASE_URL, SERVICE_KEY) as Record<string, unknown>;
          return new Response(JSON.stringify({
            ...payload,
            publication: syntheticPublication(UNIT_IDS.length, UNIT_IDS.length, true),
            mode: 'live',
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Failed to load live budget';
          return new Response(JSON.stringify({
            pillars: {},
            actionStepBudgets: [],
            observedAt: new Date().toISOString(),
            validationErrors: [msg],
            budgetUnavailable: true,
            publication: syntheticPublication(UNIT_IDS.length, UNIT_IDS.length, false),
            mode: 'live',
          }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }
      }

      return new Response(JSON.stringify({ error: `Unknown kind: ${kind}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─────────────────────────────────────────────────────────────────────
    // MONTHLY MODE — original published-snapshot behavior (preserved).
    // ─────────────────────────────────────────────────────────────────────
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: pub } = await admin
      .from('monthly_snapshot_publications')
      .select('id, month, published_at, total_units, succeeded_units, budget_included')
      .order('published_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!pub) {
      return new Response(JSON.stringify({
        error: 'No monthly snapshot has been published yet. The next automated refresh will populate the dashboard.',
        code: 'NO_SNAPSHOT',
        publication: null,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (kind === 'publication') {
      return new Response(JSON.stringify({ publication: pub }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Helper — backfill a unit missing from the current monthly publication by
    // fetching it live and persisting it so subsequent reads stay fast and the
    // 26-unit roster is always complete (covers units added mid-cycle, e.g. GC).
    const backfillUnit = async (unitId: string): Promise<unknown | null> => {
      try {
        const payload = await fetchLiveUnit(unitId, SUPABASE_URL, SERVICE_KEY);
        await admin.from('monthly_unit_snapshots').upsert({
          publication_id: pub.id,
          unit_id: unitId,
          view_type: 'all',
          payload,
          observed_at: new Date().toISOString(),
        }, { onConflict: 'publication_id,unit_id,view_type' });
        // Invalidate the cached all-units bundle so the next caller sees the
        // backfilled unit.
        liveCache.delete(`monthly:all-units:${pub.id}`);
        return payload;
      } catch (err) {
        console.error(`monthly backfill failed for ${unitId}:`, err instanceof Error ? err.message : err);
        return null;
      }
    };

    if (kind === 'unit') {
      const requestedUnit = body?.unitId;
      if (!requestedUnit) {
        return new Response(JSON.stringify({ error: 'unitId required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (userRole !== 'admin' && userUnit && requestedUnit !== userUnit) {
        return new Response(JSON.stringify({ error: 'Access denied: unit isolation' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: row } = await admin
        .from('monthly_unit_snapshots')
        .select('payload, observed_at')
        .eq('publication_id', pub.id)
        .eq('unit_id', requestedUnit)
        .eq('view_type', 'all')
        .maybeSingle();
      let payload: unknown | null = row?.payload ?? null;
      if (!payload && UNIT_IDS.includes(requestedUnit)) {
        payload = await backfillUnit(requestedUnit);
      }
      if (!payload) {
        return new Response(JSON.stringify({ error: `No snapshot found for unit ${requestedUnit}` }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        ...(payload as Record<string, unknown>),
        publication: pub,
        snapshotMonth: pub.month,
        snapshotPublishedAt: pub.published_at,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (kind === 'all-units') {
      const cacheKey = `monthly:all-units:${pub.id}`;
      const cached = getCached(cacheKey) as { body: string } | null;
      if (cached) {
        return new Response(cached.body, {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: rows } = await admin
        .from('monthly_unit_snapshots')
        .select('unit_id, payload')
        .eq('publication_id', pub.id)
        .eq('view_type', 'all');
      const byUnit = new Map<string, unknown>((rows ?? []).map(r => [r.unit_id as string, r.payload]));

      // Ensure every configured unit is present — backfill any missing from the
      // live source so the roster stays at the expected count (26 today).
      const missing = UNIT_IDS.filter(u => !byUnit.has(u));
      if (missing.length > 0) {
        await Promise.all(missing.map(async (unitId) => {
          const payload = await backfillUnit(unitId);
          if (payload) byUnit.set(unitId, payload);
        }));
      }

      const units = UNIT_IDS
        .filter(u => byUnit.has(u))
        .map(u => ({ unitId: u, payload: byUnit.get(u) }));
      const body = JSON.stringify({ publication: pub, units });
      // Only cache when we have the full roster, so a transient backfill miss
      // doesn't get pinned for the cache TTL.
      if (units.length === UNIT_IDS.length) setCached(cacheKey, { body });
      return new Response(body, {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    if (kind === 'budget') {
      const { data: row } = await admin
        .from('monthly_budget_snapshots')
        .select('payload, observed_at')
        .eq('publication_id', pub.id)
        .maybeSingle();
      if (!row) {
        return new Response(JSON.stringify({
          pillars: {},
          actionStepBudgets: [],
          observedAt: pub.published_at,
          validationErrors: [],
          budgetUnavailable: true,
          publication: pub,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ ...row.payload, publication: pub }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown kind: ${kind}` }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('get-snapshot error:', msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
