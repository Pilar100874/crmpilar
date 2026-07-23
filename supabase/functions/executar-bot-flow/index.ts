import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

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

  const trace: any[] = [];
  try {
    const body = await req.json();
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

    let current = findStart(nodes);
    if (!current) throw new Error("Nó de início não encontrado");

    let steps = 0;
    while (current && steps++ < 200) {
      const t = nodeType(current);
      const cfg = current.data?.config || {};
      let handle: string | undefined;
      trace.push({ node: current.id, type: t, label: current.data?.label });

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
            const frase = (data as any)?.frase?.frase;
            if (frase) {
              ctx.last_mensagem_pre_definida = frase;
              if (cfg.outputVariable) ctx[cfg.outputVariable] = frase;

              if ((cfg.apresentacao || "texto") === "midia") {
                try {
                  const mediaType = cfg.mediaType === "video" ? "video" : "image";
                  const variations = Math.max(1, Math.min(6, cfg.variations || 1));
                  const { data: gen } = await supabase.functions.invoke("bot-generate-ai-media", {
                    body: {
                      prompt: `Crie uma peça de ${mediaType === "video" ? "vídeo curto" : "imagem"} destacando o texto: "${frase}"`,
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
        } else {
          trace.push({ node: current.id, warn: "tipo ignorado (não implementado no executor server)", type: t });
        }
      } catch (e) {
        trace.push({ node: current.id, error: String(e) });
      }

      current = nextNode(nodes, edges, current.id, handle);
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
});

// ---------- Broadcast (Envio em massa) ----------
async function executeBroadcast(
  supabase: any,
  estabelecimentoId: string,
  cfg: any,
  baseCtx: Record<string, any>,
  origem: string,
  botFlowId?: string,
) {
  const _mediaVarName = (cfg.mediaVar || "last_generated_media_url").trim();
  const preTemMidia = !!cfg.usarMensagemPreDefinida
    && !!String(baseCtx[_mediaVarName] || baseCtx.last_generated_media_url || "").trim();

  let msg = "";
  if (cfg.usarMensagemPreDefinida) {
    const varName = cfg.preDefinidaVar || "last_mensagem_pre_definida";
    const fromVar = preTemMidia ? "" : String(baseCtx[varName] ?? "");
    const extra = interp(cfg.message || "", baseCtx);
    msg = [fromVar, extra].filter((s) => s && s.trim()).join("\n");
  } else {
    msg = interp(cfg.message || "", baseCtx);
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
        .select("empresa_id, usuario_id, usuarios:usuario_id(id, nome, whatsapp)")
        .in("empresa_id", ids)
        .not("usuario_id", "is", null);
      (gv || []).forEach((r: any) => {
        if (r.usuarios?.id && !gerentesMap.has(r.empresa_id)) {
          gerentesMap.set(r.empresa_id, { id: r.usuarios.id, nome: r.usuarios.nome || "", whatsapp: r.usuarios.whatsapp });
        }
      });
    }
    if (_ft === "com_gerente") vs = vs.filter((v: any) => gerentesMap.has(v.id));
    if (_ft === "gerente_especifico" && cfg.gerenteId)
      vs = vs.filter((v: any) => gerentesMap.get(v.id)?.id === cfg.gerenteId);
    vs = vs.filter((v: any) => (v.whatsapp || v.telefone || "").replace(/\D/g, "").length >= 10);
    for (const v of vs) {
      destinatarios.push({
        kind: "vendedor", id: v.id,
        phone: (v.whatsapp || v.telefone || "").replace(/\D/g, ""),
        nome: v.nome_fantasia || v.nome || "",
        vendedorObj: { nome: v.nome_fantasia || v.nome || "", whatsapp: v.whatsapp || "", telefone: v.telefone || "" },
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
      if (u && phone.length >= 10) destinatarios.push({
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
        destinatarios.push({
          kind: isVend ? "vendedor" : "empresa", id: e.id, phone,
          nome: e.nome_fantasia || e.nome || "",
          vendedorObj: isVend ? { nome: e.nome_fantasia || e.nome || "", whatsapp: e.whatsapp || "" } : {},
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
      destinatarios.push({
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
        destinatarios.push({
          kind: "empresa", id: e.id, phone,
          nome: e.nome_fantasia || e.nome || "",
          vendedorObj: {},
          empresaObj: { nome: e.nome, nome_fantasia: e.nome_fantasia, whatsapp: e.whatsapp, telefone: e.telefone, email: e.email, cidade: e.cidade, uf: e.estado, cnpj: e.cnpj },
          gerente: gu ? { id: gu.id, nome: gu.nome || "", whatsapp: gu.whatsapp } : null,
        });
      });
    }
  }

  const total = destinatarios.length;
  const mediaUrlPre = cfg.usarMensagemPreDefinida
    ? String(baseCtx[_mediaVarName] || baseCtx.last_generated_media_url || "")
    : "";
  const mediaType = cfg.usarMensagemPreDefinida
    ? String(baseCtx.last_generated_media_type || "")
    : "";

  let enviados = 0, falhas = 0, invalidos = 0;
  const detalhes: any[] = [];

  for (const d of destinatarios) {
    const perCtx: any = {
      ...baseCtx,
      vendedor: d.vendedorObj, empresa: d.empresaObj,
      gerente: {
        nome: d.gerente?.nome || cfg.fallbackNome || "",
        whatsapp: d.gerente?.whatsapp || cfg.fallbackWhatsapp || "",
      },
    };
    const antes = interp(cfg.textoAntes || "", perCtx).trim();
    const depois = interp(cfg.textoDepois || "", perCtx).trim();
    const msgInterp = interp(msg, perCtx);

    let ok = true;
    let invalid = false;
    try {
      if (antes) {
        await supabase.functions.invoke("send-agent-message", {
          body: {
            estabelecimento_id: estabelecimentoId, telefone: d.phone, text: antes,
            whatsappSessionId: cfg.whatsappSessionId || null,
            whatsappSessionName: cfg.whatsappSessionName || null,
            botFlowId: botFlowId || null,
            origem: `${origem}_antes`,
          },
        });
      }
      const { data: r, error: rErr } = await supabase.functions.invoke("send-agent-message", {
        body: {
          estabelecimento_id: estabelecimentoId, telefone: d.phone,
          text: msgInterp || undefined,
          caption: mediaUrlPre ? msgInterp : undefined,
          fileUrl: mediaUrlPre || undefined,
          contentType: mediaUrlPre ? (mediaType === "video" ? "video" : inferContentType(mediaUrlPre)) : undefined,
          whatsappSessionId: cfg.whatsappSessionId || null,
          whatsappSessionName: cfg.whatsappSessionName || null,
          botFlowId: botFlowId || null,
          origem,
        },
      });
      ok = !rErr && (r as any)?.success !== false;
      invalid = !!(r as any)?.invalid_number;
      if (depois && !invalid) {
        await supabase.functions.invoke("send-agent-message", {
          body: {
            estabelecimento_id: estabelecimentoId, telefone: d.phone, text: depois,
            whatsappSessionId: cfg.whatsappSessionId || null,
            whatsappSessionName: cfg.whatsappSessionName || null,
            botFlowId: botFlowId || null,
            origem: `${origem}_depois`,
          },
        });
      }
      if (d.gerente?.whatsapp && cfg.enviarContatoGerente) {
        const gPhone = String(d.gerente.whatsapp).replace(/\D/g, "");
        if (gPhone) {
          await supabase.functions.invoke("send-agent-message", {
            body: {
              estabelecimento_id: estabelecimentoId, telefone: d.phone,
              contact: { nome: d.gerente.nome || "Gerente", whatsapp: gPhone },
              whatsappSessionId: cfg.whatsappSessionId || null,
              whatsappSessionName: cfg.whatsappSessionName || null,
              botFlowId: botFlowId || null,
              origem: `${origem}_contato`,
            },
          });
        }
      }
    } catch (e) {
      ok = false;
    }
    if (invalid) invalidos++;
    if (ok) enviados++; else falhas++;
    detalhes.push({ nome: d.nome, phone: d.phone, kind: d.kind, ok, invalid });
  }

  return { total, enviados, falhas, invalidos, detalhes };
}
