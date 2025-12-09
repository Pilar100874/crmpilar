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

    // Get user email config
    const { data: usuario, error: userError } = await supabaseClient
      .from("usuarios")
      .select("email, nome, smtp, porta_smtp, imap, porta_imap, senha_email, estabelecimento_id")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !usuario) {
      throw new Error("Configuração de email não encontrada");
    }

    if (!usuario.smtp || !usuario.senha_email) {
      throw new Error("Configure o servidor SMTP e senha do email nas configurações do usuário");
    }

    // Get external server URL from email_oauth_config
    const { data: serverConfig } = await supabaseClient
      .from("email_oauth_config")
      .select("client_id")
      .eq("estabelecimento_id", usuario.estabelecimento_id)
      .eq("provider", "external_server")
      .eq("enabled", true)
      .maybeSingle();

    // Use external server URL or default
    const serverUrl = serverConfig?.client_id || "https://pilar-mail-production.up.railway.app";

    const { to, subject, body, html } = await req.json();

    if (!to || !subject) {
      throw new Error("Destinatário e assunto são obrigatórios");
    }

    console.log(`Sending email via external API: ${serverUrl}/send-emails`);
    console.log(`SMTP: ${usuario.smtp}:${usuario.porta_smtp}`);
    console.log(`IMAP: ${usuario.imap}:${usuario.porta_imap}`);

    // Build request payload according to the correct API format
    const payload = {
      accounts: [
        {
          user: usuario.email,
          pass: usuario.senha_email,
          smtp: usuario.smtp,
          smtp_port: usuario.porta_smtp || 587,
          imap: usuario.imap || "",
          imap_port: usuario.porta_imap || 993
        }
      ],
      to: to,
      subject: subject,
      text: body || ""
    };

    console.log("Payload (sem senha):", { 
      ...payload, 
      accounts: payload.accounts.map(a => ({ ...a, pass: "***" })) 
    });

    // Call external API - endpoint is /send-emails (plural)
    const response = await fetch(`${serverUrl}/send-emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log("Railway API response:", result);

    if (!response.ok || !result.ok) {
      throw new Error(result.error || result.message || "Erro ao enviar email via servidor externo");
    }

    console.log("Email sent successfully, messageId:", result.messageId);

    // Save sent email to database
    const { error: saveError } = await supabaseClient
      .from("emails")
      .insert({
        user_id: user.id,
        from_email: usuario.email,
        to_email: to,
        subject: subject,
        body: body || html || "",
        folder: "sent",
        read: true,
        starred: false,
        date: new Date().toISOString(),
      });

    if (saveError) {
      console.error("Error saving sent email:", saveError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: result.messageId 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
