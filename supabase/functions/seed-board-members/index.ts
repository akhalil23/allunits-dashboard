import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TOTAL_BOARD_MEMBERS = 41;
const EMAIL_DOMAIN = 'sp-dashboard.internal';
// Placeholder password — admins should rotate via Admin Panel before handing out credentials.
const PLACEHOLDER_PASSWORD = 'ChangeMe!2026';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Verify caller is admin
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

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const created: string[] = [];
    const skipped: string[] = [];
    const failed: { username: string; error: string }[] = [];

    for (let i = 1; i <= TOTAL_BOARD_MEMBERS; i++) {
      const username = `exec${String(i).padStart(2, '0')}`;
      const email = `${username}@${EMAIL_DOMAIN}`;

      try {
        // Skip if username already exists
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('user_id')
          .eq('username', username)
          .maybeSingle();

        if (existingProfile) {
          skipped.push(username);
          continue;
        }

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: PLACEHOLDER_PASSWORD,
          email_confirm: true,
        });

        if (createError || !newUser.user) {
          failed.push({ username, error: createError?.message || 'Unknown create error' });
          continue;
        }

        const userId = newUser.user.id;

        const { error: profileError } = await adminClient.from('profiles').insert({
          user_id: userId,
          username,
          auth_email: email,
        });

        if (profileError) {
          failed.push({ username, error: `profile: ${profileError.message}` });
          continue;
        }

        const { error: roleError } = await adminClient.from('user_roles').insert({
          user_id: userId,
          role: 'board_member',
          unit_id: null,
          is_active: true,
        });

        if (roleError) {
          failed.push({ username, error: `role: ${roleError.message}` });
          continue;
        }

        created.push(username);
      } catch (err) {
        failed.push({ username, error: (err as Error).message });
      }
    }

    return new Response(JSON.stringify({
      message: 'Board member seeding complete',
      created_count: created.length,
      skipped_count: skipped.length,
      failed_count: failed.length,
      created,
      skipped,
      failed,
      placeholder_password: PLACEHOLDER_PASSWORD,
      note: 'All accounts share the placeholder password. Rotate via Admin Panel before distributing credentials.',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
