import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Get user's estabelecimento_id
    const { data: usuario } = await supabaseClient
      .from("usuarios")
      .select("estabelecimento_id")
      .eq("auth_user_id", user.id)
      .single();

    if (!usuario?.estabelecimento_id) {
      throw new Error("Usuário não vinculado a um estabelecimento");
    }

    // Get OAuth config
    const { data: oauthConfig, error: configError } = await supabaseClient
      .from("email_oauth_config")
      .select("client_id, client_secret")
      .eq("estabelecimento_id", usuario.estabelecimento_id)
      .eq("provider", "google")
      .single();

    if (configError || !oauthConfig?.client_id) {
      throw new Error("Configuração OAuth do Google não encontrada. Configure o Client ID e Secret primeiro.");
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gmail-auth-callback`;
    
    // Create state with user info for callback
    const state = btoa(JSON.stringify({
      user_id: user.id,
      estabelecimento_id: usuario.estabelecimento_id
    }));

    const scopes = [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/userinfo.email"
    ];

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", oauthConfig.client_id);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);

    console.log("Generated Gmail OAuth URL for user:", user.id);

    return new Response(JSON.stringify({ 
      auth_url: authUrl.toString(),
      success: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
