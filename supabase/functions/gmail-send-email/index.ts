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

    const { to, subject, body, html } = await req.json();

    if (!to || !subject) {
      throw new Error("Campos 'to' e 'subject' são obrigatórios");
    }

    // Get OAuth tokens
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from("email_oauth_tokens")
      .select("*")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (tokenError || !tokenData) {
      throw new Error("Gmail não conectado. Faça a autenticação OAuth primeiro.");
    }

    // Check if token is expired and refresh if needed
    let accessToken = tokenData.access_token;
    const expiresAt = new Date(tokenData.expires_at);
    
    if (expiresAt <= new Date()) {
      console.log("Token expired, refreshing...");
      accessToken = await refreshAccessToken(user.id, tokenData.refresh_token, supabaseClient);
    }

    // Gerar tracking_id único para este email
    const trackingId = crypto.randomUUID();
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const trackingPixelUrl = `${supabaseUrl}/functions/v1/email-tracking-pixel?id=${trackingId}`;
    const trackingPixelHtml = `<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`;

    // Build email in RFC 2822 format with tracking pixel
    const fromEmail = tokenData.email || user.email;
    const htmlWithTracking = html 
      ? `${html}${trackingPixelHtml}`
      : `<div>${(body || '').replace(/\n/g, '<br>')}</div>${trackingPixelHtml}`;
    
    const emailContent = buildHtmlEmail(fromEmail, to, subject, htmlWithTracking, body);

    // Encode to base64url
    const encodedMessage = btoa(emailContent)
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Send via Gmail API
    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gmail send error:", errorText);
      throw new Error("Erro ao enviar email via Gmail");
    }

    const result = await response.json();
    console.log("Email sent successfully:", result.id);
    console.log("Tracking ID:", trackingId);

    // Save to emails table with tracking_id
    await supabaseClient
      .from("emails")
      .insert({
        user_id: user.id,
        from_email: fromEmail,
        to_email: to,
        subject,
        body: body || html,
        folder: "sent",
        read: true,
        starred: false,
        tracking_id: trackingId,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Email enviado com sucesso via Gmail!",
        messageId: result.id 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in gmail-send-email:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function refreshAccessToken(userId: string, refreshToken: string, supabase: any): Promise<string> {
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("estabelecimento_id")
    .eq("auth_user_id", userId)
    .single();

  if (!usuario?.estabelecimento_id) {
    throw new Error("Usuário não encontrado");
  }

  const { data: oauthConfig } = await supabase
    .from("email_oauth_config")
    .select("client_id, client_secret")
    .eq("estabelecimento_id", usuario.estabelecimento_id)
    .eq("provider", "google")
    .single();

  if (!oauthConfig) {
    throw new Error("Configuração OAuth não encontrada");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: oauthConfig.client_id,
      client_secret: oauthConfig.client_secret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(`Erro ao renovar token: ${data.error}`);
  }

  const expiresAt = new Date(Date.now() + (data.expires_in * 1000)).toISOString();
  
  await supabase
    .from("email_oauth_tokens")
    .update({
      access_token: data.access_token,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", "google");

  return data.access_token;
}

function buildTextEmail(from: string, to: string, subject: string, body: string): string {
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(body || ""))),
  ].join("\r\n");
}

function buildHtmlEmail(from: string, to: string, subject: string, html: string, plainText?: string): string {
  const boundary = `----=_Part_${Date.now()}`;
  
  return [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(plainText || stripHtml(html)))),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(html))),
    ``,
    `--${boundary}--`,
  ].join("\r\n");
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}
