// Seeds the prototype Healthcare account (SP_Healthcare / SP_Healthcare) as a healthcare_executive.
// Admin-only.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await anonClient.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await anonClient.rpc('get_user_role', { _user_id: userData.user.id });
    if (roleData !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    const email = 'sp_healthcare@sp-dashboard.internal';
    const username = 'sp_healthcare';
    const password = 'SP_Healthcare';

    const { data: existing } = await admin.from('profiles').select('user_id').eq('username', username).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ message: 'Healthcare account already exists', existed: true, username }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: newUser, error: createError } = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    });
    if (createError) {
      return new Response(JSON.stringify({ error: `Failed to create user: ${createError.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = newUser.user!.id;

    const { error: profileError } = await admin.from('profiles').insert({ user_id: userId, username, auth_email: email });
    if (profileError) {
      return new Response(JSON.stringify({ error: `Failed to create profile: ${profileError.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: roleError } = await admin.from('user_roles').insert({
      user_id: userId, role: 'healthcare_executive', unit_id: null, is_active: true,
    });
    if (roleError) {
      return new Response(JSON.stringify({ error: `Failed to create role: ${roleError.message}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      message: 'Healthcare prototype account created', userId, username, password,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
