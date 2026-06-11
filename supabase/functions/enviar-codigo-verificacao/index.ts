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

    // Tenta usar o número padrão de whatsapp_numeros; fallback para whatsapp_config
    let numero: any = null;
    const { data: defaultNumero } = await supabase
      .from("whatsapp_numeros")
      .select("*")
      .eq("ativo", true)
      .eq("is_default", true)
      .limit(1)
      .maybeSingle();
    numero = defaultNumero;

    if (!numero) {
      const { data: whatsappConfig } = await supabase
        .from("whatsapp_config")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (whatsappConfig?.waha_url) {
        numero = {
          provider: "evolution",
          waha_url: whatsappConfig.waha_url,
          waha_api_key: whatsappConfig.waha_api_key,
          session_name: whatsappConfig.session_name || "default",
        };
      }
    }

    if (!numero) {
      return new Response(
        JSON.stringify({ error: "Nenhum número WhatsApp configurado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phoneNumber = telefone.replace(/\D/g, "");
    const mensagem = `🔐 *Código de Verificação*\n\nSeu código para alteração de senha é: *${codigo}*\n\nEste código é válido por 10 minutos.\n\n⚠️ Não compartilhe este código com ninguém.`;

    let ok = false; let messageId: string | undefined;

    if (numero.provider === "cloud_api") {
      const r = await fetch(`https://graph.facebook.com/v18.0/${numero.cloud_phone_number_id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${numero.cloud_access_token}` },
        body: JSON.stringify({ messaging_product: "whatsapp", to: phoneNumber, type: "text", text: { body: mensagem } }),
      });
      const j = await r.json().catch(() => ({}));
      ok = r.ok;
      messageId = j?.messages?.[0]?.id;
      if (!ok) console.error("[CLOUD] Erro:", j);
    } else {
      const evoUrl = (numero.waha_url || "").replace(/\/+$/, "");
      const instance = numero.session_name || "default";
      const apiKey = numero.waha_api_key;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (apiKey) headers["apikey"] = apiKey;
      const r = await fetch(`${evoUrl}/message/sendText/${encodeURIComponent(instance)}`, {
        method: "POST", headers,
        body: JSON.stringify({ number: phoneNumber, text: mensagem }),
      });
      ok = r.ok;
      const j = await r.json().catch(() => ({}));
      messageId = j?.id;
      if (!ok) console.error("[EVO] Erro:", j);
    }

    if (!ok) {
      return new Response(
        JSON.stringify({ error: "Erro ao enviar mensagem via WhatsApp" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Código enviado com sucesso", messageId }),
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
