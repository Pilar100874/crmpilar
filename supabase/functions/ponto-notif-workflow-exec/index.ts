// Executor de workflows visuais de notificação do Ponto.
// Recebe { workflow_id | estabelecimento_id + evento_gatilho, funcionario_id, dados }
// e percorre o grafo (nodes/edges) do flow_data disparando canais/condições/escalonamento.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const APP_URL = "https://crmpilar.lovable.app";

function render(tpl: string, dados: Record<string, any>) {
  return (tpl || "").replace(/\{(\w+)\}/g, (_, k) => (dados?.[k] ?? "").toString());
}

function inQuietHours(now: Date, ini?: string, fim?: string) {
  if (!ini || !fim) return false;
  const [ih, im] = ini.split(":").map(Number);
  const [fh, fm] = fim.split(":").map(Number);
  const n = now.getHours() * 60 + now.getMinutes();
  const a = ih * 60 + im, b = fh * 60 + fm;
  return a <= b ? n >= a && n < b : n >= a || n < b;
}

async function enviarSms(sb: any, estabelecimento_id: string, telefone: string, mensagem: string) {
  const { error } = await sb.functions.invoke("send-sms", { body: { estabelecimento_id, destino: telefone, mensagem } });
  if (error) throw new Error(error.message);
}

async function enviarWhatsapp(sb: any, telefone: string, mensagem: string) {
  const { data: def } = await sb.from("whatsapp_numeros").select("*").eq("ativo", true).eq("is_default", true).limit(1).maybeSingle();
  let numero: any = def;
  if (!numero) {
    const { data: cfg } = await sb.from("whatsapp_config").select("*").limit(1).maybeSingle();
    if (cfg?.waha_url) numero = { provider: "evolution", waha_url: cfg.waha_url, waha_api_key: cfg.waha_api_key, session_name: cfg.session_name || "default" };
  }
  if (!numero) throw new Error("Nenhum WhatsApp configurado");
  const phone = telefone.replace(/\D/g, "");
  if (numero.provider === "cloud_api") {
    const r = await fetch(`https://graph.facebook.com/v18.0/${numero.cloud_phone_number_id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${numero.cloud_access_token}` },
      body: JSON.stringify({ messaging_product: "whatsapp", to: phone, type: "text", text: { body: mensagem } }),
    });
    if (!r.ok) throw new Error(`WA ${r.status}`);
  } else {
    const url = (numero.waha_url || "").replace(/\/+$/, "");
    const inst = numero.session_name || "default";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (numero.waha_api_key) headers["apikey"] = numero.waha_api_key;
    const r = await fetch(`${url}/message/sendText/${encodeURIComponent(inst)}`, { method: "POST", headers, body: JSON.stringify({ number: phone, text: mensagem }) });
    if (!r.ok) throw new Error(`WA ${r.status}`);
  }
}

