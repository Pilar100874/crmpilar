// Dispatcher unificado v2 — Push/Email/SMS/WhatsApp para o Ponto
// Recursos:
// - Templates separados por perfil (funcionário / líder)
// - Variáveis: {funcionario} {data} {quantidade} {detalhe} {data_expiracao} {saldo_bh} {gestor} {link_aprovacao}
// - Quiet hours + bypass por tipo (ex.: fraude)
// - Não envia em finais de semana quando desativado (com bypass)
// - Dedupe (mesma tipo+funcionario+dia dentro da janela)
// - Rate limit por estabelecimento/hora
// - Preferências por funcionário (canais aceitos)
// - Registra tudo em ponto_notificacoes_envios (com dedupe_hash)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PUBLIC_URL = (Deno.env.get("SUPABASE_URL") || "").replace(".supabase.co", ".lovable.app");
const APP_URL = "https://crmpilar.lovable.app";

const LINKS_APROVACAO: Record<string, string> = {
  he_pendente: "/ponto/aprovacoes",
  atestado_pendente: "/ponto/atestados",
  falta: "/ponto/aprovacoes",
  atraso: "/ponto/aprovacoes",
  bh_expirar: "/ponto/banco-horas",
  fraude: "/ponto/anomalias",
};

function render(tpl: string, dados: Record<string, any>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (dados?.[k] ?? "").toString());
}

function inQuietHours(now: Date, ini?: string, fim?: string) {
  if (!ini || !fim) return false;
  const [ih, im] = ini.split(":").map(Number);
  const [fh, fm] = fim.split(":").map(Number);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const iniMin = ih * 60 + im;
  const fimMin = fh * 60 + fm;
  return iniMin <= fimMin
    ? nowMin >= iniMin && nowMin < fimMin
    : nowMin >= iniMin || nowMin < fimMin;
}

async function logEnvio(sb: any, row: any) {
  await sb.from("ponto_notificacoes_envios").insert(row);
}

async function enviarSms(sb: any, estabelecimento_id: string, telefone: string, mensagem: string) {
  const { data, error } = await sb.functions.invoke("send-sms", {
    body: { estabelecimento_id, destino: telefone, mensagem },
  });
  if (error) throw new Error(error.message);
  return data;
}

