import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function escXml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function applyUrlPlaceholders(url: string, vars: Record<string, string>) {
  let out = url;
  const used = new Set<string>();
  for (const [k, v] of Object.entries(vars)) {
    if (!k) continue;
    const val = encodeURIComponent(String(v ?? ""));
    const patterns = [
      new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}`, "g"),
      new RegExp(`\\{\\s*${k}\\s*\\}`, "g"),
      new RegExp(`(?<![A-Za-z0-9_]):${k}(?![A-Za-z0-9_])`, "g"),
    ];
    for (const re of patterns) {
      if (re.test(out)) {
        out = out.replace(re, val);
        used.add(k);
      }
    }
  }
  return { url: out, used };
}

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
    const formato = (config.formato_saida || "json") as
      | "json" | "form" | "multipart" | "xml" | "text" | "query";

    // Variáveis: webhook (variaveis) + custom (variaveis_custom)
    const allVars: Record<string, string> = {
      ...(config.variaveis || {}),
      ...(config.variaveis_custom || {}),
    };

    console.log(`▶️ Executando automação ${automation.name} (${metodo}) formato=${formato}`);

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

      const method = (webhook.method || "POST").toUpperCase();
      const isBodyMethod = !(method === "GET" || method === "DELETE");

      // 1) Aplica placeholders na URL
      const { url: urlWithPlaceholders, used } = applyUrlPlaceholders(webhook.url, allVars);
      let finalUrl = urlWithPlaceholders;
      const remaining: [string, string][] = Object.entries(allVars).filter(
        ([k]) => k && !used.has(k),
      ) as [string, string][];

      const headers: Record<string, string> = {
        "Accept": "application/json",
        "User-Agent": "MarketingAutomation/1.0",
      };
      let body: BodyInit | undefined = undefined;

      if (formato === "query" || !isBodyMethod) {
        const qs = remaining
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? "")}`)
          .join("&");
        if (qs) finalUrl += (finalUrl.includes("?") ? "&" : "?") + qs;
      } else if (remaining.length > 0) {
        if (formato === "json") {
          headers["Content-Type"] = "application/json";
          body = JSON.stringify(Object.fromEntries(remaining));
        } else if (formato === "form") {
          headers["Content-Type"] = "application/x-www-form-urlencoded";
          body = remaining
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? "")}`)
            .join("&");
        } else if (formato === "multipart") {
          const fd = new FormData();
          remaining.forEach(([k, v]) => fd.append(k, String(v ?? "")));
          body = fd; // browser/Deno define Content-Type com boundary
        } else if (formato === "xml") {
          headers["Content-Type"] = "application/xml";
          body =
            `<?xml version="1.0" encoding="UTF-8"?>\n<request>\n` +
            remaining.map(([k, v]) => `  <${k}>${escXml(v)}</${k}>`).join("\n") +
            `\n</request>`;
        } else if (formato === "text") {
          headers["Content-Type"] = "text/plain";
          body = remaining.map(([k, v]) => `${k}: ${v ?? ""}`).join("\n");
        }
      }

      const resp = await fetch(finalUrl, {
        method,
        headers,
        body: isBodyMethod ? body : undefined,
      });

      result = {
        type: "webhook",
        url: finalUrl,
        method,
        formato,
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

      // Disponibiliza as variáveis personalizadas no contexto do bot
      const { data: execData, error: execErr } = await supabase.functions.invoke(
        "executar-fluxo-omnichannel",
        {
          body: {
            flowId: botId,
            estabelecimentoId: automation.estabelecimento_id,
            canal: "marketing_automation",
            triggerSource: "marketing_automation",
            automationId,
            variaveis: allVars,
            contexto: { variaveis: allVars, automationId, automationName: automation.name },
          },
        },
      );

      result = {
        type: "bot",
        botName: bot.name,
        invoked: !execErr,
        variaveis: allVars,
        details: execData ?? execErr?.message,
      };
    } else if (metodo === "push") {
      const pushCfg = config.push_config || {};
      const { data: pushData, error: pushErr } = await supabase.functions.invoke(
        "push-send",
        {
          body: {
            ...pushCfg,
            workflow_id: automationId,
            workflow_tipo: "marketing",
            origem: "marketing_automation",
          },
        },
      );
      result = {
        type: "push",
        invoked: !pushErr,
        details: pushData ?? pushErr?.message,
      };
    } else {
      throw new Error(`Método de disparo desconhecido: ${metodo}`);
    }

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
