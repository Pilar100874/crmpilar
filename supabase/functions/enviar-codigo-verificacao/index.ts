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

    // Buscar configuração do WhatsApp
    const { data: whatsappConfig, error: configError } = await supabase
      .from("whatsapp_config")
      .select("*")
      .eq("active", true)
      .maybeSingle();

    if (configError || !whatsappConfig) {
      console.error("Erro ao buscar config WhatsApp:", configError);
      return new Response(
        JSON.stringify({ error: "Configuração do WhatsApp não encontrada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Formatar telefone (remover caracteres não numéricos)
    const phoneNumber = telefone.replace(/\D/g, "");
    
    // Montar mensagem
    const mensagem = `🔐 *Código de Verificação*\n\nSeu código para alteração de senha é: *${codigo}*\n\nEste código é válido por 10 minutos.\n\n⚠️ Não compartilhe este código com ninguém.`;

    // Enviar mensagem via WAHA
    const wahaUrl = whatsappConfig.waha_url || "http://localhost:3000";
    const wahaSession = whatsappConfig.waha_session || "default";
    const wahaApiKey = whatsappConfig.waha_api_key;

    const jidSuffix = whatsappConfig.jid_suffix || "@c.us";
    const chatId = `${phoneNumber}${jidSuffix}`;

    const wahaPayload = {
      session: wahaSession,
      chatId: chatId,
      text: mensagem,
    };

    console.log("Enviando para WAHA:", {
      url: `${wahaUrl}/api/sendText`,
      session: wahaSession,
      chatId: chatId,
    });

    const wahaHeaders: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (wahaApiKey) {
      wahaHeaders["X-Api-Key"] = wahaApiKey;
    }

    const wahaResponse = await fetch(`${wahaUrl}/api/sendText`, {
      method: "POST",
      headers: wahaHeaders,
      body: JSON.stringify(wahaPayload),
    });

    if (!wahaResponse.ok) {
      const errorText = await wahaResponse.text();
      console.error("Erro WAHA:", errorText);
      return new Response(
        JSON.stringify({ 
          error: "Erro ao enviar mensagem via WhatsApp",
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const wahaResult = await wahaResponse.json();
    console.log("Resposta WAHA:", wahaResult);

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
