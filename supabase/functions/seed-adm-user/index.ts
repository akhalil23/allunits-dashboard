// One-shot ADM user provisioning. Safe to delete after a single successful run.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, key);

    const username = 'adm';
    const email = 'adm@spdashboard.lau';
    const password = 'adm';
    const unitId = 'ADM';

    // Idempotent: skip if profile exists
    const { data: existing } = await admin
      .from('profiles').select('user_id').eq('username', username).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ skipped: true, reason: 'username already exists' }),
        { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const { data: created, error: cErr } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (cErr || !created.user) throw new Error(`createUser: ${cErr?.message}`);
    const userId = created.user.id;

    const { error: pErr } = await admin.from('profiles').insert({
      user_id: userId, username, auth_email: email,
    });
    if (pErr) throw new Error(`profile: ${pErr.message}`);

    const { error: rErr } = await admin.from('user_roles').insert({
      user_id: userId, role: 'unit_user', unit_id: unitId, is_active: true,
    });
    if (rErr) throw new Error(`role: ${rErr.message}`);

    return new Response(JSON.stringify({ ok: true, username, unit_id: unitId, user_id: userId }),
      { headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
