/**
 * Snapshot Reader
 * ---------------
 * Returns the active monthly snapshot for a single unit, all units, the budget,
 * or the publication metadata. This is the ONLY data source the dashboard
 * reads from at runtime.
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

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get latest publication.
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
      if (!row) {
        return new Response(JSON.stringify({ error: `No snapshot found for unit ${requestedUnit}` }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({
        ...row.payload,
        publication: pub,
        snapshotMonth: pub.month,
        snapshotPublishedAt: pub.published_at,
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (kind === 'all-units') {
      const { data: rows } = await admin
        .from('monthly_unit_snapshots')
        .select('unit_id, payload, observed_at')
        .eq('publication_id', pub.id)
        .eq('view_type', 'all');
      return new Response(JSON.stringify({
        publication: pub,
        units: (rows ?? []).map(r => ({ unitId: r.unit_id, payload: r.payload })),
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (kind === 'budget') {
      const { data: row } = await admin
        .from('monthly_budget_snapshots')
        .select('payload, observed_at')
        .eq('publication_id', pub.id)
        .maybeSingle();
      if (!row) {
        // Graceful fallback: return empty budget payload so the dashboard renders
        // instead of blank-screening. The next monthly refresh will populate this.
        return new Response(JSON.stringify({
          pillars: {},
          actionStepBudgets: [],
          observedAt: pub.published_at,
          validationErrors: [],
          budgetUnavailable: true,
          publication: pub,
        }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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