async function enviarWhatsapp(sb: any, telefone: string, mensagem: string) {
  let numero: any = null;
  const { data: def } = await sb.from("whatsapp_numeros")
    .select("*").eq("ativo", true).eq("is_default", true).limit(1).maybeSingle();
  numero = def;
  if (!numero) {
    const { data: cfg } = await sb.from("whatsapp_config").select("*").limit(1).maybeSingle();
    if (cfg?.waha_url) numero = { provider: "evolution", waha_url: cfg.waha_url, waha_api_key: cfg.waha_api_key, session_name: cfg.session_name || "default" };
  }
  if (!numero) throw new Error("Nenhum número WhatsApp configurado");
  const phone = telefone.replace(/\D/g, "");
  if (numero.provider === "cloud_api") {
    const r = await fetch(`https://graph.facebook.com/v18.0/${numero.cloud_phone_number_id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${numero.cloud_access_token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: mensagem } }),
    });
    if (!r.ok) throw new Error(`WhatsApp Cloud HTTP ${r.status}`);
    return await r.json();
  } else {
    const evoUrl = (numero.waha_url || "").replace(/\/+$/, "");
    const instance = numero.session_name || "default";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (numero.waha_api_key) headers["apikey"] = numero.waha_api_key;
    const r = await fetch(`${evoUrl}/message/sendText/${encodeURIComponent(instance)}`, {
      method: "POST", headers,
      body: JSON.stringify({ number: phone, text: mensagem }),
    });
    if (!r.ok) throw new Error(`WhatsApp HTTP ${r.status}`);
    return await r.json();
  }
}

async function enviarPush(sb: any, funcionario_id: string, titulo: string, mensagem: string, url: string) {
  return await sb.functions.invoke("ponto-push-send", {
    body: { funcionario_id, titulo, corpo: mensagem, url },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const {
      estabelecimento_id, tipo, funcionario_id,
      dados = {}, canais: canaisOverride,
      titulo: tituloIn, mensagem: mensagemIn,
      forcar = false,
    } = body ?? {};

    if (!estabelecimento_id || !tipo) {
      return new Response(JSON.stringify({ error: "estabelecimento_id e tipo obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfg } = await sb.from("ponto_notificacoes_config")
      .select("*").eq("estabelecimento_id", estabelecimento_id).maybeSingle();
    if (!cfg) {
      return new Response(JSON.stringify({ error: "Configuração não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const bypassQuiet: string[] = cfg.bypass_quiet_hours_tipos ?? ["fraude"];
    const emQuiet = !bypassQuiet.includes(tipo) && !forcar
      && inQuietHours(now, cfg.quiet_hours_inicio, cfg.quiet_hours_fim);
    const dow = now.getDay();
    const finalDeSemana = dow === 0 || dow === 6;
    const bloqueadoFds = finalDeSemana && !cfg.enviar_fins_de_semana && !bypassQuiet.includes(tipo) && !forcar;

    // Rate limit
    if (!forcar && cfg.rate_limit_por_hora > 0) {
      const desde = new Date(Date.now() - 3600_000).toISOString();
      const { count } = await sb.from("ponto_notificacoes_envios")
        .select("id", { count: "exact", head: true })
        .eq("estabelecimento_id", estabelecimento_id)
        .gte("created_at", desde)
        .in("status", ["enviado", "confirmado"]);
      if ((count || 0) >= cfg.rate_limit_por_hora) {
        await logEnvio(sb, { estabelecimento_id, tipo, canal: "any", status: "bloqueado_ratelimit", titulo: tituloIn ?? tipo });
        return new Response(JSON.stringify({ ok: false, bloqueado: "rate_limit", enviados: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Dedupe hash
    const hoje = now.toISOString().slice(0, 10);
    const dedupe_hash = `${estabelecimento_id}|${tipo}|${funcionario_id ?? ""}|${hoje}`;
    if (!forcar && cfg.dedupe_janela_horas > 0) {
      const desde = new Date(Date.now() - cfg.dedupe_janela_horas * 3600_000).toISOString();
      const { data: dup } = await sb.from("ponto_notificacoes_envios")
        .select("id").eq("dedupe_hash", dedupe_hash).gte("created_at", desde)
        .in("status", ["enviado", "confirmado"]).limit(1);
      if (dup && dup.length) {
        await logEnvio(sb, { estabelecimento_id, tipo, canal: "any", status: "deduplicado", dedupe_hash, funcionario_id });
        return new Response(JSON.stringify({ ok: true, deduplicado: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Funcionário
    let funcionario: any = null, prefs: any = null;
    if (funcionario_id) {
      const { data: f } = await sb.from("ponto_funcionarios")
        .select("id, nome, telefone, telefone_alt, email").eq("id", funcionario_id).maybeSingle();
      funcionario = f;
      const { data: p } = await sb.from("ponto_funcionario_notif_prefs")
        .select("*").eq("funcionario_id", funcionario_id).maybeSingle();
      prefs = p;
    }

    // Templates: usa "lider" para gestores; usa próprio para funcionário
    const tplsFunc = cfg.mensagens_template ?? {};
    const tplsLider = cfg.mensagens_template_lider ?? {};
    const tituloBase = tituloIn ?? ({
      atraso: "Atraso registrado", falta: "Falta registrada",
      he_pendente: "Hora extra pendente", atestado_pendente: "Atestado pendente",
      bh_expirar: "Banco de horas expirando", fraude: "Alerta de fraude",
    } as any)[tipo] ?? "Notificação do Ponto";

    const dadosMerged = {
      funcionario: funcionario?.nome ?? "",
      data: dados?.data ?? hoje,
      link_aprovacao: APP_URL + (LINKS_APROVACAO[tipo] || "/ponto"),
      ...dados,
    };
    const msgFunc = render(mensagemIn ?? tplsFunc[tipo] ?? `${tituloBase}: ${JSON.stringify(dados)}`, dadosMerged);
    const msgLider = render(mensagemIn ?? tplsLider[tipo] ?? tplsFunc[tipo] ?? `${tituloBase}: ${JSON.stringify(dados)}`, dadosMerged);

    const canaisConfig: string[] = canaisOverride ?? (cfg.canais_por_evento ?? {})[tipo] ?? ["push"];
    const usar = (c: string) => canaisConfig.includes(c);

    if (emQuiet || bloqueadoFds) {
      await logEnvio(sb, { estabelecimento_id, tipo, canal: "any", status: "bloqueado_quiet", dedupe_hash, funcionario_id, mensagem: msgFunc });
      return new Response(JSON.stringify({ ok: false, bloqueado: emQuiet ? "quiet_hours" : "fim_de_semana" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resultados: any[] = [];
    async function tent(canal: string, destino: string | null, fn: () => Promise<any>, mensagem: string) {
      try {
        await fn();
        await logEnvio(sb, { estabelecimento_id, tipo, canal, destinatario: destino, status: "enviado", dedupe_hash, funcionario_id, titulo: tituloBase, mensagem });
        resultados.push({ canal, to: destino, ok: true });
      } catch (e: any) {
        const erro = String(e?.message || e);
        await logEnvio(sb, { estabelecimento_id, tipo, canal, destinatario: destino, status: "falha", dedupe_hash, funcionario_id, titulo: tituloBase, mensagem, erro });
        resultados.push({ canal, to: destino, ok: false, erro });
      }
    }

    // === Funcionário ===
    if (cfg.notificar_funcionario && funcionario) {
      const canaisFunc = prefs?.canais_preferidos?.length ? canaisConfig.filter(c => prefs.canais_preferidos.includes(c)) : canaisConfig;
      const link = APP_URL + (LINKS_APROVACAO[tipo] || "/ponto");

      if (canaisFunc.includes("push") && cfg.push_ativo && (!prefs || prefs.aceita_push !== false)) {
        await tent("push", `func:${funcionario.id}`, () => enviarPush(sb, funcionario.id, tituloBase, msgFunc, link), msgFunc);
      }
      if (canaisFunc.includes("sms") && cfg.sms_ativo && funcionario.telefone && (!prefs || prefs.aceita_sms !== false)) {
        await tent("sms", funcionario.telefone, () => enviarSms(sb, estabelecimento_id, funcionario.telefone, `${tituloBase}: ${msgFunc}`), msgFunc);
      }
      if (canaisFunc.includes("whatsapp") && cfg.whatsapp_ativo && funcionario.telefone && (!prefs || prefs.aceita_whatsapp !== false)) {
        const extra = cfg.whatsapp_permite_confirmacao ? "\n\n_Responda *OK* para confirmar._" : "";
        await tent("whatsapp", funcionario.telefone, () => enviarWhatsapp(sb, funcionario.telefone, `*${tituloBase}*\n${msgFunc}${extra}`), msgFunc);
      }
      if (canaisFunc.includes("email") && cfg.email_ativo && funcionario.email && (!prefs || prefs.aceita_email !== false)) {
        await tent("email", funcionario.email, () => sb.functions.invoke("send-email", {
          body: { to: [funcionario.email], subject: tituloBase, html: `<p>${msgFunc}</p>` },
        }), msgFunc);
      }
    }

    // === Líderes/gestores ===
    const telefonesLider: string[] = Array.from(new Set([...(cfg.destinatarios_telefones ?? [])].filter(Boolean).map(String)));
    const emailsLider: string[] = Array.from(new Set([...(cfg.destinatarios_emails ?? [])].filter(Boolean).map(String)));

    if (usar("sms") && cfg.sms_ativo) for (const t of telefonesLider) {
      await tent("sms", t, () => enviarSms(sb, estabelecimento_id, t, `${tituloBase}: ${msgLider}`), msgLider);
    }
    if (usar("whatsapp") && cfg.whatsapp_ativo) for (const t of telefonesLider) {
      await tent("whatsapp", t, () => enviarWhatsapp(sb, t, `*${tituloBase}*\n${msgLider}`), msgLider);
    }
    if (usar("email") && cfg.email_ativo && emailsLider.length) {
      await tent("email", emailsLider.join(","), () => sb.functions.invoke("send-email", {
        body: { to: emailsLider, subject: tituloBase, html: `<p>${msgLider}</p>` },
      }), msgLider);
    }

    // Webhook (compat)
    if (cfg.webhook_url) {
      await tent("webhook", cfg.webhook_url, async () => {
        const r = await fetch(cfg.webhook_url, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estabelecimento_id, tipo, titulo: tituloBase, mensagem: msgLider, funcionario_id, dados: dadosMerged }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
      }, msgLider);
    }

    return new Response(JSON.stringify({ ok: true, canais: canaisConfig, resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
