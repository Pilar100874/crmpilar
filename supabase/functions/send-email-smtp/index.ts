import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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
      .select("email, nome, smtp, porta_smtp, senha_email")
      .eq("auth_user_id", user.id)
      .single();

    if (userError || !usuario) {
      throw new Error("Configuração de email não encontrada");
    }

    if (!usuario.smtp || !usuario.senha_email) {
      throw new Error("Configure o servidor SMTP e senha do email nas configurações do usuário");
    }

    const { to, subject, body, html } = await req.json();

    if (!to || !subject) {
      throw new Error("Destinatário e assunto são obrigatórios");
    }

    console.log(`Sending email via SMTP: ${usuario.smtp}:${usuario.porta_smtp}`);

    // Create SMTP client
    const client = new SMTPClient({
      connection: {
        hostname: usuario.smtp,
        port: usuario.porta_smtp || 587,
        tls: usuario.porta_smtp === 465,
        auth: {
          username: usuario.email,
          password: usuario.senha_email,
        },
      },
    });

    // Send email
    await client.send({
      from: usuario.email,
      to: to,
      subject: subject,
      content: body || "",
      html: html || undefined,
    });

    await client.close();

    console.log("Email sent successfully");

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
      JSON.stringify({ success: true }),
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
