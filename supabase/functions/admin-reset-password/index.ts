import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Generate a strong random password
function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, user_id, password, username, role, unit_id } = body;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === "reset_password") {
      if (!user_id || !password) {
        return new Response(JSON.stringify({ error: "user_id and password required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await adminClient.auth.admin.updateUser(user_id, { password });
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "list_users") {
      const { data, error } = await adminClient.auth.admin.listUsers();
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roles } = await adminClient.from("user_roles").select("*");
      const { data: profiles } = await adminClient.from("profiles").select("*");

      const users = data.users.map((u) => {
        const userRole = roles?.find((r) => r.user_id === u.id);
        const profile = profiles?.find((p) => p.user_id === u.id);
        return {
          id: u.id,
          username: profile?.username || null,
          created_at: u.created_at,
          last_sign_in_at: u.last_sign_in_at,
          role: userRole?.role || null,
          unit_id: userRole?.unit_id || null,
          role_id: userRole?.id || null,
        };
      });

      return new Response(JSON.stringify({ users }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_user") {
      if (!username || !role) {
        return new Response(JSON.stringify({ error: "username and role required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (role === 'unit_user' && !unit_id) {
        return new Response(JSON.stringify({ error: "unit_id required for unit_user" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (role !== 'admin' && role !== 'unit_user' && role !== 'university_viewer') {
        return new Response(JSON.stringify({ error: "Invalid role. Must be admin, unit_user, or university_viewer" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cleanUsername = username.trim().toLowerCase();
      const authEmail = `${cleanUsername}@spdashboard.lau`;
      const userPassword = password || generatePassword();

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email: authEmail,
        password: userPassword,
        email_confirm: true,
      });

      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create profile
      const { error: profileError } = await adminClient.from("profiles").insert({
        user_id: newUser.user.id,
        username: cleanUsername,
        auth_email: authEmail,
      });

      if (profileError) {
        // Rollback: delete the auth user
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Assign role
      const { error: roleError } = await adminClient.from("user_roles").insert({
        user_id: newUser.user.id,
        role,
        unit_id: unit_id || null,
      });

      if (roleError) {
        return new Response(JSON.stringify({ error: roleError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id, generated_password: userPassword }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (user_id === user.id) {
        return new Response(JSON.stringify({ error: "Cannot delete your own account" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("profiles").delete().eq("user_id", user_id);
      await adminClient.from("user_roles").delete().eq("user_id", user_id);

      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Seed all default accounts
    if (action === "seed_accounts") {
      const units = body.units as { username: string; unit_id: string }[];
      const results: { username: string; password: string; role: string; unit_id: string | null }[] = [];

      // Create admin account
      const adminPassword = generatePassword();
      const adminEmail = "admin@spdashboard.lau";

      try {
        const { data: existingAdmin } = await adminClient.from("profiles").select("id").eq("username", "admin").maybeSingle();
        if (!existingAdmin) {
          const { data: adminUser, error: adminCreateErr } = await adminClient.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
          });
          if (adminCreateErr) throw adminCreateErr;

          await adminClient.from("profiles").insert({
            user_id: adminUser.user.id,
            username: "admin",
            auth_email: adminEmail,
          });
          await adminClient.from("user_roles").insert({
            user_id: adminUser.user.id,
            role: "admin",
            unit_id: null,
          });
          results.push({ username: "admin", password: adminPassword, role: "admin", unit_id: null });
        }
      } catch (e) {
        console.error("Admin seed error:", e);
      }

      // Create unit accounts
      for (const unit of units) {
        try {
          const { data: existing } = await adminClient.from("profiles").select("id").eq("username", unit.username).maybeSingle();
          if (existing) continue;

          const unitPassword = generatePassword();
          const unitEmail = `${unit.username}@spdashboard.lau`;

          const { data: unitUser, error: unitCreateErr } = await adminClient.auth.admin.createUser({
            email: unitEmail,
            password: unitPassword,
            email_confirm: true,
          });
          if (unitCreateErr) throw unitCreateErr;

          await adminClient.from("profiles").insert({
            user_id: unitUser.user.id,
            username: unit.username,
            auth_email: unitEmail,
          });
          await adminClient.from("user_roles").insert({
            user_id: unitUser.user.id,
            role: "unit_user",
            unit_id: unit.unit_id,
          });
          results.push({ username: unit.username, password: unitPassword, role: "unit_user", unit_id: unit.unit_id });
        } catch (e) {
          console.error(`Seed error for ${unit.username}:`, e);
        }
      }

      return new Response(JSON.stringify({ success: true, seeded: results }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
