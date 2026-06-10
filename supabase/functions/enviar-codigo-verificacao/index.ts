import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { telefone, codigo } = await req.json();

    if (!telefone || !codigo) {
      return new Response(
        JSON.stringify({ error: "Telefone e código são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar configuração do WhatsApp para o estabelecimento
    // Como não temos estabelecimento_id neste contexto, pegamos a primeira config disponível
    const { data: whatsappConfig, error: configError } = await supabase
      .from("whatsapp_config")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (configError) {
      console.error("Erro ao buscar configuração:", configError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar configuração do WhatsApp", details: configError.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    if (!whatsappConfig) {
      return new Response(
        JSON.stringify({ error: "Configuração do WhatsApp não encontrada. Configure em Configurações > Recuperar Senha" }),
        { 
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Formatar telefone (remover caracteres não numéricos)
    const phoneNumber = telefone.replace(/\D/g, "");
    
    // Montar mensagem
    const mensagem = `🔐 *Código de Verificação*\n\nSeu código para alteração de senha é: *${codigo}*\n\nEste código é válido por 10 minutos.\n\n⚠️ Não compartilhe este código com ninguém.`;

    // Enviar mensagem via Evolution API
    const evoUrl = (whatsappConfig.waha_url || "http://localhost:8080").replace(/\/+$/, "");
    const instance = whatsappConfig.session_name || "default";
    const apiKey = whatsappConfig.waha_api_key;

    const evoPayload = { number: phoneNumber, text: mensagem };

    console.log("Enviando para Evolution:", {
      url: `${evoUrl}/message/sendText/${instance}`,
      instance,
      number: phoneNumber,
    });

    const evoHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) evoHeaders["apikey"] = apiKey;

    const wahaResponse = await fetch(`${evoUrl}/message/sendText/${encodeURIComponent(instance)}`, {
      method: "POST",
      headers: evoHeaders,
      body: JSON.stringify(evoPayload),
    });

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text();
      console.error("Erro Evolution:", errorText);
      return new Response(
        JSON.stringify({
          error: "Erro ao enviar mensagem via WhatsApp",
          details: errorText,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wahaResult = await wahaResponse.json().catch(() => ({}));
    console.log("Resposta Evolution:", wahaResult);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Código enviado com sucesso",
        messageId: wahaResult.id 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Erro ao enviar código:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