async function log(sb: any, row: any) {
  try { await sb.from("ponto_notificacoes_envios").insert(row); } catch {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { workflow_id, estabelecimento_id, evento_gatilho, funcionario_id, dados = {}, forcar = false } = body || {};

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Localizar workflow
    let wf: any = null;
    if (workflow_id) {
      const { data } = await sb.from("ponto_notif_workflows").select("*").eq("id", workflow_id).maybeSingle();
      wf = data;
    } else if (estabelecimento_id && evento_gatilho) {
      const { data } = await sb.from("ponto_notif_workflows")
        .select("*").eq("estabelecimento_id", estabelecimento_id)
        .eq("evento_gatilho", evento_gatilho).eq("ativo", true).limit(1).maybeSingle();
      wf = data;
    }
    if (!wf) return new Response(JSON.stringify({ ok: false, motivo: "workflow_nao_encontrado" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const flow = wf.flow_data || {};
    const nodes: any[] = flow.nodes || [];
    const edges: any[] = flow.edges || [];
    const byId: Record<string, any> = Object.fromEntries(nodes.map((n: any) => [n.id, n]));

    // Contexto de execução
    const now = new Date();
    const hoje = now.toISOString().slice(0, 10);

    // Buscar funcionário
    let funcionario: any = null;
    if (funcionario_id) {
      const { data: f } = await sb.from("ponto_funcionarios").select("id, nome, telefone, email").eq("id", funcionario_id).maybeSingle();
      funcionario = f;
    }
    const dadosMerged: any = {
      funcionario: funcionario?.nome ?? "",
      data: dados?.data ?? hoje,
      link_aprovacao: APP_URL + "/ponto/aprovacoes",
      ...dados,
    };

    // Helper para pegar sucessores (label opcional para condição)
    const next = (fromId: string, label?: string) => edges.filter((e: any) => e.source === fromId && (label ? (e.sourceHandle === label || e.label === label) : true)).map((e: any) => e.target);

    const resultados: any[] = [];
    const visitados = new Set<string>();

    async function executarNode(nodeId: string) {
      if (visitados.has(nodeId)) return;
      visitados.add(nodeId);
      const node = byId[nodeId];
      if (!node) return;
      const t = node.data?.type;
      const cfg = node.data?.config || {};

      if (t === "trigger") {
        for (const n of next(nodeId)) await executarNode(n);
        return;
      }
      if (t === "quiet_hours") {
        const bloq = inQuietHours(now, cfg.inicio || "22:00", cfg.fim || "07:00");
        if (bloq && !forcar) {
          await log(sb, { estabelecimento_id: wf.estabelecimento_id, tipo: wf.evento_gatilho, canal: "any", status: "bloqueado_quiet", funcionario_id, mensagem: `wf:${wf.id}` });
          return;
        }
        for (const n of next(nodeId)) await executarNode(n);
        return;
      }
      if (t === "condicao") {
        // Suporta severidade/campo simples: cfg.campo, cfg.operador (=, !=, >, <, in), cfg.valor
        const campo = cfg.campo || "severidade";
        const op = cfg.operador || "=";
        const alvo = cfg.valor;
        const v = dadosMerged[campo];
        let ok = false;
        if (op === "=") ok = String(v) === String(alvo);
        else if (op === "!=") ok = String(v) !== String(alvo);
        else if (op === ">") ok = Number(v) > Number(alvo);
        else if (op === "<") ok = Number(v) < Number(alvo);
        else if (op === "in") ok = String(alvo || "").split(",").map((s: string) => s.trim()).includes(String(v));
        const branch = ok ? "sim" : "nao";
        for (const n of next(nodeId, branch)) await executarNode(n);
        for (const n of next(nodeId)) {
          // fallback: se não houver handles, segue reto
          if (!edges.find((e: any) => e.source === nodeId && (e.sourceHandle || e.label))) await executarNode(n);
        }
        return;
      }
      if (t === "delay") {
        const min = Number(cfg.minutos || 0);
        if (min > 0) await new Promise(r => setTimeout(r, Math.min(min * 60000, 25000))); // cap 25s
        for (const n of next(nodeId)) await executarNode(n);
        return;
      }
      if (t === "template") {
        // Aplica template ao contexto (dadosMerged.mensagem_render)
        dadosMerged.__titulo = cfg.titulo || wf.nome;
        dadosMerged.__mensagem = render(cfg.mensagem || "", dadosMerged);
        for (const n of next(nodeId)) await executarNode(n);
        return;
      }
      if (t === "log") {
        await log(sb, { estabelecimento_id: wf.estabelecimento_id, tipo: wf.evento_gatilho, canal: "log", status: "enviado", funcionario_id, titulo: cfg.rotulo || "log", mensagem: JSON.stringify(dadosMerged) });
        for (const n of next(nodeId)) await executarNode(n);
        return;
      }
      if (t === "escalonamento") {
        // Aciona ponto-notificar-escalonar para o evento
        try {
          await sb.functions.invoke("ponto-notificar-escalonar", { body: { estabelecimento_id: wf.estabelecimento_id, tipo: wf.evento_gatilho, funcionario_id } });
        } catch {}
        for (const n of next(nodeId)) await executarNode(n);
        return;
      }

      // Canais
      const titulo = dadosMerged.__titulo || wf.nome;
      const mensagem = dadosMerged.__mensagem || render(cfg.mensagem || cfg.template || `${titulo}`, dadosMerged);
      const destino = cfg.destino || "funcionario"; // funcionario | lider | numero_fixo | emails_fixos
      const numerosFixos: string[] = cfg.numeros || [];
      const emailsFixos: string[] = cfg.emails || [];

      async function tent(canal: string, dst: string | null, fn: () => Promise<any>) {
        try {
          await fn();
          await log(sb, { estabelecimento_id: wf.estabelecimento_id, tipo: wf.evento_gatilho, canal, destinatario: dst, status: "enviado", funcionario_id, titulo, mensagem });
          resultados.push({ node: nodeId, canal, dst, ok: true });
        } catch (e: any) {
          await log(sb, { estabelecimento_id: wf.estabelecimento_id, tipo: wf.evento_gatilho, canal, destinatario: dst, status: "falha", funcionario_id, titulo, mensagem, erro: String(e?.message || e) });
          resultados.push({ node: nodeId, canal, dst, ok: false });
        }
      }

      if (t === "canal_push" && funcionario) {
        await tent("push", `func:${funcionario.id}`, () => sb.functions.invoke("ponto-push-send", { body: { funcionario_id: funcionario.id, titulo, corpo: mensagem, url: dadosMerged.link_aprovacao } }));
      } else if (t === "canal_sms") {
        const alvos = destino === "funcionario" ? [funcionario?.telefone].filter(Boolean) : numerosFixos;
        for (const tel of alvos) await tent("sms", tel, () => enviarSms(sb, wf.estabelecimento_id, tel, `${titulo}: ${mensagem}`));
      } else if (t === "canal_whatsapp") {
        const alvos = destino === "funcionario" ? [funcionario?.telefone].filter(Boolean) : numerosFixos;
        for (const tel of alvos) await tent("whatsapp", tel, () => enviarWhatsapp(sb, tel, `*${titulo}*\n${mensagem}`));
      } else if (t === "canal_email") {
        const alvos = destino === "funcionario" ? [funcionario?.email].filter(Boolean) : emailsFixos;
        if (alvos.length) await tent("email", alvos.join(","), () => sb.functions.invoke("send-email", { body: { to: alvos, subject: titulo, html: `<p>${mensagem}</p>` } }));
      } else if (t === "canal_webhook") {
        const url = cfg.url;
        if (url) await tent("webhook", url, async () => {
          const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evento: wf.evento_gatilho, funcionario_id, dados: dadosMerged }) });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
        });
      }

      for (const n of next(nodeId)) await executarNode(n);
    }

    // Começa pelos gatilhos (type === trigger) ou nós sem incoming
    const targets = new Set(edges.map((e: any) => e.target));
    const starts = nodes.filter((n: any) => n.data?.type === "trigger" || !targets.has(n.id));
    for (const s of starts) await executarNode(s.id);

    return new Response(JSON.stringify({ ok: true, workflow_id: wf.id, resultados }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
