import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { revisarPortugues } from "../_shared/revisar-pt.ts";
import {
  carregarRitmo,
  foraDaJanela,
  esperarEntreEnvios,
  esperarLote,
  consumirCota,
  variarTexto,
} from "../_shared/ritmoHumano.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FlowNode {
  id: string;
  type?: string;
  data: { type?: string; label?: string; config?: any };
}
interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
}

function interp(str: any, vars: Record<string, any> = {}): string {
  return String(str ?? "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    const parts = path.split(".");
    let v: any = vars;
    for (const p of parts) v = v?.[p];
    return v == null ? "" : String(v);
  });
}

function inferContentType(url: string): string {
  const lower = url.split("?")[0].split("#")[0].toLowerCase();
  if (/\.(mp4|mov|webm)$/.test(lower)) return "video";
  if (/\.(mp3|ogg|wav|m4a)$/.test(lower)) return "audio";
  if (lower.endsWith(".pdf")) return "document";
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg)$/.test(lower)) return "image";
  return "document";
}

function nodeType(n: FlowNode): string {
  return (n.data?.type || n.type || "").toString();
}

function findStart(nodes: FlowNode[]): FlowNode | undefined {
  return nodes.find((n) => {
    const t = nodeType(n);
    return t === "start" || t === "inicio";
  });
}

