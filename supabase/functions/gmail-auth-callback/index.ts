import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("OAuth error:", error);
      return new Response(generateHTML(false, `Erro na autorização: ${error}`), {
        headers: { "Content-Type": "text/html" },
      });
    }

    if (!code || !state) {
      return new Response(generateHTML(false, "Parâmetros inválidos"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Decode state
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch {
      return new Response(generateHTML(false, "Estado inválido"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { user_id, estabelecimento_id } = stateData;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get OAuth config
    const { data: oauthConfig } = await supabaseAdmin
      .from("email_oauth_config")
      .select("client_id, client_secret")
      .eq("estabelecimento_id", estabelecimento_id)
      .eq("provider", "google")
      .single();

    if (!oauthConfig?.client_id || !oauthConfig?.client_secret) {
      return new Response(generateHTML(false, "Configuração OAuth não encontrada"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const redirectUri = `${Deno.env.get("SUPABASE_URL")}/functions/v1/gmail-auth-callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: oauthConfig.client_id,
        client_secret: oauthConfig.client_secret,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange error:", tokenData);
      return new Response(generateHTML(false, `Erro ao obter tokens: ${tokenData.error_description || tokenData.error}`), {
        headers: { "Content-Type": "text/html" },
      });
    }

    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user email from Google
    const userInfoResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    // Update OAuth config with tokens
    const { error: updateError } = await supabaseAdmin
      .from("email_oauth_config")
      .update({
        enabled: true,
        updated_at: new Date().toISOString(),
      })
      .eq("estabelecimento_id", estabelecimento_id)
      .eq("provider", "google");

    if (updateError) {
      console.error("Error updating config:", updateError);
    }

    // Store tokens in a separate table (we need to create this)
    const { error: tokenError } = await supabaseAdmin
      .from("email_oauth_tokens")
      .upsert({
        user_id: user_id,
        provider: "google",
        access_token: access_token,
        refresh_token: refresh_token,
        expires_at: expiresAt,
        email: userInfo.email,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider"
      });

    if (tokenError) {
      console.error("Error storing tokens:", tokenError);
      return new Response(generateHTML(false, "Erro ao salvar tokens"), {
        headers: { "Content-Type": "text/html" },
      });
    }

    console.log("Gmail OAuth completed for user:", user_id, "email:", userInfo.email);

    return new Response(generateHTML(true, `Conectado com sucesso: ${userInfo.email}`), {
      headers: { "Content-Type": "text/html" },
    });
  } catch (error: any) {
    console.error("Callback error:", error);
    return new Response(generateHTML(false, error.message), {
      headers: { "Content-Type": "text/html" },
    });
  }
});

function generateHTML(success: boolean, message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <title>${success ? "Sucesso" : "Erro"} - Gmail OAuth</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          margin: 0;
          background: ${success ? "#10b981" : "#ef4444"};
          color: white;
        }
        .container {
          text-align: center;
          padding: 40px;
          background: rgba(0,0,0,0.2);
          border-radius: 16px;
        }
        h1 { margin: 0 0 16px 0; }
        p { margin: 0; opacity: 0.9; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${success ? "✓ Conectado!" : "✗ Erro"}</h1>
        <p>${message}</p>
        <p style="margin-top: 16px; font-size: 14px;">Esta janela será fechada automaticamente...</p>
      </div>
      <script>
        setTimeout(() => {
          if (window.opener) {
            window.opener.postMessage({ type: 'gmail-oauth-${success ? "success" : "error"}', message: '${message}' }, '*');
          }
          window.close();
        }, 2000);
      </script>
    </body>
    </html>
  `;
}
