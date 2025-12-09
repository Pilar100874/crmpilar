import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailMessage {
  id?: string;
  subject: string;
  from_email: string;
  to_email: string;
  date: string;
  read: boolean;
  starred: boolean;
  body: string;
}

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
      .select("id, email, smtp, porta_smtp, imap, porta_imap, senha_email, estabelecimento_id")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !usuario) {
      console.error("User config error:", userError);
      throw new Error("Configuração de email não encontrada. Verifique suas configurações de usuário.");
    }

    if (!usuario.imap || !usuario.senha_email) {
      throw new Error("Configure o servidor IMAP e senha do email nas configurações do usuário");
    }

    const { folder = "INBOX", maxResults = 50 } = await req.json().catch(() => ({}));

    console.log(`Fetching emails for user ${usuario.email}, folder: ${folder}`);

    // Check if external server is configured
    const { data: externalConfig } = await supabaseClient
      .from("email_oauth_config")
      .select("client_id, enabled")
      .eq("estabelecimento_id", usuario.estabelecimento_id)
      .eq("provider", "external_server")
      .single();

    let emails: EmailMessage[] = [];

    // Try external server first if configured
    if (externalConfig?.enabled && externalConfig?.client_id) {
      const externalServerUrl = externalConfig.client_id;
      console.log(`Using external server: ${externalServerUrl}`);

      try {
        const response = await fetch(`${externalServerUrl}/fetch-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: usuario.email,
            password: usuario.senha_email,
            imap_host: usuario.imap,
            imap_port: usuario.porta_imap,
            folder: folder,
            limit: maxResults
          })
        });

        if (response.ok) {
          const data = await response.json();
          emails = (data.emails || []).map((email: any, index: number) => ({
            id: email.id || email.messageId || `email-${Date.now()}-${index}`,
            subject: email.subject || "(sem assunto)",
            from_email: email.from || email.from_email || "",
            to_email: email.to || email.to_email || usuario.email,
            date: email.date || new Date().toISOString(),
            read: email.read ?? email.seen ?? false,
            starred: email.starred ?? email.flagged ?? false,
            body: email.body || email.text || email.html || "",
          }));
          console.log(`Fetched ${emails.length} emails from external server`);
        } else {
          console.error("External server error:", await response.text());
        }
      } catch (externalError) {
        console.error("External server connection error:", externalError);
      }
    }

    // Fallback: try direct IMAP via external mail server
    if (emails.length === 0) {
      // Try the hardcoded external server as last resort
      const fallbackUrl = "https://mailcrm.pilar.com.br";
      console.log(`Trying fallback external server: ${fallbackUrl}`);

      try {
        const response = await fetch(`${fallbackUrl}/fetch-emails`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: usuario.email,
            password: usuario.senha_email,
            imap_host: usuario.imap,
            imap_port: usuario.porta_imap,
            folder: folder,
            limit: maxResults
          })
        });

        if (response.ok) {
          const data = await response.json();
          emails = (data.emails || []).map((email: any, index: number) => ({
            id: email.id || email.messageId || `email-${Date.now()}-${index}`,
            subject: email.subject || "(sem assunto)",
            from_email: email.from || email.from_email || "",
            to_email: email.to || email.to_email || usuario.email,
            date: email.date || new Date().toISOString(),
            read: email.read ?? email.seen ?? false,
            starred: email.starred ?? email.flagged ?? false,
            body: email.body || email.text || email.html || "",
          }));
          console.log(`Fetched ${emails.length} emails from fallback server`);
        } else {
          const errorText = await response.text();
          console.error("Fallback server error:", errorText);
        }
      } catch (fallbackError) {
        console.error("Fallback server connection error:", fallbackError);
      }
    }

    // Final fallback: return stored emails from database
    if (emails.length === 0) {
      console.log("Fetching stored emails from database as final fallback");
      const { data: storedEmails, error: emailsError } = await supabaseClient
        .from("emails")
        .select("*")
        .eq("user_id", user.id)
        .eq("folder", folder.toLowerCase())
        .order("date", { ascending: false })
        .limit(maxResults);

      if (!emailsError && storedEmails) {
        emails = storedEmails.map(email => ({
          id: email.id,
          subject: email.subject,
          from_email: email.from_email,
          to_email: email.to_email,
          date: email.date,
          read: email.read || false,
          starred: email.starred || false,
          body: email.body,
        }));
      }
    }

    console.log(`Returning ${emails.length} emails`);

    return new Response(JSON.stringify({ 
      emails, 
      success: true,
      count: emails.length,
      message: emails.length > 0 
        ? `${emails.length} emails encontrados` 
        : "Nenhum email encontrado"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        emails: [],
        hint: "Verifique suas configurações de email. Para Gmail, use uma Senha de App."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
