import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailMessage {
  subject: string;
  from_email: string;
  to_email: string;
  date: string;
  read: boolean;
  starred: boolean;
  body: string;
}

// Note: Direct IMAP connections are not supported in Edge Functions
// This version uses the Supabase database to store/sync emails
// For real IMAP sync, you would need an external service like Nylas, Mailchimp, or a custom server

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
      .select("id, email, pop, porta_pop, senha_email")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !usuario) {
      console.error("User config error:", userError);
      throw new Error("Configuração de email não encontrada. Verifique suas configurações de usuário.");
    }

    if (!usuario.pop || !usuario.senha_email) {
      throw new Error("Configure o servidor IMAP e senha do email nas configurações do usuário");
    }

    const { folder = "INBOX", limit = 50 } = await req.json().catch(() => ({}));

    console.log(`Checking emails for user ${usuario.email}, folder: ${folder}`);

    // Fetch emails already stored in the database for this user
    const { data: storedEmails, error: emailsError } = await supabaseClient
      .from("emails")
      .select("*")
      .eq("user_id", user.id)
      .eq("folder", folder.toLowerCase())
      .order("date", { ascending: false })
      .limit(limit);

    if (emailsError) {
      console.error("Error fetching stored emails:", emailsError);
      throw new Error("Erro ao buscar emails armazenados");
    }

    const emails: EmailMessage[] = (storedEmails || []).map(email => ({
      subject: email.subject,
      from_email: email.from_email,
      to_email: email.to_email,
      date: email.date,
      read: email.read || false,
      starred: email.starred || false,
      body: email.body,
    }));

    console.log(`Found ${emails.length} stored emails for user`);

    // Return stored emails with a note about IMAP limitations
    return new Response(JSON.stringify({ 
      emails, 
      success: true,
      message: emails.length > 0 
        ? `${emails.length} emails encontrados` 
        : "Nenhum email encontrado. Edge Functions não suportam conexões IMAP diretas. Use o envio de emails para testar.",
      imap_note: "Conexões IMAP diretas não são suportadas em Edge Functions do Supabase. Para sincronização real, considere usar um serviço como Nylas ou um webhook de recebimento."
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false,
        hint: "Verifique suas configurações de email. Para Gmail, use uma Senha de App."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