function nextNode(nodes: FlowNode[], edges: FlowEdge[], currentId: string, handle?: string): FlowNode | null {
  const outs = edges.filter((e) => e.source === currentId);
  const edge = outs.find((e) => (e.sourceHandle || "default") === (handle || "default"))
    || outs.find((e) => !e.sourceHandle)
    || (handle ? undefined : outs[0]);
  if (!edge) return null;
  return nodes.find((n) => n.id === edge.target) || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let reqBody: any = {};
  try {
    reqBody = await req.json();
  } catch {
    reqBody = {};
  }

  // Disparos vindos de automações/rotinas podem levar minutos (envio em massa).
  // Nesses casos respondemos imediatamente e seguimos processando em background,
  // evitando o erro "Edge Function returned a non-2xx status code" por timeout.
  const emBackground = !!(
    reqBody?.background ||
    reqBody?.automationId ||
    reqBody?.origem === "marketing_automation"
  );

  const executar = async (): Promise<Response> => {
  const trace: any[] = [];
  try {
    const body = reqBody;
    const { flowId, estabelecimentoId, variaveis, automationId, origem } = body || {};
    if (!flowId) throw new Error("flowId é obrigatório");

    const { data: bot, error: botErr } = await supabase
      .from("bot_flows")
      .select("id, name, flow_data, estabelecimento_id")
      .eq("id", flowId)
      .single();
    if (botErr || !bot) throw new Error("Bot não encontrado");

    const estId = estabelecimentoId || bot.estabelecimento_id;
    const flowData = (bot.flow_data as any) || {};
    const nodes: FlowNode[] = flowData.nodes || [];
    const edges: FlowEdge[] = flowData.edges || [];

    const ctx: Record<string, any> = { ...(variaveis || {}), estabelecimento_id: estId };

    let current: FlowNode | null = findStart(nodes) || null;
    if (!current) throw new Error("Nó de início não encontrado");

    let steps = 0;
    while (current && steps++ < 200) {
      const t = nodeType(current);
      const cfg = current.data?.config || {};
      let handle: string | undefined;
      trace.push({ node: current.id, type: t, label: current.data?.label, config: cfg });

      try {
        if (t === "start" || t === "inicio") {
          // no-op
        } else if (t === "mensagem_pre_definida") {
          try {
            const { data, error } = await supabase.functions.invoke("pick-mensagem-pre-definida", {
              body: {
                estabelecimentoId: estId,
                escopo: cfg.escopo || "qualquer",
                grupoId: cfg.grupoId || undefined,
                tema: cfg.tema || undefined,
                modoSelecao: cfg.modoSelecao || "rotacao",
                fraseId: cfg.fraseId || undefined,
                cursorKey: `bot:${bot.id}:${current.id}`,
              },
            });
            if (error) throw error;
            const fraseOriginal = (data as any)?.frase?.frase;
            // Revisão de português antes de exibir/embutir em prompts de mídia
            let frase = fraseOriginal;
            if (frase && (cfg.apresentacao || "texto") === "midia") {
              try { frase = await revisarPortugues(frase); } catch (_e) { /* falha aberto */ }
            }
            if (frase) {
              ctx.last_mensagem_pre_definida = frase;
              if (cfg.outputVariable) ctx[cfg.outputVariable] = frase;


              if ((cfg.apresentacao || "texto") === "midia") {
                try {
                  const mediaType = cfg.mediaType === "video" ? "video" : "image";
                  const variations = Math.max(1, Math.min(6, cfg.variations || 1));
                  const { data: gen } = await supabase.functions.invoke("bot-generate-ai-media", {
                    body: {
                      prompt: mediaType === "video"
                        ? `Crie um vídeo curto publicitário que inclua, exibido em texto legível na cena, exatamente a frase: "${frase}". Não altere as palavras, não traduza, não abrevie. Português do Brasil.`
                        : `Crie uma imagem publicitária com a frase escrita de forma grande, legível e centralizada: "${frase}". Renderize o texto EXATAMENTE como escrito, sem trocar palavras, sem abreviar e sem erros de ortografia. Português do Brasil. Tipografia limpa, alto contraste com o fundo.`,
                      basePrompt: cfg.basePrompt || "",
                      variations,
                      estabelecimentoId: estId,
                      aspectRatio: cfg.aspectRatio || "1:1",
                      mediaType,
                      styleSource: cfg.styleSource || "visual_identity",
                      preset: cfg.styleSource === "preset" ? (cfg.preset || "") : "",
                    },
                  });

                  const urls: string[] = Array.isArray(gen?.images)
                    ? gen.images.filter(Boolean)
                    : (gen?.items || gen?.results || []).map((it: any) => it?.url).filter(Boolean);
                  if (urls.length) {
                    ctx.last_generated_media_url = urls[0];
                    ctx.last_generated_media_urls = urls;
                    ctx.last_generated_media_type = mediaType;
                  }
                } catch (e) {
                  trace.push({ node: current.id, warn: "media gen failed", err: String(e) });
                }
              }
              handle = "default";
              trace.push({
                node: current.id,
                type: "mensagem_pre_definida_result",
                frase,
                mediaUrls: ctx.last_generated_media_urls || (ctx.last_generated_media_url ? [ctx.last_generated_media_url] : []),
                mediaType: ctx.last_generated_media_type || null,
              });
            } else {
              handle = "sem_frase";
            }
          } catch (e) {
            trace.push({ node: current.id, warn: "mensagem_pre_definida error", err: String(e) });
            handle = "sem_frase";
          }
        } else if (t === "broadcast_vendedores") {
          const res = await executeBroadcast(supabase, estId, cfg, ctx, origem || "bot", bot.id);
          const outputVar = cfg.outputVariable || "broadcast_vendedores_resultado";
          ctx[outputVar] = res;
          trace.push({ node: current.id, broadcast: res });
        } else if (t === "send_whatsapp_to_number") {
          const numeros: string[] = (Array.isArray(cfg.phoneNumbers) ? cfg.phoneNumbers : [cfg.phoneNumber])
            .map((n: any) => interp(n, ctx).replace(/\D/g, "")).filter(Boolean);
          const mensagem = interp(cfg.message, ctx);
          const mediaUrl = interp(cfg.mediaUrl || "", ctx);
          for (const telefone of numeros) {
            await supabase.functions.invoke("send-agent-message", {
              body: {
                estabelecimento_id: estId,
                telefone,
                text: mensagem,
                caption: mediaUrl ? mensagem : undefined,
                fileUrl: mediaUrl || undefined,
                contentType: mediaUrl ? inferContentType(mediaUrl) : undefined,
                whatsappSessionId: cfg.whatsappSessionId || null,
                whatsappSessionName: cfg.whatsappSessionName || null,
                botFlowId: bot.id,
                origem: origem || "bot",
              },
            });
          }
        } else if (t === "run_external_agent") {
          try {
            const { data, error } = await supabase.functions.invoke("run-external-agent", {
              body: {
                provider: cfg.provider || "claude",
                prompt: cfg.prompt || "",
                systemPrompt: cfg.systemPrompt || "",
                model: cfg.model || undefined,
                endpointUrl: cfg.endpointUrl || undefined,
                apiKeySecret: cfg.apiKeySecret || undefined,
                timeoutSeconds: cfg.timeoutSeconds || 120,
                variables: ctx,
              },
            });
            if (error) throw error;
            const outVar = cfg.outputVariable || "agente_externo_resposta";
            ctx[outVar] = data?.text ?? null;
            ctx[`${outVar}_raw`] = data?.raw ?? null;
            trace.push({ node: current.id, external_agent: { ok: !!data?.ok } });
          } catch (e) {
            trace.push({ node: current.id, warn: "run_external_agent error", err: String(e) });
          }
        } else {
          trace.push({ node: current.id, warn: "tipo ignorado (não implementado no executor server)", type: t });
        }

      } catch (e) {
        trace.push({ node: current.id, error: String(e) });
      }

      current = nextNode(nodes, edges, current.id, handle);
    }

    // Grava o log da execução da automação de marketing (quando disparado por ela).
    // Isso evita que um timeout no invoke do caller resulte em log vazio "falha".
    if (automationId) {
      try {
        await gravarLogAutomacao(supabase, {
          automationId,
          estabelecimentoId: estId,
          trace,
          vars: variaveis || {},
          resultOk: true,
        });
      } catch (e) {
        console.warn("[executar-bot-flow] falha ao gravar log da automação:", e);
      }
    }

    return new Response(JSON.stringify({ success: true, trace, variaveis: ctx }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err), trace }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  };

  if (emBackground) {
    try {
      // @ts-ignore EdgeRuntime existe no runtime do Supabase
      EdgeRuntime.waitUntil(
        executar().catch((e) => console.error("[executar-bot-flow] erro em background:", e)),
      );
    } catch {
      executar().catch((e) => console.error("[executar-bot-flow] erro em background:", e));
    }
    return new Response(
      JSON.stringify({ success: true, background: true, message: "Execução iniciada em segundo plano" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  return await executar();
});

// Grava um registro em marketing_automation_execution_logs a partir do trace,
// espelhando a mesma lógica antes existente em marketing-automation-execute.
async function gravarLogAutomacao(
  supabase: any,
  args: {
    automationId: string;
    estabelecimentoId: string;
    trace: any[];
    vars: Record<string, any>;
    resultOk: boolean;
  },
) {
  const { automationId, estabelecimentoId, trace, vars } = args;
  const items: any[] = [];
  const recipients: any[] = [];
  let totalDest = 0, enviados = 0, falhas = 0;
  let executionStatus = "ok";
  let executionError: string | null = null;

  const msgFromVars =
    vars.mensagem || vars.message || vars.texto || vars.text || vars.body || "";

  for (const t of trace) {
    if (t?.broadcast) {
      const b = t.broadcast;
      totalDest += b.total || 0;
      enviados += b.enviados || 0;
      falhas += b.falhas || 0;
      for (const d of b.detalhes || []) {
        const baseStatus = (d?.status) || (d?.ok ? "enviado" : (d?.invalid ? "invalido" : "falha"));
        const provider = String(d?.providerStatus || "").toUpperCase();
        let finalStatus = baseStatus;
        if (d?.ok && provider) {
          if (provider === "SENT_PENDING_ACK") finalStatus = "enviado";
          else if (/ACK|READ|DELIVER|SERVER/.test(provider)) finalStatus = "ack";
          else if (/PEND/.test(provider)) finalStatus = "pendente";
        }
        recipients.push({
          nome: d?.nome || d?.name || null,
          telefone: d?.telefone || d?.phone || null,
          email: d?.email || null,
          status: finalStatus,
          motivo: d?.motivo || d?.reason || d?.error || (d?.invalid ? "WhatsApp inválido" : null),
          providerStatus: d?.providerStatus || null,
          messageId: d?.messageId || null,
          attempts: d?.attempts || null,
          startedAt: d?.startedAt || null,
          finishedAt: d?.finishedAt || null,
        });
      }
      if (b.aborted && b.error) {
        executionStatus = "falha";
        executionError = b.error;
        items.push({ tipo: "texto", conteudo: `⚠️ Envio abortado: ${b.error}`, titulo: "Aviso do sistema" });
      }
      if (b.textoAntes) items.push({ tipo: "texto", conteudo: b.textoAntes, titulo: "Texto antes" });
      if (b.mensagem) {
        items.push({ tipo: "texto", conteudo: b.mensagem });
      }
      if (b.mediaUrl) {
        const tipoMidia = b.mediaType === "video" ? "video" : "imagem";
        items.push({ tipo: tipoMidia, url: b.mediaUrl });
      }
      if (b.textoDepois) items.push({ tipo: "texto", conteudo: b.textoDepois, titulo: "Texto depois" });
    }
    if (t?.type === "mensagem_pre_definida_result") {
      if (t.frase) items.push({ tipo: "texto", conteudo: t.frase, titulo: "Mensagem pré-definida" });
      for (const url of (t.mediaUrls || [])) {
        items.push({ tipo: t.mediaType === "video" ? "video" : "imagem", url });
      }
    }
    if (t?.type) {
      const nodeCfg = t?.config || {};
      const kind = t.type;
      if (kind === "enviar_mensagem" || kind === "message" || kind === "mensagem" || kind === "send_message") {
        const txt = nodeCfg.mensagem || nodeCfg.message || nodeCfg.text || msgFromVars;
        if (txt) items.push({ tipo: "texto", conteudo: txt });
      } else if (kind === "enviar_imagem" || kind === "image" || kind === "send_image") {
        items.push({ tipo: "imagem", url: nodeCfg.mediaUrl || nodeCfg.url, legenda: nodeCfg.caption || nodeCfg.legenda });
      } else if (kind === "enviar_video" || kind === "video" || kind === "send_video") {
        items.push({ tipo: "video", url: nodeCfg.mediaUrl || nodeCfg.url, legenda: nodeCfg.caption || nodeCfg.legenda });
      } else if (kind === "enviar_audio" || kind === "audio") {
        items.push({ tipo: "audio", url: nodeCfg.mediaUrl || nodeCfg.url });
      } else if (kind === "enviar_arquivo" || kind === "file" || kind === "document") {
        items.push({ tipo: "arquivo", url: nodeCfg.mediaUrl || nodeCfg.url, nome: nodeCfg.fileName });
      } else if (kind === "send_whatsapp_to_number") {
        const txt = nodeCfg.message || nodeCfg.mensagem;
        if (nodeCfg.mediaUrl) items.push({ tipo: "imagem", url: nodeCfg.mediaUrl, legenda: txt });
        else if (txt) items.push({ tipo: "texto", conteudo: txt });
      }
    }
  }

  if (items.length === 0 && msgFromVars) {
    items.push({ tipo: "texto", conteudo: msgFromVars });
  }

  if (!executionError && falhas > 0) {
    const motivos = recipients
      .filter((r) => r.status !== "enviado" && r.status !== "ack" && r.motivo)
      .map((r) => `${r.nome || r.telefone}: ${r.motivo}`)
      .slice(0, 3).join(" | ");
    executionStatus = enviados > 0 ? "parcial" : "falha";
    executionError = enviados > 0
      ? `Algumas mensagens não tiveram confirmação de entrega. ${motivos}`.trim()
      : `Nenhuma mensagem teve confirmação de entrega pelo Evolution. ${motivos}`.trim();
  }

  await supabase.from("marketing_automation_execution_logs").insert({
    automation_id: automationId,
    estabelecimento_id: estabelecimentoId,
    executed_at: new Date().toISOString(),
    metodo: "bot",
    status: executionStatus,
    error_message: executionError,
    items,
    recipients,
    totals: { total: totalDest, enviados, falhas },
    raw_result: { source: "executar-bot-flow", trace_length: trace.length },
  });

  // Mantém apenas os últimos 20 registros da automação (dedupe/limpeza).
  try {
    const { data: antigos } = await supabase
      .from("marketing_automation_execution_logs")
      .select("id")
      .eq("automation_id", automationId)
      .order("executed_at", { ascending: false })
      .range(20, 999);
    const idsExcluir = (antigos || []).map((r: any) => r.id);
    if (idsExcluir.length > 0) {
      await supabase.from("marketing_automation_execution_logs").delete().in("id", idsExcluir);
    }
  } catch (_) { /* noop */ }
}

// ---------- Broadcast (Envio em massa) ----------
async function executeBroadcast(
  supabase: any,
  estabelecimentoId: string,
  cfg: any,
  baseCtx: Record<string, any>,
  origem: string,
  botFlowId?: string,
  automationId?: string,
) {
  // ===== Pre-check: sessão de WhatsApp precisa estar WORKING =====
  try {
    let sessionQuery = supabase
      .from("whatsapp_sessions")
      .select("id, session_name, status, phone_number, bot_flow_id")
      .eq("estabelecimento_id", estabelecimentoId);
    if (cfg.whatsappSessionId) sessionQuery = sessionQuery.eq("id", cfg.whatsappSessionId);
    else if (cfg.whatsappSessionName) sessionQuery = sessionQuery.eq("session_name", cfg.whatsappSessionName);
    else if (botFlowId) sessionQuery = sessionQuery.eq("bot_flow_id", botFlowId);
    const { data: sess } = await sessionQuery.limit(1).maybeSingle();
    if (!sess) {
      const nomeRef = cfg.whatsappSessionName || cfg.whatsappSessionId || "(padrão)";
      return {
        total: 0, enviados: 0, falhas: 0, invalidos: 0, detalhes: [],
        mensagem: "", mediaUrl: "", mediaType: "", textoAntes: cfg.textoAntes || "", textoDepois: cfg.textoDepois || "",
        aborted: true,
        error: `Sessão WhatsApp "${nomeRef}" não encontrada para este estabelecimento. Configure em Canais → WhatsApp.`,
      };
    }
    if (sess.status !== "WORKING") {
      return {
        total: 0, enviados: 0, falhas: 0, invalidos: 0, detalhes: [],
        mensagem: "", mediaUrl: "", mediaType: "", textoAntes: cfg.textoAntes || "", textoDepois: cfg.textoDepois || "",
        aborted: true,
        error: `Sessão WhatsApp "${sess.session_name}" não está conectada (status atual: ${sess.status || "desconhecido"}). Envio abortado — reconecte em Canais → WhatsApp e execute novamente.`,
        session: { id: sess.id, nome: sess.session_name, status: sess.status },
      };
    }
  } catch (e) {
    console.warn("[broadcast] pre-check sessão falhou (seguindo mesmo assim):", e);
  }

  const _mediaVarName = (cfg.mediaVar || "last_generated_media_url").trim();

  let msg = "";
  let fraseTexto = "";
  let extraTexto = "";
  if (cfg.usarMensagemPreDefinida) {
    const varName = cfg.preDefinidaVar || "last_mensagem_pre_definida";
    fraseTexto = String(baseCtx[varName] ?? "").trim();
    extraTexto = interp(cfg.message || "", baseCtx).trim();
    msg = [fraseTexto, extraTexto].filter((s) => s && s.trim()).join("\n\n");
  } else {
    msg = interp(cfg.message || "", baseCtx);
    extraTexto = msg;
  }


  const _ft = cfg.filtroTipo || "todos";
  const modoEspecifico = _ft === "especifico";
  const modoEmpresasSegmento = _ft === "empresas_segmento";
  const somenteEmpresas = _ft === "empresas_com_gerente" || _ft === "empresas_gerente_especifico" || modoEmpresasSegmento
    || (modoEspecifico && cfg.especificoTipo !== "vendedor" && cfg.especificoTipo !== "gerente");
  const gerenteEspecificoAtivo = _ft === "gerente_especifico" || _ft === "empresas_gerente_especifico";

  type Dest = {
    kind: "vendedor" | "empresa";
    id: string; phone: string; nome: string;
    vendedorObj: any; empresaObj: any;
    gerente?: { id: string; nome: string; whatsapp?: string } | null;
  };
  const destinatarios: Dest[] = [];
  const gerentesMap = new Map<string, { id: string; nome: string; whatsapp?: string }>();
  const pushDestinatario = (dest: Dest) => {
    if (!dest.phone || dest.phone.replace(/\D/g, "").length < 10) return;
    const key = `${dest.kind}:${dest.id}:${dest.phone}`;
    if (destinatarios.some((d) => `${d.kind}:${d.id}:${d.phone}` === key)) return;
    destinatarios.push(dest);
  };

  // Vendedores
  if (!somenteEmpresas && !modoEspecifico && !modoEmpresasSegmento) {
    let q = supabase.from("empresas")
      .select("id, nome, nome_fantasia, whatsapp, telefone, segmento_id")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("tipo_cliente", "vendedor")
      .eq("ativo", true);
    if (_ft === "segmento" && cfg.segmentoId) q = q.eq("segmento_id", cfg.segmentoId);
    const { data: vendedores } = await q;
    let vs = vendedores || [];
    const ids = vs.map((v: any) => v.id);
    if (ids.length) {
      const { data: gv } = await supabase
        .from("empresa_vinculos")
        .select("vendedor_id, usuario_id, usuarios:usuario_id(id, nome, whatsapp)")
        .in("vendedor_id", ids)
        .not("usuario_id", "is", null);
      (gv || []).forEach((r: any) => {
        if (r.vendedor_id && r.usuarios?.id && !gerentesMap.has(r.vendedor_id)) {
          gerentesMap.set(r.vendedor_id, { id: r.usuarios.id, nome: r.usuarios.nome || "", whatsapp: r.usuarios.whatsapp });
        }
      });
    }

    if (_ft === "com_gerente") vs = vs.filter((v: any) => gerentesMap.has(v.id));
    if (_ft === "gerente_especifico" && cfg.gerenteId)
      vs = vs.filter((v: any) => gerentesMap.get(v.id)?.id === cfg.gerenteId);
    vs = vs.filter((v: any) => (v.whatsapp || v.telefone || "").replace(/\D/g, "").length >= 10);
    for (const v of vs) {
      const rawNome = v.nome_fantasia || v.nome || "";
      const cleanNome = rawNome.replace(/^\s*vendedor(a)?\s+/i, "").trim() || rawNome;
      pushDestinatario({
        kind: "vendedor", id: v.id,
        phone: (v.whatsapp || v.telefone || "").replace(/\D/g, ""),
        nome: cleanNome,
        vendedorObj: { nome: cleanNome, whatsapp: v.whatsapp || "", telefone: v.telefone || "" },
        empresaObj: {},
        gerente: gerentesMap.get(v.id) || null,
      });
    }
  }

  // Específico
  if (modoEspecifico && cfg.especificoAlvoId) {
    if (cfg.especificoTipo === "gerente") {
      const { data: u } = await supabase.from("usuarios").select("id, nome, whatsapp").eq("id", cfg.especificoAlvoId).maybeSingle();
      const phone = (u?.whatsapp || "").replace(/\D/g, "");
      if (u && phone.length >= 10) pushDestinatario({
        kind: "vendedor", id: u.id, phone, nome: u.nome || "",
        vendedorObj: { nome: u.nome || "", whatsapp: u.whatsapp || "" }, empresaObj: {},
        gerente: { id: u.id, nome: u.nome || "", whatsapp: u.whatsapp },
      });
    } else {
      const { data: e } = await supabase.from("empresas")
        .select("id, nome, nome_fantasia, whatsapp, telefone, email, cidade, estado, cnpj, tipo_cliente")
        .eq("id", cfg.especificoAlvoId).maybeSingle();
      const phone = ((e as any)?.whatsapp || (e as any)?.telefone || "").replace(/\D/g, "");
      if (e && phone.length >= 10) {
        const isVend = e.tipo_cliente === "vendedor";
        const rawNomeE = e.nome_fantasia || e.nome || "";
        const cleanNomeE = rawNomeE.replace(/^\s*vendedor(a)?\s+/i, "").trim() || rawNomeE;
        pushDestinatario({
          kind: isVend ? "vendedor" : "empresa", id: e.id, phone,
          nome: isVend ? cleanNomeE : rawNomeE,
          vendedorObj: isVend ? { nome: cleanNomeE, whatsapp: e.whatsapp || "" } : {},
          empresaObj: {
            nome: e.nome, nome_fantasia: e.nome_fantasia, whatsapp: e.whatsapp,
            telefone: e.telefone, email: e.email, cidade: e.cidade, uf: e.estado, cnpj: e.cnpj,
          },
          gerente: null,
        });
      }
    }
  }

  // Empresas por segmento
  if (modoEmpresasSegmento && cfg.segmentoId) {
    const publico = cfg.publicoEmpresas || "cliente";
    let qEmp = supabase.from("empresas")
      .select("id, nome, nome_fantasia, whatsapp, telefone, email, cidade, estado, cnpj, status_comercial")
      .eq("estabelecimento_id", estabelecimentoId)
      .eq("ativo", true)
      .neq("tipo_cliente", "vendedor")
      .eq("segmento_id", cfg.segmentoId);
    if (publico === "prospect") qEmp = qEmp.eq("status_comercial", "prospect");
    else if (publico === "cliente") qEmp = qEmp.neq("status_comercial", "prospect");
    const { data: emps } = await qEmp;
    (emps || []).forEach((e: any) => {
      const phone = (e.whatsapp || e.telefone || "").replace(/\D/g, "");
      if (phone.length < 10) return;
      pushDestinatario({
        kind: "empresa", id: e.id, phone,
        nome: e.nome_fantasia || e.nome || "",
        vendedorObj: {},
        empresaObj: { nome: e.nome, nome_fantasia: e.nome_fantasia, whatsapp: e.whatsapp, telefone: e.telefone, email: e.email, cidade: e.cidade, uf: e.estado, cnpj: e.cnpj },
        gerente: null,
      });
    });
  }

  // Empresas com gerente vinculado
  const incluirEmpresasVinculo = _ft === "empresas_com_gerente" || _ft === "empresas_gerente_especifico";
  if (incluirEmpresasVinculo) {
    const { data: vinc } = await supabase
      .from("empresa_vinculos")
      .select("empresa_id, usuario_id")
      .not("usuario_id", "is", null);
    const map = new Map<string, string>();
    (vinc || []).forEach((r: any) => {
      if (!r.empresa_id || !r.usuario_id) return;
      if (gerenteEspecificoAtivo && cfg.gerenteId && r.usuario_id !== cfg.gerenteId) return;
      if (!map.has(r.empresa_id)) map.set(r.empresa_id, r.usuario_id);
    });
    const empresaIds = Array.from(map.keys());
    if (empresaIds.length) {
      const publico = cfg.publicoEmpresas || "cliente";
      let qEmp = supabase.from("empresas")
        .select("id, nome, nome_fantasia, whatsapp, telefone, email, cidade, estado, cnpj, status_comercial")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativo", true)
        .in("id", empresaIds);
      if (publico === "prospect") qEmp = qEmp.eq("status_comercial", "prospect");
      else if (publico === "cliente") qEmp = qEmp.neq("status_comercial", "prospect");
      const { data: emps } = await qEmp;
      const gerIds = Array.from(new Set(Array.from(map.values())));
      const gerMap = new Map<string, any>();
      if (gerIds.length) {
        const { data: us } = await supabase.from("usuarios").select("id, nome, whatsapp").in("id", gerIds);
        (us || []).forEach((u: any) => gerMap.set(u.id, u));
      }
      (emps || []).forEach((e: any) => {
        const phone = (e.whatsapp || e.telefone || "").replace(/\D/g, "");
        if (phone.length < 10) return;
        const gid = map.get(e.id);
        const gu = gid ? gerMap.get(gid) : null;
        pushDestinatario({
          kind: "empresa", id: e.id, phone,
          nome: e.nome_fantasia || e.nome || "",
          vendedorObj: {},
          empresaObj: { nome: e.nome, nome_fantasia: e.nome_fantasia, whatsapp: e.whatsapp, telefone: e.telefone, email: e.email, cidade: e.cidade, uf: e.estado, cnpj: e.cnpj },
          gerente: gu ? { id: gu.id, nome: gu.nome || "", whatsapp: gu.whatsapp } : null,
        });
      });
    }
  }

  console.log("[broadcast] destinatários resolvidos:", destinatarios.length, destinatarios.map((d) => ({ nome: d.nome, phone: d.phone, kind: d.kind })).slice(0, 20));
  const total = destinatarios.length;
  const mediaUrlPre = cfg.usarMensagemPreDefinida
    ? String(baseCtx[_mediaVarName] || baseCtx.last_generated_media_url || "")
    : "";
  const mediaType = cfg.usarMensagemPreDefinida
    ? String(baseCtx.last_generated_media_type || "")
    : "";

  let enviados = 0, falhas = 0, invalidos = 0;

  // ===== Monitor de envios em tempo real =====
  let monitorId: string | null = null;
  try {
    const { data: mon } = await supabase.from("broadcast_monitor").insert({
      estabelecimento_id: estabelecimentoId,
      automation_id: automationId || null,
      bot_flow_id: botFlowId || null,
      origem,
      status: "executando",
      total,
      mensagem_base: (msg || "").slice(0, 4000),
    }).select("id").single();
    monitorId = mon?.id || null;
  } catch (e) {
    console.warn("[monitor] falha ao criar monitor:", e);
  }
  const monitorUpdate = async (patch: Record<string, unknown>) => {
    if (!monitorId) return;
    try {
      await supabase.from("broadcast_monitor")
        .update({ ...patch, atualizado_em: new Date().toISOString() })
        .eq("id", monitorId);
    } catch (_) { /* noop */ }
  };
  const monitorItemStart = async (ordem: number, d: any, mensagem: string): Promise<string | null> => {
    if (!monitorId) return null;
    try {
      const { data } = await supabase.from("broadcast_monitor_itens").insert({
        monitor_id: monitorId,
        estabelecimento_id: estabelecimentoId,
        ordem,
        nome: d.nome || null,
        telefone: d.phone || null,
        tipo: d.kind || null,
        status: "enviando",
        mensagem: (mensagem || "").slice(0, 4000),
      }).select("id").single();
      return data?.id || null;
    } catch (_) { return null; }
  };
  const monitorItemEnd = async (itemId: string | null, status: string, motivo: string | null) => {
    if (!itemId) return;
    try {
      await supabase.from("broadcast_monitor_itens")
        .update({ status, motivo, updated_at: new Date().toISOString() })
        .eq("id", itemId);
    } catch (_) { /* noop */ }
  };

  const detalhes: any[] = [];

  // Evita reenvio do mesmo cartão de contato para o mesmo destinatário (phone -> Set de telefones do contato já enviados).
  const contatoJaEnviado = new Map<string, Set<string>>();
  type ResumoItem = { nome: string; phone: string; tipo: string; ok: boolean; invalid?: boolean };
  const resumoPorGerente = new Map<string, { gerente: { id: string; nome: string; whatsapp?: string }; itens: ResumoItem[] }>();

  // Pausa entre etapas para garantir a ordem correta no WhatsApp (Baileys pode
  // inverter mensagens enviadas quase simultaneamente).
  const STEP_DELAY_MS = 1500;
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const invokeSend = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("send-agent-message", { body });
    const ok = !error && (data as any)?.success !== false;
    return {
      ok,
      data,
      error,
      invalid: !!(data as any)?.invalid_number,
      reason: error?.message || (data as any)?.reason || (data as any)?.error || null,
      providerStatus: (data as any)?.provider_status || null,
      messageId: (data as any)?.message_id || null,
      attempts: (data as any)?.attempts || null,
    };
  };
  // Envia uma etapa e aguarda a pausa antes de retornar, garantindo sequência.
  const sendStep = async (body: Record<string, unknown>) => {
    const r = await invokeSend(body);
    await sleep(STEP_DELAY_MS);
    return r;
  };


  // ===== Ritmo Humano (anti-bloqueio) =====
  const ritmo = await carregarRitmo(supabase, estabelecimentoId);
  const sessaoRitmo = String(cfg.whatsappSessionName || cfg.whatsappSessionId || "");
  let pulados = 0;
  let motivoRitmo: string | null = null;
  if (ritmo.ativo) {
    const bloqueio = foraDaJanela(ritmo);
    if (bloqueio) {
      console.warn("[ritmo]", bloqueio);
      await monitorUpdate({ status: "bloqueado", pulados: total, erro: bloqueio, finalizado_em: new Date().toISOString() });
      return {
        total, enviados: 0, falhas: 0, invalidos: 0, pulados: total, detalhes: [],
        mensagem: "", mediaUrl: "", mediaType: "",
        textoAntes: cfg.textoAntes || "", textoDepois: cfg.textoDepois || "",
        aborted: true,
        error: bloqueio,
        monitorId,
        ritmo: { bloqueado: true, motivo: bloqueio },
      } as any;
    }
    console.log("[ritmo] ativo:", JSON.stringify(ritmo));
  }

  const stripVendedorPrefix = (n: string) => (n || "").replace(/^\s*vendedor(a)?\s+/i, "").trim() || (n || "");
  let indiceRitmo = 0;
  let ordemEnvio = 0;
  for (const d of destinatarios) {
    if (ritmo.ativo) {
      if (indiceRitmo > 0) {
        await esperarLote(ritmo, indiceRitmo);
        await esperarEntreEnvios(ritmo);
      }
      const usados = await consumirCota(supabase, estabelecimentoId, sessaoRitmo);
      if (ritmo.limiteDiario > 0 && usados > ritmo.limiteDiario) {
        motivoRitmo = `Ritmo Humano: limite diário de ${ritmo.limiteDiario} mensagens atingido para esta linha.`;
        pulados = total - indiceRitmo;
        console.warn("[ritmo]", motivoRitmo);
        await monitorUpdate({ pulados, erro: motivoRitmo });
        break;
      }
      indiceRitmo++;
    }
    ordemEnvio++;
    const vObj = { ...(d.vendedorObj || {}) };
    if (vObj.nome) vObj.nome = stripVendedorPrefix(vObj.nome);
    const perCtx: any = {
      ...baseCtx,
      vendedor: vObj, empresa: d.empresaObj,
      gerente: {
        nome: d.gerente?.nome || cfg.fallbackNome || "",
        whatsapp: d.gerente?.whatsapp || cfg.fallbackWhatsapp || "",
      },
    };
    const antes = interp(cfg.textoAntes || "", perCtx).trim();
    const depois = interp(cfg.textoDepois || "", perCtx).trim();
    // Se há mídia com a frase pré-definida embutida na imagem/vídeo, NÃO reenvia a frase como texto.
    const msgInterp = variarTexto(
      (cfg.usarMensagemPreDefinida && mediaUrlPre)
        ? interp(extraTexto || "", perCtx)
        : interp(msg, perCtx),
      ritmo,
    );

    const mensagemMonitor = [antes, msgInterp, depois].filter((s) => s && s.trim()).join("\n\n");
    const monitorItemId = await monitorItemStart(ordemEnvio, d, mensagemMonitor);
    await monitorUpdate({ atual: ordemEnvio, atual_nome: d.nome || null, atual_telefone: d.phone || null });


    let ok = true;
    let invalid = false;
    let sendReason: string | null = null;
    let providerStatus: string | null = null;
    let messageId: string | null = null;
    let attempts: number | null = null;
    const startedAt = new Date().toISOString();
    try {
      if (antes) {
        const pre = await sendStep({
          estabelecimento_id: estabelecimentoId, telefone: d.phone, text: antes,
          whatsappSessionId: cfg.whatsappSessionId || null,
          whatsappSessionName: cfg.whatsappSessionName || null,
          botFlowId: botFlowId || null,
          origem: `${origem}_antes`,
        });
        providerStatus = pre.providerStatus || providerStatus;
        messageId = pre.messageId || messageId;
        attempts = pre.attempts || attempts;
        if (!pre.ok) {
          ok = false;
          invalid = pre.invalid;
          sendReason = pre.reason || "Falha ao confirmar envio do texto inicial";
        }
      }
      // Envia SEMPRE o texto (frase pré-definida) e a mídia como MENSAGENS SEPARADAS
      // (nunca como legenda), para respeitar a sequência: texto → imagem → texto → contato.
      if (ok && !invalid && msgInterp && msgInterp.trim()) {
        const rt = await sendStep({
          estabelecimento_id: estabelecimentoId, telefone: d.phone,
          text: msgInterp,
          whatsappSessionId: cfg.whatsappSessionId || null,
          whatsappSessionName: cfg.whatsappSessionName || null,
          botFlowId: botFlowId || null,
          origem: `${origem}_texto`,
        });
        ok = rt.ok;
        invalid = rt.invalid;
        sendReason = rt.reason;
        providerStatus = rt.providerStatus || providerStatus;
        messageId = rt.messageId || messageId;
        attempts = rt.attempts || attempts;
      }
      if (ok && !invalid && mediaUrlPre) {
        const rm = await sendStep({
          estabelecimento_id: estabelecimentoId, telefone: d.phone,
          fileUrl: mediaUrlPre,
          contentType: mediaType === "video" ? "video" : inferContentType(mediaUrlPre),
          whatsappSessionId: cfg.whatsappSessionId || null,
          whatsappSessionName: cfg.whatsappSessionName || null,
          botFlowId: botFlowId || null,
          origem: `${origem}_midia`,
        });
        ok = rm.ok;
        invalid = rm.invalid;
        sendReason = rm.reason;
        providerStatus = rm.providerStatus || providerStatus;
        messageId = rm.messageId || messageId;
        attempts = rm.attempts || attempts;
      }
      // ===== Texto DEPOIS — vem antes do card de contato =====
      if (ok && depois && !invalid) {
        const post = await sendStep({
          estabelecimento_id: estabelecimentoId, telefone: d.phone, text: depois,
          whatsappSessionId: cfg.whatsappSessionId || null,
          whatsappSessionName: cfg.whatsappSessionName || null,
          botFlowId: botFlowId || null,
          origem: `${origem}_depois`,
        });
        providerStatus = post.providerStatus || providerStatus;
        messageId = post.messageId || messageId;
        attempts = post.attempts || attempts;
        if (!post.ok) {
          ok = false;
          invalid = post.invalid;
          sendReason = post.reason || "Falha ao confirmar envio do texto final";
        }
      }
      // ===== Contato — cartão do gerente vem POR ÚLTIMO (após "texto depois") =====
      const enviarContato = !!(cfg.enviarContato || cfg.enviarContatoGerente);
      if (ok && !invalid && enviarContato) {
        const contatoTipo = cfg.contatoTipo || "gerente_do_vendedor";
        let cNome = "";
        let cPhone = "";
        if (contatoTipo === "fixo") {
          cNome = cfg.contatoNome || "Contato";
          cPhone = String(cfg.contatoWhatsapp || "").replace(/\D/g, "");
        } else {
          cNome = d.gerente?.nome || cfg.fallbackNome || "Gerente";
          cPhone = String(d.gerente?.whatsapp || cfg.fallbackWhatsapp || "").replace(/\D/g, "");
        }
        if (cPhone) {
          const jaSet = contatoJaEnviado.get(d.phone) || new Set<string>();
          if (jaSet.has(cPhone)) {
            console.log("[broadcast] contato duplicado ignorado p/", d.phone, "->", cPhone);
          } else {
            const contato = await sendStep({
              estabelecimento_id: estabelecimentoId, telefone: d.phone,
              contact: { nome: cNome, whatsapp: cPhone },
              whatsappSessionId: cfg.whatsappSessionId || null,
              whatsappSessionName: cfg.whatsappSessionName || null,
              botFlowId: botFlowId || null,
              origem: `${origem}_contato`,
            });
            jaSet.add(cPhone);
            contatoJaEnviado.set(d.phone, jaSet);
            providerStatus = contato.providerStatus || providerStatus;
            if (!contato.ok) {
              ok = false;
              invalid = contato.invalid;
              sendReason = contato.reason || "Falha ao confirmar envio do contato";
              console.warn("[broadcast] falha enviar contato p/", d.phone, sendReason);
            }
          }
        } else {
          console.warn("[broadcast] contato pulado — sem telefone (tipo:", contatoTipo, ")");
        }
      }

    } catch (e) {
      console.warn("[broadcast] erro no envio destinatário:", d.phone, e);
      ok = false;
      sendReason = sendReason || (e instanceof Error ? e.message : String(e));
    }
    if (invalid) invalidos++;
    if (ok) enviados++; else falhas++;
    const motivoFinal = ok ? null : (sendReason || (invalid ? "WhatsApp inválido/inexistente" : "Falha ao enviar (verifique sessão Evolution)"));
    const finishedAt = new Date().toISOString();
    detalhes.push({
      nome: d.nome, phone: d.phone, kind: d.kind,
      ok, invalid, motivo: motivoFinal, reason: motivoFinal,
      providerStatus, messageId, attempts,
      startedAt, finishedAt,
    });
    await monitorItemEnd(monitorItemId, invalid ? "invalido" : (ok ? "enviado" : "falha"), motivoFinal);
    await monitorUpdate({ enviados, falhas, invalidos });
    if (d.gerente?.id) {
      const key = d.gerente.id;
      if (!resumoPorGerente.has(key)) resumoPorGerente.set(key, { gerente: d.gerente, itens: [] });
      resumoPorGerente.get(key)!.itens.push({ nome: d.nome || d.phone, phone: d.phone, tipo: d.kind, ok, invalid });
    }
  }

  // ===== Resumo ao(s) gerente(s) e números extras =====
  try {
    const numerosExtras: string[] = String(cfg.resumoNumerosExtras || "")
      .split(/[\n,;]+/).map((n: string) => n.replace(/\D/g, "")).filter((n: string) => n.length >= 10);
    const temResumoGerente = cfg.enviarResumoGerente !== false && resumoPorGerente.size > 0;
    if (temResumoGerente || numerosExtras.length > 0) {
      const agora = new Date();
      const dataStr = agora.toLocaleDateString("pt-BR");
      const horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      const maskVars = (s: string) => (s || "").replace(/\{\{[^}]+\}\}/g, "XXX");
      const antesMask = maskVars(cfg.textoAntes || "").trim();
      const depoisMask = maskVars(cfg.textoDepois || "").trim();
      // Quando há mídia com frase embutida, o resumo também não repete o texto da frase.
      const msgMask = cfg.usarMensagemPreDefinida
        ? (mediaUrlPre ? maskVars(extraTexto || "").trim() : msg)
        : maskVars(cfg.message || "").trim();
      const cabecalho = `📋 *Mensagem enviadas pelo sistema automatico de mensagem:* ${dataStr} ${horaStr}`;

      // Contato usado no resumo (mesma opção do "Enviar contato logo após a mensagem")
      const enviarContatoResumo = !!(cfg.enviarContato || cfg.enviarContatoGerente);
      let contatoResumoNome = "";
      let contatoResumoPhone = "";
      if (enviarContatoResumo) {
        const contatoTipo = cfg.contatoTipo || "gerente_do_vendedor";
        if (contatoTipo === "fixo") {
          contatoResumoNome = cfg.contatoNome || "Contato";
          contatoResumoPhone = String(cfg.contatoWhatsapp || "").replace(/\D/g, "");
        } else {
          contatoResumoNome = cfg.fallbackNome || "Gerente";
          contatoResumoPhone = String(cfg.fallbackWhatsapp || "").replace(/\D/g, "");
        }
      }

      const buildEstatisticas = (itens: ResumoItem[]) => {
        const okItens = itens.filter((i) => i.ok && !i.invalid);
        const inv = itens.filter((i) => i.invalid);
        const fail = itens.filter((i) => !i.ok && !i.invalid);
        const fmt = (arr: ResumoItem[]) => arr.map((it, i) => `${i + 1}. ${it.nome} — ${it.phone}`).join("\n") || "(nenhum)";
        return `📊 *Estatísticas do envio*\n— *Entregues (${okItens.length})* —\n${fmt(okItens)}` +
          (inv.length ? `\n\n⚠️ *WhatsApp inválido/inexistente (${inv.length})*:\n${fmt(inv)}` : "") +
          (fail.length ? `\n\n❌ *Falhas de envio (${fail.length})*\n${fmt(fail)}` : "");
      };

      // Envia o resumo respeitando a MESMA SEQUÊNCIA dos destinatários:
      // cabeçalho → antes (XXX) → mensagem [+mídia] → contato → depois (XXX) → estatísticas
      const enviarResumo = async (telefone: string, itens: ResumoItem[], origemResumo: string) => {
        console.log("[broadcast] enviando resumo p/", telefone, "origem:", origemResumo);
        try {
          const rCab = await sendStep({
            estabelecimento_id: estabelecimentoId, telefone, text: cabecalho,
            whatsappSessionId: cfg.whatsappSessionId || null,
            whatsappSessionName: cfg.whatsappSessionName || null,
            botFlowId: botFlowId || null,
            origem: origemResumo,
          });
          if (!rCab.ok) { console.warn("[broadcast] falha cabecalho resumo:", telefone, rCab.reason); return; }

          if (antesMask) {
            const rA = await sendStep({
              estabelecimento_id: estabelecimentoId, telefone, text: antesMask,
              whatsappSessionId: cfg.whatsappSessionId || null,
              whatsappSessionName: cfg.whatsappSessionName || null,
              botFlowId: botFlowId || null,
              origem: `${origemResumo}_antes`,
            });
            if (!rA.ok) { console.warn("[broadcast] falha antes resumo:", telefone, rA.reason); return; }
          }
          if (msgMask && msgMask.trim()) {
            const rM = await sendStep({
              estabelecimento_id: estabelecimentoId, telefone, text: msgMask,
              whatsappSessionId: cfg.whatsappSessionId || null,
              whatsappSessionName: cfg.whatsappSessionName || null,
              botFlowId: botFlowId || null,
              origem: `${origemResumo}_msg`,
            });
            if (!rM.ok) { console.warn("[broadcast] falha msg resumo:", telefone, rM.reason); return; }
          }
          if (mediaUrlPre) {
            const rmid = await sendStep({
              estabelecimento_id: estabelecimentoId, telefone,
              fileUrl: mediaUrlPre,
              contentType: mediaType === "video" ? "video" : inferContentType(mediaUrlPre),
              whatsappSessionId: cfg.whatsappSessionId || null,
              whatsappSessionName: cfg.whatsappSessionName || null,
              botFlowId: botFlowId || null,
              origem: `${origemResumo}_midia`,
            });
            if (!rmid.ok) { console.warn("[broadcast] falha midia resumo:", telefone, rmid.reason); return; }
          }
          if (depoisMask) {
            const rd = await sendStep({
              estabelecimento_id: estabelecimentoId, telefone, text: depoisMask,
              whatsappSessionId: cfg.whatsappSessionId || null,
              whatsappSessionName: cfg.whatsappSessionName || null,
              botFlowId: botFlowId || null,
              origem: `${origemResumo}_depois`,
            });
            if (!rd.ok) { console.warn("[broadcast] falha depois resumo:", telefone, rd.reason); return; }
          }
          if (enviarContatoResumo && contatoResumoPhone) {
            const rc = await sendStep({
              estabelecimento_id: estabelecimentoId, telefone,
              contact: { nome: contatoResumoNome || "XXX", whatsapp: contatoResumoPhone },
              whatsappSessionId: cfg.whatsappSessionId || null,
              whatsappSessionName: cfg.whatsappSessionName || null,
              botFlowId: botFlowId || null,
              origem: `${origemResumo}_contato`,
            });
            if (!rc.ok) { console.warn("[broadcast] falha contato resumo:", telefone, rc.reason); return; }
          }
          const rs = await sendStep({
            estabelecimento_id: estabelecimentoId, telefone, text: buildEstatisticas(itens),
            whatsappSessionId: cfg.whatsappSessionId || null,
            whatsappSessionName: cfg.whatsappSessionName || null,
            botFlowId: botFlowId || null,
            origem: `${origemResumo}_stats`,
          });
          if (!rs.ok) console.warn("[broadcast] falha stats resumo:", telefone, rs.reason);
        } catch (err) {
          console.warn("[executar-bot-flow] falha ao enviar resumo p/", telefone, ":", err);
        }
      };

      console.log("[broadcast] resumo — gerentes:", resumoPorGerente.size, "extras:", numerosExtras.length, "raw:", cfg.resumoNumerosExtras);
      // Rastreia telefones que já receberam o resumo, para deduplicar extras vs gerentes.
      const resumoEnviadoPara = new Set<string>();
      if (temResumoGerente) {
        for (const [, entry] of resumoPorGerente) {
          const gPhone = String(entry.gerente.whatsapp || "").replace(/\D/g, "");
          if (!gPhone) { console.warn("[broadcast] gerente sem whatsapp:", entry.gerente); continue; }
          if (resumoEnviadoPara.has(gPhone)) continue;
          resumoEnviadoPara.add(gPhone);
          await enviarResumo(gPhone, entry.itens, "broadcast_vendedores_resumo");
        }
      }
      if (numerosExtras.length > 0) {
        const todos: ResumoItem[] = [];
        for (const [, entry] of resumoPorGerente) todos.push(...entry.itens);
        const jaTem = new Set(todos.map((i) => i.phone));
        for (const d of destinatarios) {
          if (!jaTem.has(d.phone)) todos.push({ nome: d.nome || d.phone, phone: d.phone, tipo: d.kind, ok: true });
        }
        for (const numero of numerosExtras) {
          if (resumoEnviadoPara.has(numero)) {
            console.log("[broadcast] extra duplicado (já enviado como gerente), pulando:", numero);
            continue;
          }
          resumoEnviadoPara.add(numero);
          await enviarResumo(numero, todos, "broadcast_vendedores_resumo_extra");
        }
      }

    }

  } catch (err) {
    console.warn("[executar-bot-flow] erro no envio de resumo:", err);
  }

  await monitorUpdate({
    status: falhas > 0 ? (enviados > 0 ? "parcial" : "falha") : "concluido",
    enviados, falhas, invalidos, pulados,
    finalizado_em: new Date().toISOString(),
  });

  return {
    total, enviados, falhas, invalidos, detalhes,
    pulados, ritmo: ritmo.ativo ? { ativo: true, motivo: motivoRitmo, sessao: sessaoRitmo } : { ativo: false },
    mensagem: msg, mediaUrl: mediaUrlPre, mediaType,
    monitorId,
    textoAntes: cfg.textoAntes || "", textoDepois: cfg.textoDepois || "",
  };
}
