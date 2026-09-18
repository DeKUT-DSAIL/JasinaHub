import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ResetPasswordRequest {
  email: string;
  newPassword: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, newPassword }: ResetPasswordRequest = await req.json();

    if (!email || !newPassword) {
      return new Response(
        JSON.stringify({ error: "Email and new password are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const normalizedEmail = email.trim().toLowerCase();
    let userId: string | null = null;

    // 1. Try finding by email in public.profiles table (case-insensitive)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (profile?.id) {
      userId = profile.id;
    } else if (profileError) {
      console.warn("Notice checking profiles table:", profileError.message);
    }

    // 2. If not found via direct ilike, check trimmed profiles in case of whitespace
    if (!userId) {
      const { data: allProfiles } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .limit(2000);

      if (allProfiles) {
        const matched = allProfiles.find(
          (p) => p.email && p.email.trim().toLowerCase() === normalizedEmail
        );
        if (matched?.id) {
          userId = matched.id;
        }
      }
    }

    // 3. If still not found, search in auth.users via admin.listUsers
    if (!userId) {
      let page = 1;
      const perPage = 1000;

      while (!userId) {
        const { data: authData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage,
        });

        if (listError) {
          console.error("Error listing auth users:", listError);
          break;
        }

        const matchedUser = authData?.users?.find(
          (u) => u.email?.trim().toLowerCase() === normalizedEmail
        );

        if (matchedUser?.id) {
          userId = matchedUser.id;
          break;
        }

        if (!authData || authData.users.length < perPage) break;
        page++;
      }
    }

    // If user is still not found in profiles or auth.users
    if (!userId) {
      return new Response(
        JSON.stringify({ error: `No account found matching "${email}"` }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update password in Supabase Auth
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Error updating password:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message || "Failed to update password" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Password updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in reset-password function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});