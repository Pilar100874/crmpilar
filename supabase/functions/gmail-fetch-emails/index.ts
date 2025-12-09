import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    body?: { data?: string };
    parts?: { mimeType: string; body?: { data?: string } }[];
  };
  internalDate: string;
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

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { folder = "INBOX", maxResults = 20 } = await req.json().catch(() => ({}));

    // Get OAuth tokens
    const { data: tokenData, error: tokenError } = await supabaseAdmin
      .from("email_oauth_tokens")
      .select("access_token, refresh_token, expires_at, email")
      .eq("user_id", user.id)
      .eq("provider", "google")
      .single();

    if (tokenError || !tokenData) {
      throw new Error("Tokens OAuth não encontrados. Conecte sua conta Gmail primeiro.");
    }

    let accessToken = tokenData.access_token;

    // Check if token is expired and refresh if needed
    if (new Date(tokenData.expires_at) <= new Date()) {
      console.log("Token expired, refreshing...");
      
      // Get OAuth config for refresh
      const { data: usuario } = await supabaseClient
        .from("usuarios")
        .select("estabelecimento_id")
        .eq("auth_user_id", user.id)
        .single();

      const { data: oauthConfig } = await supabaseAdmin
        .from("email_oauth_config")
        .select("client_id, client_secret")
        .eq("estabelecimento_id", usuario?.estabelecimento_id)
        .eq("provider", "google")
        .single();

      if (!oauthConfig) {
        throw new Error("Configuração OAuth não encontrada");
      }

      const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: oauthConfig.client_id,
          client_secret: oauthConfig.client_secret,
          refresh_token: tokenData.refresh_token,
          grant_type: "refresh_token",
        }),
      });

      const refreshData = await refreshResponse.json();

      if (!refreshResponse.ok) {
        throw new Error(`Erro ao renovar token: ${refreshData.error_description || refreshData.error}`);
      }

      accessToken = refreshData.access_token;
      const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000).toISOString();

      // Update stored token
      await supabaseAdmin
        .from("email_oauth_tokens")
        .update({
          access_token: accessToken,
          expires_at: newExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("provider", "google");
    }

    // Map folder to Gmail label
    // Note: Gmail doesn't have an "ARCHIVE" label - archived emails are those without INBOX label
    const labelMap: Record<string, string> = {
      "inbox": "INBOX",
      "sent": "SENT",
      "trash": "TRASH",
      "drafts": "DRAFT",
      "spam": "SPAM",
      "starred": "STARRED",
    };
    
    const folderLower = folder.toLowerCase();
    const gmailLabel = labelMap[folderLower];
    
    // Build list URL
    const listUrl = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
    
    if (folderLower === "archive") {
      // Archived emails: all emails except those in INBOX, SENT, TRASH, SPAM, DRAFT
      // We search for emails that don't have INBOX label
      listUrl.searchParams.set("q", "-in:inbox -in:sent -in:trash -in:spam -in:draft");
    } else if (gmailLabel) {
      listUrl.searchParams.set("labelIds", gmailLabel);
    } else {
      // Default to INBOX
      listUrl.searchParams.set("labelIds", "INBOX");
    }
    
    listUrl.searchParams.set("maxResults", String(maxResults));

    const listResponse = await fetch(listUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResponse.ok) {
      const errorData = await listResponse.json();
      throw new Error(`Erro ao listar emails: ${errorData.error?.message || "Unknown error"}`);
    }

    const listData = await listResponse.json();
    const messageIds = listData.messages || [];

    // Fetch full message details
    const emails = [];
    for (const msg of messageIds.slice(0, maxResults)) {
      try {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (msgResponse.ok) {
          const msgData: GmailMessage = await msgResponse.json();
          
          const headers = msgData.payload.headers;
          const getHeader = (name: string) => 
            headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || "";

          // Decode body
          let body = "";
          if (msgData.payload.body?.data) {
            body = decodeBase64Url(msgData.payload.body.data);
          } else if (msgData.payload.parts) {
            const textPart = msgData.payload.parts.find(p => p.mimeType === "text/plain");
            const htmlPart = msgData.payload.parts.find(p => p.mimeType === "text/html");
            if (textPart?.body?.data) {
              body = decodeBase64Url(textPart.body.data);
            } else if (htmlPart?.body?.data) {
              body = decodeBase64Url(htmlPart.body.data);
            }
          }

          emails.push({
            id: msgData.id,
            subject: getHeader("Subject") || "(Sem assunto)",
            from_email: extractEmail(getHeader("From")),
            to_email: extractEmail(getHeader("To")),
            date: new Date(parseInt(msgData.internalDate)).toISOString(),
            read: !msgData.labelIds.includes("UNREAD"),
            starred: msgData.labelIds.includes("STARRED"),
            body: body || msgData.snippet,
            folder: folder.toLowerCase(),
          });
        }
      } catch (msgError) {
        console.error("Error fetching message:", msg.id, msgError);
      }
    }

    console.log(`Fetched ${emails.length} emails from Gmail for user ${user.id}`);

    return new Response(JSON.stringify({ 
      emails, 
      success: true,
      message: `${emails.length} emails carregados do Gmail`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, success: false, emails: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return decodeURIComponent(
      atob(base64)
        .split("")
        .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch {
    return data;
  }
}

function extractEmail(headerValue: string): string {
  const match = headerValue.match(/<([^>]+)>/);
  return match ? match[1] : headerValue;
}
