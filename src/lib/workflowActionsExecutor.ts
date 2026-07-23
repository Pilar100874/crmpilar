// Executores unificados dos blocos genéricos usados nos vários workflow builders:
// - Webhook  (chama URL externa via edge function proxy p/ evitar CORS)
// - E-mail   (via edge function send-email)
// - WhatsApp (via edge function send-agent-message quando disponível)
// - Mensagem interna (chat_interno_mensagens)
// - Aviso do sistema (avisos_sistema)

import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

function interpolar(str: any, vars: Record<string, any> = {}): string {
  return String(str ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split(".");
    let v: any = vars;
    for (const p of parts) v = v?.[p];
    return v == null ? "" : String(v);
  });
}

export interface WfCtx {
  variaveis?: Record<string, any>;
  estabelecimento_id?: string;
  workflow_tipo?: string;
  origem?: string;
}

async function resolveEstab(ctx: WfCtx): Promise<string | undefined> {
  if (ctx.estabelecimento_id) return ctx.estabelecimento_id;
  try { return await getEstabelecimentoId(); } catch { return undefined; }
}

// ---------- Webhook ----------
export async function executarBlocoWebhook(cfg: any, ctx: WfCtx = {}) {
  const url = interpolar(cfg?.url, ctx.variaveis);
  const method = (cfg?.method || "POST").toUpperCase();
  const bodyStr = interpolar(cfg?.body ?? cfg?.payload ?? "", ctx.variaveis);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cfg?.headers && typeof cfg.headers === "object") {
    for (const [k, v] of Object.entries(cfg.headers)) headers[k] = interpolar(v, ctx.variaveis);
  }
  if (!url) return { ok: false, erro: "URL vazia" };

  try {
    // usa edge function como proxy p/ evitar CORS (memória do projeto)
    const { data, error } = await supabase.functions.invoke("execute-dynamic-query", {
      body: { url, method, headers, body: bodyStr },
    });
    if (error) return { ok: false, erro: error.message };
    return { ok: true, response: data };
  } catch (e: any) {
    // fallback: fetch direto
    try {
      const r = await fetch(url, {
        method,
        headers,
        body: method === "GET" || method === "HEAD" ? undefined : (bodyStr || JSON.stringify(ctx.variaveis || {})),
      });
      const txt = await r.text();
      return { ok: r.ok, status: r.status, response: txt };
    } catch (e2: any) {
      return { ok: false, erro: e2?.message || String(e2) };
    }
  }
}

// ---------- E-mail ----------
export async function executarBlocoEmail(cfg: any, ctx: WfCtx = {}) {
  const to = interpolar(cfg?.to ?? cfg?.email_destino ?? cfg?.destinatario, ctx.variaveis);
  const subject = interpolar(cfg?.subject ?? cfg?.assunto ?? cfg?.assunto_email, ctx.variaveis);
  const body = interpolar(cfg?.body ?? cfg?.corpo_email ?? cfg?.mensagem, ctx.variaveis);
  if (!to || !subject) return { ok: false, erro: "Destinatário/assunto vazio" };
  try {
    const { data, error } = await supabase.functions.invoke("send-email", {
      body: { to, subject, html: body, text: body },
    });
    if (error) return { ok: false, erro: error.message };
    return { ok: true, response: data };
  } catch (e: any) {
    return { ok: false, erro: e?.message || String(e) };
  }
}

