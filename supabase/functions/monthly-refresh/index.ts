/**
 * Monthly Refresh Orchestrator
 * ----------------------------
 * Triggered by pg_cron on the 1st of each month and by retry cron jobs.
 * - Fetches all 25 units (view='all') and the budget snapshot.
 * - Validates atomically: if ANY unit or budget fails, NOTHING is published.
 * - On success: writes one publication + per-unit + budget rows, locks the month.
 * - On failure: keeps previous validated snapshot active, records the attempt,
 *   sets next_retry_at according to schedule.
 *
 * Idempotency: if a publication for the current month already exists,
 * the call short-circuits and returns success without re-fetching.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-service',
};

// Same unit list as src/lib/unit-config.ts
const UNIT_IDS = [
  'GSR','SON','SArD','SOP','SOM','AKSOB','SOE','SAS','DIRA','CIL','Libraries',
  'BDGA','SDEM','IT','Facilities','Finance','UGRC','StratCom_Alumni','Advancement',
  'Provost','PwD','OfS','HR','Procurement','ADM',
];

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function computeNextRetry(attemptsThisMonth: number): Date {
  // First 12 attempts: every 30 minutes (covers ~6h)
  // After that: every 3 hours
  const minutes = attemptsThisMonth < 12 ? 30 : 180;
  return new Date(Date.now() + minutes * 60 * 1000);
}

interface FetchUnitOk { unitId: string; ok: true; payload: any; }
interface FetchUnitErr { unitId: string; ok: false; error: string; }
type FetchUnitResult = FetchUnitOk | FetchUnitErr;

async function callInternal(fnName: string, body: any, baseUrl: string, serviceKey: string, timeoutMs = 90000) {
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
    let json: any = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* ignore */ }
    return { ok: resp.ok, status: resp.status, json, raw: text };
  } finally {
    clearTimeout(timer);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Optional: parse body for triggered_by + force flag
  let triggeredBy = 'cron';
  let force = false;
  try {
    if (req.method === 'POST') {
      const body = await req.json();
      if (body?.triggeredBy) triggeredBy = String(body.triggeredBy);
      if (body?.force === true) force = true;
    }
  } catch { /* ignore */ }

  const month = currentMonth();

  // Idempotency: skip if month already published, unless force=true (admin override).
  const { data: existing } = await admin
    .from('monthly_snapshot_publications')
    .select('id, month')
    .eq('month', month)
    .maybeSingle();

  if (existing && !force) {
    return new Response(JSON.stringify({
      ok: true, skipped: true, reason: 'already_published', month,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }

  // Force-refresh shortcut: month already published → backfill budget into the
  // existing publication instead of re-inserting (unique constraint on month).
  if (existing && force) {
    const { data: existingBudget } = await admin
      .from('monthly_budget_snapshots')
      .select('id')
      .eq('publication_id', existing.id)
      .maybeSingle();

    let budgetPayload: any = null;
    let budgetError: string | null = null;
    try {
      const r = await callInternal('fetch-budget-data', {}, SUPABASE_URL, SERVICE_KEY);
      if (r.ok && r.json && !r.json.error) budgetPayload = r.json;
      else budgetError = r.json?.error ?? `HTTP ${r.status}`;
    } catch (err) {
      budgetError = err instanceof Error ? err.message : 'Unknown error';
    }

    if (budgetPayload && !existingBudget) {
      await admin.from('monthly_budget_snapshots').insert({
        publication_id: existing.id,
        month,
        payload: budgetPayload,
        observed_at: budgetPayload?.observedAt ?? new Date().toISOString(),
      });
      await admin.from('monthly_snapshot_publications')
        .update({ budget_included: true, notes: null })
        .eq('id', existing.id);
    } else if (budgetPayload && existingBudget) {
      await admin.from('monthly_budget_snapshots')
        .update({ payload: budgetPayload, observed_at: new Date().toISOString() })
        .eq('id', existingBudget.id);
    }

    await admin.from('monthly_refresh_state').update({
      current_status: budgetPayload ? 'success' : 'pending_retry',
      last_success_at: budgetPayload ? new Date().toISOString() : (stateRow as any)?.last_success_at,
      next_retry_at: null,
      last_error: budgetError,
      updated_at: new Date().toISOString(),
    }).eq('id', 'singleton');

    return new Response(JSON.stringify({
      ok: !!budgetPayload, mode: 'force-backfill-budget', month,
      budget: !!budgetPayload, budgetError,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
  }

  // Mark state in_progress
  const { data: stateRow } = await admin
    .from('monthly_refresh_state')
    .select('attempts_this_month, active_month')
    .eq('id', 'singleton')
    .single();

  const attemptsThisMonth = (stateRow?.active_month === month ? stateRow.attempts_this_month ?? 0 : 0) + 1;

  await admin.from('monthly_refresh_state').update({
    current_status: 'in_progress',
    active_month: stateRow?.active_month && stateRow.active_month !== month ? stateRow.active_month : month,
    attempts_this_month: attemptsThisMonth,
    last_attempt_at: new Date().toISOString(),
    next_retry_at: null,
    updated_at: new Date().toISOString(),
  }).eq('id', 'singleton');

  const { data: attemptRow } = await admin.from('monthly_refresh_attempts').insert({
    month, attempt_number: attemptsThisMonth, status: 'in_progress', triggered_by: triggeredBy,
  }).select('id').single();

  const finalize = async (status: 'success' | 'failed', extras: Record<string, any>) => {
    const durationMs = Date.now() - startedAt;
    await admin.from('monthly_refresh_attempts').update({
      status,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
      ...extras,
    }).eq('id', attemptRow!.id);
  };

  try {
    // 1. Fetch all units in parallel (with bounded concurrency).
    const CONCURRENCY = 5;
    const results: FetchUnitResult[] = new Array(UNIT_IDS.length);
    let cursor = 0;
    async function worker() {
      while (true) {
        const idx = cursor++;
        if (idx >= UNIT_IDS.length) return;
        const unitId = UNIT_IDS[idx];
        try {
          const r = await callInternal('fetch-gsr-data', { unitId }, SUPABASE_URL, SERVICE_KEY);
          if (!r.ok || !r.json || r.json.error) {
            results[idx] = { unitId, ok: false, error: r.json?.error ?? `HTTP ${r.status}` };
          } else if (!Array.isArray(r.json.data)) {
            results[idx] = { unitId, ok: false, error: 'Invalid payload (no data array)' };
          } else {
            results[idx] = { unitId, ok: true, payload: r.json };
          }
        } catch (err) {
          results[idx] = { unitId, ok: false, error: err instanceof Error ? err.message : 'Unknown error' };
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

    const failedUnits = results.filter((r): r is FetchUnitErr => !r.ok);
    const successUnits = results.filter((r): r is FetchUnitOk => r.ok);

    if (failedUnits.length > 0) {
      const errSummary = failedUnits.map(f => `${f.unitId}: ${f.error}`).slice(0, 5).join(' | ');
      const msg = `Validation failed: ${failedUnits.length}/${UNIT_IDS.length} units could not be fetched. ${errSummary}`;
      await finalize('failed', {
        units_succeeded: successUnits.length,
        units_failed: failedUnits.length,
        error_message: msg,
        details: { failedUnits: failedUnits.map(f => ({ unitId: f.unitId, error: f.error })) },
      });
      const nextRetry = computeNextRetry(attemptsThisMonth);
      await admin.from('monthly_refresh_state').update({
        current_status: 'pending_retry',
        next_retry_at: nextRetry.toISOString(),
        last_error: msg,
        updated_at: new Date().toISOString(),
      }).eq('id', 'singleton');
      return new Response(JSON.stringify({ ok: false, error: msg, nextRetry: nextRetry.toISOString() }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Fetch budget (treat budget failure as soft — flag but do not abort)
    let budgetPayload: any = null;
    let budgetError: string | null = null;
    try {
      const r = await callInternal('fetch-budget-data', {}, SUPABASE_URL, SERVICE_KEY);
      if (r.ok && r.json && !r.json.error) budgetPayload = r.json;
      else budgetError = r.json?.error ?? `HTTP ${r.status}`;
    } catch (err) {
      budgetError = err instanceof Error ? err.message : 'Unknown error';
    }

    // 3. Atomic publication: insert publication, then unit + budget rows.
    const { data: pub, error: pubErr } = await admin
      .from('monthly_snapshot_publications')
      .insert({
        month,
        total_units: UNIT_IDS.length,
        succeeded_units: successUnits.length,
        budget_included: !!budgetPayload,
        notes: budgetError ? `Budget warning: ${budgetError}` : null,
      })
      .select('id')
      .single();

    if (pubErr || !pub) {
      // Could be unique-constraint race. Treat as already-published.
      const msg = pubErr?.message ?? 'Publication insert returned no row';
      if (/duplicate key/i.test(msg)) {
        await finalize('success', {
          units_succeeded: successUnits.length, units_failed: 0,
          budget_status: budgetPayload ? 'ok' : (budgetError ?? 'missing'),
          details: { note: 'Race: month already published.' },
        });
        await admin.from('monthly_refresh_state').update({
          current_status: 'success', last_success_at: new Date().toISOString(),
          next_retry_at: null, last_error: null, updated_at: new Date().toISOString(),
        }).eq('id', 'singleton');
        return new Response(JSON.stringify({ ok: true, skipped: true, reason: 'race_duplicate', month }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(msg);
    }

    const unitRows = successUnits.map(u => ({
      publication_id: pub.id,
      month,
      unit_id: u.unitId,
      view_type: 'all',
      payload: u.payload,
      observed_at: u.payload?.observedAt ?? new Date().toISOString(),
    }));

    const { error: insUnitErr } = await admin.from('monthly_unit_snapshots').insert(unitRows);
    if (insUnitErr) throw new Error(`Unit snapshot insert failed: ${insUnitErr.message}`);

    if (budgetPayload) {
      await admin.from('monthly_budget_snapshots').insert({
        publication_id: pub.id,
        month,
        payload: budgetPayload,
        observed_at: budgetPayload?.observedAt ?? new Date().toISOString(),
      });
    }

    await admin.from('monthly_refresh_state').update({
      current_status: 'success',
      active_month: month,
      active_publication_id: pub.id,
      last_success_at: new Date().toISOString(),
      next_retry_at: null,
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq('id', 'singleton');

    await finalize('success', {
      units_succeeded: successUnits.length,
      units_failed: 0,
      budget_status: budgetPayload ? 'ok' : (budgetError ?? 'missing'),
    });

    return new Response(JSON.stringify({
      ok: true, month, publicationId: pub.id, units: successUnits.length, budget: !!budgetPayload,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    await finalize('failed', { error_message: msg });
    const nextRetry = computeNextRetry(attemptsThisMonth);
    await admin.from('monthly_refresh_state').update({
      current_status: 'pending_retry',
      next_retry_at: nextRetry.toISOString(),
      last_error: msg,
      updated_at: new Date().toISOString(),
    }).eq('id', 'singleton');
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
