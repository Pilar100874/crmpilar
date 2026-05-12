import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { automationId } = await req.json();
    if (!automationId) {
      return new Response(
        JSON.stringify({ success: false, error: "automationId obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: automation, error: autoErr } = await supabase
      .from("marketing_automations")
      .select("*")
      .eq("id", automationId)
      .single();

    if (autoErr || !automation) {
      throw new Error(`Automação não encontrada: ${autoErr?.message}`);
    }

    const config = (automation.config || {}) as any;
    const metodo = config.metodo_disparo || (config.bot_id ? "bot" : "webhook");

    console.log(`▶️ Executando automação ${automation.name} (${metodo})`);

    let result: any = {};

    if (metodo === "webhook") {
      const webhookId = config.webhook_id;
      if (!webhookId) throw new Error("Webhook não configurado");

      const { data: webhook, error: whErr } = await supabase
        .from("webhooks")
        .select("url, method")
        .eq("id", webhookId)
        .single();

      if (whErr || !webhook) throw new Error("Webhook não encontrado");

      const variables = config.variaveis || {};
      const resp = await fetch(webhook.url, {
        method: webhook.method || "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...variables, automation_id: automationId }),
      });

      result = {
        type: "webhook",
        status: resp.status,
        ok: resp.ok,
      };
      if (!resp.ok) throw new Error(`Webhook falhou: ${resp.status}`);
    } else if (metodo === "bot") {
      const botId = config.bot_id;
      if (!botId) throw new Error("Bot não configurado");

      const { data: bot, error: botErr } = await supabase
        .from("bot_flows")
        .select("id, name, flow_data, active")
        .eq("id", botId)
        .single();

      if (botErr || !bot) throw new Error("Bot não encontrado");

      // Disparar fluxo do bot via executor omnichannel
      const { data: execData, error: execErr } = await supabase.functions.invoke(
        "executar-fluxo-omnichannel",
        {
          body: {
            flowId: botId,
            estabelecimentoId: automation.estabelecimento_id,
            canal: "marketing_automation",
            triggerSource: "marketing_automation",
            automationId,
          },
        },
      );

      result = {
        type: "bot",
        botName: bot.name,
        invoked: !execErr,
        details: execData ?? execErr?.message,
      };
    } else {
      throw new Error(`Método de disparo desconhecido: ${metodo}`);
    }

    // Atualizar última execução
    await supabase
      .from("marketing_automations")
      .update({
        config: {
          ...config,
          last_executed_at: new Date().toISOString(),
          last_execution_result: result,
        },
      })
      .eq("id", automationId);

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Erro:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