// ---------- WhatsApp ----------
export async function executarBlocoWhatsapp(cfg: any, ctx: WfCtx = {}) {
  const telefonesRaw: string[] = Array.isArray(cfg?.phoneNumbers) && cfg.phoneNumbers.length
    ? cfg.phoneNumbers
    : [cfg?.phoneNumber ?? cfg?.telefone ?? cfg?.numero];
  const telefones = telefonesRaw
    .map((t) => interpolar(t, ctx.variaveis).replace(/\D/g, ""))
    .filter(Boolean);
  const mensagem = interpolar(cfg?.message ?? cfg?.mensagem ?? cfg?.texto, ctx.variaveis);
  if (!telefones.length || !mensagem) return { ok: false, erro: "Telefone/mensagem vazio" };
  const estabelecimento_id = await resolveEstab(ctx);
  const whatsappSessionId = cfg?.whatsappSessionId || null;
  const whatsappSessionName = cfg?.whatsappSessionName || null;
  const whatsappNumeroId = cfg?.whatsappNumeroId || cfg?.canal_id || null;
  try {
    const mediaUrl = interpolar(cfg?.mediaUrl ?? cfg?.imagem ?? cfg?.arquivo_url ?? "", ctx.variaveis);
    const resultados: any[] = [];
    for (const telefone of telefones) {
      const { data, error } = await supabase.functions.invoke("send-agent-message", {
        body: {
          estabelecimento_id,
          telefone,
          mensagem,
          text: mensagem,
          caption: mediaUrl ? mensagem : undefined,
          fileUrl: mediaUrl || undefined,
          mediaUrl: mediaUrl || undefined,
          canal: "whatsapp",
          whatsappSessionId,
          whatsappSessionName,
          whatsappNumeroId,
          origem: ctx.origem || ctx.workflow_tipo || "workflow",
        },
      });
      if (error) resultados.push({ telefone, ok: false, erro: error.message });
      else resultados.push({ telefone, ok: true, response: data });
    }
    const okAll = resultados.every((r) => r.ok);
    return { ok: okAll, response: resultados };
  } catch (e: any) {
    return { ok: false, erro: e?.message || String(e) };
  }
}

// ---------- Mensagem interna ----------
export async function executarBlocoMensagemInterna(cfg: any, ctx: WfCtx = {}) {
  const usuario_id = interpolar(cfg?.usuario_id ?? cfg?.destinatario_id, ctx.variaveis);
  const mensagem = interpolar(cfg?.mensagem ?? cfg?.texto, ctx.variaveis);
  const titulo = interpolar(cfg?.titulo_conversa ?? cfg?.titulo, ctx.variaveis) || null;
  const estabelecimento_id = await resolveEstab(ctx);
  if (!mensagem || !estabelecimento_id) return { ok: false, erro: "Mensagem ou estabelecimento vazio" };

  try {
    // cria conversa "workflow"
    const { data: conv, error: convErr } = await supabase
      .from("chat_interno_conversas")
      .insert({ estabelecimento_id, tipo: "workflow", titulo })
      .select("id")
      .single();
    if (convErr) return { ok: false, erro: convErr.message };

    if (usuario_id) {
      await supabase.from("chat_interno_participantes" as any).insert({
        conversa_id: conv.id, usuario_id,
      }).then(() => {}, () => {});
    }

    const { error: msgErr } = await supabase.from("chat_interno_mensagens").insert({
      conversa_id: conv.id,
      conteudo: mensagem,
      tipo: "sistema",
      metadata: { workflow_tipo: ctx.workflow_tipo, origem: ctx.origem },
    });
    if (msgErr) return { ok: false, erro: msgErr.message };
    return { ok: true, conversa_id: conv.id };
  } catch (e: any) {
    return { ok: false, erro: e?.message || String(e) };
  }
}

// ---------- Aviso do sistema ----------
export async function executarBlocoAvisoSistema(cfg: any, ctx: WfCtx = {}) {
  const titulo = interpolar(cfg?.titulo, ctx.variaveis);
  const mensagem = interpolar(cfg?.mensagem, ctx.variaveis);
  const tipo = cfg?.tipo || "info";
  const destinatarios_tipo = cfg?.destinatarios_tipo || "todos";
  const destinatarios_ids = cfg?.destinatarios_ids || null;
  const destinatarios_roles = cfg?.destinatarios_roles || null;
  const estabelecimento_id = await resolveEstab(ctx);
  if (!titulo || !mensagem) return { ok: false, erro: "Título/mensagem vazio" };
  try {
    const { data, error } = await supabase.from("avisos_sistema").insert({
      estabelecimento_id,
      titulo,
      mensagem,
      tipo,
      destinatarios_tipo,
      destinatarios_ids,
      destinatarios_roles,
      ativo: true,
    }).select("id").single();
    if (error) return { ok: false, erro: error.message };
    return { ok: true, id: data?.id };
  } catch (e: any) {
    return { ok: false, erro: e?.message || String(e) };
  }
}
