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

    // Fazer a chamada para o servidor de email externo
    const response = await fetch(`${serverUrl}/send-emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        accounts,
        to,
        subject,
        text,
      }),
    });

    const responseText = await response.text();
    console.log("Resposta do servidor:", response.status, responseText);

    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { message: responseText };
    }

    if (response.ok) {
      return new Response(
        JSON.stringify({ success: true, data: result }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: result.error || result.message || "Erro ao conectar com servidor de email" 
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
