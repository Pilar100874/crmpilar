import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  serverUrl: string;
  accounts: Array<{
    user: string;
    pass: string;
    smtp: string;
    smtp_port: number;
    imap: string;
    imap_port: number;
  }>;
  to: string;
  subject: string;
  text: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { serverUrl, accounts, to, subject, text }: TestEmailRequest = await req.json();

    console.log("Testando conexão de email via servidor:", serverUrl);
    console.log("Email:", accounts[0]?.user);

    const account = accounts[0];
    if (!account) {
      return new Response(
        JSON.stringify({ success: false, error: "Conta de email não fornecida" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build payload in the correct format for the external API
    const payload = {
      accounts: [
        {
          user: account.user,
          pass: account.pass,
          smtp: account.smtp,
          smtp_port: account.smtp_port,
          imap: account.imap || "",
          imap_port: account.imap_port || 993
        }
      ],
      to: to,
      subject: subject,
      text: text
    };

    console.log("Payload para API:", JSON.stringify({ 
      ...payload, 
      accounts: payload.accounts.map(a => ({ ...a, pass: "***" })) 
    }));

    // Add timeout of 30 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    // Call /send-emails (plural)
    const apiUrl = `${serverUrl}/send-emails`;
    console.log("Chamando API:", apiUrl);

    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      const isAborted = fetchError instanceof Error && fetchError.name === 'AbortError';
      const errorMsg = isAborted 
        ? "Servidor de email não respondeu (timeout). Verifique se a URL do servidor está correta e acessível."
        : `Erro ao conectar com servidor: ${fetchError instanceof Error ? fetchError.message : 'Erro desconhecido'}`;
      
      console.error("Erro no fetch:", fetchError);
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    clearTimeout(timeoutId);

    const responseText = await response.text();
    console.log("Resposta do servidor:", response.status, responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }

    if (response.ok && result.ok) {
      return new Response(
        JSON.stringify({ success: true, data: result, messageId: result.messageId }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // External server responded with error
      const serverError = result.error || result.message || "Erro desconhecido";
      const userMessage = serverError.toLowerCase().includes('timeout')
        ? `O servidor de email não conseguiu conectar ao servidor SMTP/IMAP. Verifique as credenciais e se o servidor de email está acessível. Detalhes: ${serverError}`
        : `Erro do servidor de email: ${serverError}`;
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: userMessage
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Erro interno ao testar conexão";
    console.error("Erro na edge function test-email-connection:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
