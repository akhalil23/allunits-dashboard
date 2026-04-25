/**
 * Seed Named Board Members
 * Creates the 39 personalized board member accounts with display names.
 * Each user gets username/password as specified, role = board_member,
 * and a display_name on their profile for the welcome message.
 *
 * Idempotent: existing usernames are skipped (display_name is updated if missing).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EMAIL_DOMAIN = 'sp-dashboard.internal';

interface Member {
  full_name: string;
  username: string;
  password: string;
}

const MEMBERS: Member[] = [
  { full_name: 'Mr. Mike Ahmar', username: 'm.ahmar', password: 'm.ahmar' },
  { full_name: 'Dr. Francois Nader', username: 'f.nader', password: 'f.nader' },
  { full_name: 'Mr. George Doumet', username: 'g.doumet', password: 'g.doumet' },
  { full_name: 'Mr. Thomas Abraham', username: 't.abraham', password: 't.abraham' },
  { full_name: 'Dr. Johnny B. Awwad', username: 'j.awwad', password: 'j.awwad' },
  { full_name: 'Mrs. Sallama Bu Haydar Al Sayegh', username: 's.alsayegh', password: 's.alsayegh' },
  { full_name: 'Mr. Raymond Debbane', username: 'r.debbane', password: 'r.debbane' },
  { full_name: 'Mr. Nijad Fares', username: 'n.fares', password: 'n.fares' },
  { full_name: 'Mrs. Eva Kotite Farha', username: 'e.farha', password: 'e.farha' },
  { full_name: 'Dr. Riad Obegi', username: 'r.obegi', password: 'r.obegi' },
  { full_name: 'Ambassador Edward M. Gabriel', username: 'e.gabriel', password: 'e.gabriel' },
  { full_name: 'Dr. Kamal Shehadi', username: 'k.shehadi', password: 'k.shehadi' },
  { full_name: 'Dr. Moise Khayrallah', username: 'm.khayrallah', password: 'm.khayrallah' },
  { full_name: 'Mrs. May Makhzoumi', username: 'm.makhzoumi', password: 'm.makhzoumi' },
  { full_name: 'Mr. Charles Muller', username: 'c.muller', password: 'c.muller' },
  { full_name: 'Dr. Bob Harrington', username: 'b.harrington', password: 'b.harrington' },
  { full_name: 'Dr. H. John Shammas', username: 'j.shammas', password: 'j.shammas' },
  { full_name: 'Mr. Peter Tanous', username: 'p.tanous', password: 'p.tanous' },
  { full_name: 'Dr. Edmond D. Villani', username: 'e.villani', password: 'e.villani' },
  { full_name: 'Rev. Curtis White', username: 'c.white', password: 'c.white' },
  { full_name: 'Mr. Elie Habib', username: 'e.habib', password: 'e.habib' },
  { full_name: 'Ms. Yasmina Eugenia Haddad', username: 'y.haddad', password: 'y.haddad' },
  { full_name: 'Ms. Sara Ganim', username: 's.ganim', password: 's.ganim' },
  { full_name: 'Mr. Mostafa Terrab', username: 'm.terrab', password: 'm.terrab' },
  { full_name: 'Mr. Tony N. Frem', username: 't.frem', password: 't.frem' },
  { full_name: 'Sheikh Walid Katibah', username: 'w.katibah', password: 'w.katibah' },
  { full_name: 'Mr. Ghassan M. Saab', username: 'g.saab', password: 'g.saab' },
  { full_name: 'Sheikha Intisar Salem Al Ali Al Sabah', username: 'i.alsabah', password: 'i.alsabah' },
  { full_name: 'Mrs. Zeina Akar', username: 'z.akar', password: 'z.akar' },
  { full_name: 'Mr. Firas Abi Nassif', username: 'f.abinassif', password: 'f.abinassif' },
  { full_name: 'Mrs. Sirine Sidani Abu Ghazaleh', username: 's.abughazaleh', password: 's.abughazaleh' },
  { full_name: 'Mr. Joe Geagea', username: 'j.geagea', password: 'j.geagea' },
  { full_name: 'Dr. Chris Klaus', username: 'c.klaus', password: 'c.klaus' },
  { full_name: 'Dr. Charles Isbell', username: 'c.isbell', password: 'c.isbell' },
  { full_name: 'Mr. Philip Stoltzfus', username: 'p.stoltzfus', password: 'p.stoltzfus' },
  { full_name: 'Rev. Luciano Kovacs', username: 'l.kovacs', password: 'l.kovacs' },
  { full_name: 'Rev. Joseph Kassab', username: 'j.kassab', password: 'j.kassab' },
  { full_name: 'Dr. Chaouki T. Abdallah', username: 'c.abdallah', password: 'c.abdallah' },
  { full_name: 'Me. Nour Hajjar', username: 'n.hajjar', password: 'n.hajjar' },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Authorize: either service-role key (bootstrap) or an authenticated admin user.
    const authHeader = req.headers.get('Authorization') || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '');
    const isServiceRole = bearer === serviceRoleKey;

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
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
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const created: string[] = [];
    const updated: string[] = [];
    const skipped: string[] = [];
    const failed: { username: string; error: string }[] = [];

    for (const m of MEMBERS) {
      const username = m.username.toLowerCase();
      const email = `${username}@${EMAIL_DOMAIN}`;

      try {
        const { data: existingProfile } = await adminClient
          .from('profiles')
          .select('user_id, display_name')
          .eq('username', username)
          .maybeSingle();

        if (existingProfile) {
          // Backfill display_name if empty
          if (!existingProfile.display_name) {
            await adminClient
              .from('profiles')
              .update({ display_name: m.full_name })
              .eq('user_id', existingProfile.user_id);
            updated.push(username);
          } else {
            skipped.push(username);
          }
          continue;
        }

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password: m.password,
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
          display_name: m.full_name,
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
      message: 'Named board member seeding complete',
      total: MEMBERS.length,
      created_count: created.length,
      updated_count: updated.length,
      skipped_count: skipped.length,
      failed_count: failed.length,
      created,
      updated,
      skipped,
      failed,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
