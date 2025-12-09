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

    // Adicionar timeout de 30 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let response: Response;
    try {
      response = await fetch(`${serverUrl}/send-emails`, {
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
