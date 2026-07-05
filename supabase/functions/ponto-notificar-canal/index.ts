// Dispatcher unificado de notificações do Ponto (Push, E-mail, SMS, WhatsApp)
// Input: { estabelecimento_id, tipo, funcionario_id?, dados?, canais?, titulo?, mensagem? }
// - tipo: 'atraso'|'falta'|'he_pendente'|'atestado_pendente'|'bh_expirar'|'fraude'|'custom'
// - canais: override opcional dos canais configurados
// - dados: chaves para preencher template (funcionario, data, quantidade, detalhe...)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function render(tpl: string, dados: Record<string, any>) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => (dados?.[k] ?? "").toString());
}

async function enviarSms(sb: any, estabelecimento_id: string, telefone: string, mensagem: string) {
  const { data, error } = await sb.functions.invoke("send-sms", {
    body: { estabelecimento_id, destino: telefone, mensagem },
  });
  if (error) throw new Error(error.message);
  return data;
}

async function enviarWhatsapp(sb: any, telefone: string, mensagem: string) {
  // Reutiliza a config default do WhatsApp (numeros/config)
  let numero: any = null;
  const { data: def } = await sb.from("whatsapp_numeros")
    .select("*").eq("ativo", true).eq("is_default", true).limit(1).maybeSingle();
  numero = def;
  if (!numero) {
    const { data: cfg } = await sb.from("whatsapp_config").select("*").limit(1).maybeSingle();
    if (cfg?.waha_url) {
      numero = {
        provider: "evolution",
        waha_url: cfg.waha_url,
        waha_api_key: cfg.waha_api_key,
        session_name: cfg.session_name || "default",
      };
    }
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
    if (!r.ok) throw new Error(`WhatsApp Evolution HTTP ${r.status}`);
    return await r.json();
  }
}

async function enviarPush(sb: any, funcionario_id: string, titulo: string, mensagem: string) {
  return await sb.functions.invoke("ponto-push-send", {
    body: { funcionario_id, titulo, corpo: mensagem, url: "/ponto" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { estabelecimento_id, tipo, funcionario_id, dados = {}, canais: canaisOverride, titulo: tituloIn, mensagem: mensagemIn } = body ?? {};
    if (!estabelecimento_id || !tipo) {
      return new Response(JSON.stringify({ error: "estabelecimento_id e tipo obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: cfg } = await sb.from("ponto_notificacoes_config")
      .select("*").eq("estabelecimento_id", estabelecimento_id).maybeSingle();

    if (!cfg) {
      return new Response(JSON.stringify({ error: "Configuração de notificação não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar dados do funcionário para preencher template + destino
    let funcionario: any = null;
    if (funcionario_id) {
      const { data: f } = await sb.from("ponto_funcionarios")
        .select("id, nome, telefone, telefone_alt, email").eq("id", funcionario_id).maybeSingle();
      funcionario = f;
    }

    const dadosMerged = { funcionario: funcionario?.nome ?? "", ...dados };
    const template = (cfg.mensagens_template ?? {})[tipo] ?? mensagemIn ?? `Alerta: ${tipo}`;
    const mensagem = render(mensagemIn ?? template, dadosMerged);
    const titulo = tituloIn ?? {
      atraso: "Atraso registrado",
      falta: "Falta registrada",
      he_pendente: "Hora extra pendente",
      atestado_pendente: "Atestado pendente",
      bh_expirar: "Banco de horas expirando",
      fraude: "Alerta de fraude",
    }[tipo as string] ?? "Notificação do Ponto";

    const canaisConfig: string[] = canaisOverride ?? (cfg.canais_por_evento ?? {})[tipo] ?? ["push"];
    const usar = (c: string) => canaisConfig.includes(c);

    const resultados: any[] = [];

    // 1) Push (destinatário: funcionário se informado)
    if (usar("push") && cfg.push_ativo && funcionario_id) {
      try { await enviarPush(sb, funcionario_id, titulo, mensagem); resultados.push({ canal: "push", ok: true }); }
      catch (e) { resultados.push({ canal: "push", ok: false, erro: String(e) }); }
    }

    // 2) Telefones alvo (funcionário + líderes)
    const telefones = new Set<string>();
    if (cfg.notificar_funcionario && funcionario?.telefone) telefones.add(funcionario.telefone);
    for (const t of (cfg.destinatarios_telefones ?? [])) if (t) telefones.add(String(t));

    if (usar("sms") && cfg.sms_ativo) {
      for (const t of telefones) {
        try { await enviarSms(sb, estabelecimento_id, t, `${titulo}: ${mensagem}`); resultados.push({ canal: "sms", to: t, ok: true }); }
        catch (e) { resultados.push({ canal: "sms", to: t, ok: false, erro: String(e) }); }
      }
    }
    if (usar("whatsapp") && cfg.whatsapp_ativo) {
      for (const t of telefones) {
        try { await enviarWhatsapp(sb, t, `*${titulo}*\n${mensagem}`); resultados.push({ canal: "whatsapp", to: t, ok: true }); }
        catch (e) { resultados.push({ canal: "whatsapp", to: t, ok: false, erro: String(e) }); }
      }
    }

    // 3) E-mails (líderes + próprio funcionário)
    if (usar("email") && cfg.email_ativo) {
      const emails = new Set<string>(cfg.destinatarios_emails ?? []);
      if (cfg.notificar_funcionario && funcionario?.email) emails.add(funcionario.email);
      if (emails.size) {
        try {
          await sb.functions.invoke("send-email-notification", {
            body: { to: Array.from(emails), subject: titulo, html: `<p>${mensagem}</p>` },
          });
          resultados.push({ canal: "email", ok: true, total: emails.size });
        } catch (e) { resultados.push({ canal: "email", ok: false, erro: String(e) }); }
      }
    }

    // 4) Webhook (mantém compatibilidade)
    if (cfg.webhook_url) {
      try {
        await fetch(cfg.webhook_url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estabelecimento_id, tipo, titulo, mensagem, funcionario_id, dados: dadosMerged }),
        });
        resultados.push({ canal: "webhook", ok: true });
      } catch (e) { resultados.push({ canal: "webhook", ok: false, erro: String(e) }); }
    }

    // Log em ponto_alertas para timeline
    await sb.from("ponto_alertas").insert({
      estabelecimento_id, tipo, severidade: tipo === "fraude" ? "alta" : "media",
      mensagem: JSON.stringify({ titulo, mensagem, canais: canaisConfig, resultados }),
      data_referencia: new Date().toISOString().slice(0, 10),
    });

    return new Response(JSON.stringify({ ok: true, canais: canaisConfig, resultados }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
