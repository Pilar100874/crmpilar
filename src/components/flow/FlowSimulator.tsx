import { useState, useEffect, useRef } from "react";
import { Node, Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, RotateCcw, User, Bot, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { validateEmail, validatePhone, validatePhoneFormat } from "@/lib/validators";
import { maskCNPJ } from "@/lib/masks";
import { BLOCK_DEFINITIONS } from "@/types/flow";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Message {
  id: string;
  sender: "user" | "bot" | "system" | "success";
  text: string;
  timestamp: Date;
  nodeId?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";
  buttons?: Array<{ text: string; value: string; buttonId?: string }>;
  isListButton?: boolean;
  listButtonText?: string;
  listSections?: Array<{ title: string; items: Array<{ label: string; value: string; description?: string }> }>;
}

interface FlowSimulatorProps {
  nodes: Node[];
  edges: Edge[];
  onHighlightNode?: (nodeId: string | null) => void;
  breakpointNodes?: Set<string>;
  skipNodes?: Set<string>;
  onContextChange?: (context: Record<string, any>) => void;
  channel?: "whatsapp" | "facebook" | "instagram" | "telegram" | "webchat";
}

export const FlowSimulator = ({ nodes, edges, onHighlightNode, breakpointNodes = new Set(), skipNodes = new Set(), onContextChange, channel = "whatsapp" }: FlowSimulatorProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [context, setContext] = useState<Record<string, any>>({});
  const [isWaitingInput, setIsWaitingInput] = useState(false);
  const [pendingVariable, setPendingVariable] = useState<string | null>(null);
  const [currentBlockType, setCurrentBlockType] = useState<string | null>(null);
  const [expandedListId, setExpandedListId] = useState<string | null>(null);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const contextRef = useRef<Record<string, any>>({});
  const simNodeStateRef = useRef<Record<string, any>>({});
  const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  // Configurações visuais por canal
  const getChannelStyles = () => {
    const styles = {
      whatsapp: {
        bg: "bg-[#ECE5DD]",
        userBubble: "bg-[#DCF8C6]",
        botBubble: "bg-white",
        headerBg: "bg-[#075E54]",
        headerText: "text-white",
        name: "WhatsApp",
        icon: "💬"
      },
      facebook: {
        bg: "bg-white",
        userBubble: "bg-[#0084FF]",
        botBubble: "bg-[#F0F0F0]",
        headerBg: "bg-[#0084FF]",
        headerText: "text-white",
        name: "Facebook Messenger",
        icon: "💬"
      },
      instagram: {
        bg: "bg-white",
        userBubble: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
        botBubble: "bg-[#EFEFEF]",
        headerBg: "bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]",
        headerText: "text-white",
        name: "Instagram Direct",
        icon: "📷"
      },
      telegram: {
        bg: "bg-[#0E1621]",
        userBubble: "bg-[#3390EC] text-white",
        botBubble: "bg-[#212D3B] text-white",
        headerBg: "bg-[#2B5278]",
        headerText: "text-white",
        name: "Telegram",
        icon: "✈️"
      },
      webchat: {
        bg: "bg-white",
        userBubble: "bg-gradient-primary",
        botBubble: "bg-muted",
        headerBg: "bg-gradient-primary",
        headerText: "text-white",
        name: "WebChat",
        icon: "🌐"
      }
    };
    return styles[channel];
  };

  const channelStyle = getChannelStyles();

  useEffect(() => {
    // Garantir que isActive está true quando o componente monta
    setIsActive(true);
    handleReset();
    
    return () => {
      // Cleanup quando desmonta
      setIsActive(false);
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current = [];
      onHighlightNode?.(null);
    };
  }, []);

  useEffect(() => {
    if (currentNodeId) {
      onHighlightNode?.(currentNodeId);
    }
  }, [currentNodeId, onHighlightNode]);

  useEffect(() => {
    contextRef.current = context;
    onContextChange?.(context);
  }, [context, onContextChange]);

  const safeSetTimeout = (callback: () => void, delay: number) => {
    const timeout = setTimeout(() => {
      if (isActive) {
        callback();
      }
    }, delay);
    timeoutsRef.current.push(timeout);
    return timeout;
  };

  const formatText = (text: string) => {
    if (!text) return null;
    
    const parts: JSX.Element[] = [];
    let lastIndex = 0;
    let key = 0;

    // Regex para detectar formatações: *negrito*, _itálico_, ~tachado~, ```código```
    const regex = /(\*([^*]+)\*)|(_([^_]+)_)|(~([^~]+)~)|(```([^`]+)```)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      // Adiciona texto antes da formatação
      if (match.index > lastIndex) {
        parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex, match.index)}</span>);
      }

      // Identifica o tipo de formatação
      if (match[1]) {
        // Negrito: *texto*
        parts.push(<strong key={`bold-${key++}`}>{match[2]}</strong>);
      } else if (match[3]) {
        // Itálico: _texto_
        parts.push(<em key={`italic-${key++}`}>{match[4]}</em>);
      } else if (match[5]) {
        // Tachado: ~texto~
        parts.push(<span key={`strike-${key++}`} className="line-through">{match[6]}</span>);
      } else if (match[7]) {
        // Código: ```texto```
        parts.push(
          <code key={`code-${key++}`} className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
            {match[8]}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    // Adiciona texto restante
    if (lastIndex < text.length) {
      parts.push(<span key={`text-${key++}`}>{text.substring(lastIndex)}</span>);
    }

    return parts.length > 0 ? parts : text;
  };

  const interpolateVariables = (text: string, ctx?: Record<string, any>): string => {
    if (!text) return "";
    const primary = ctx || {};
    const fallback = contextRef.current || {};
    console.log("🔄 Interpolating variables in text:", text);
    console.log("📦 Provided context:", primary);
    console.log("📦 Fallback (latest) context:", fallback);
    
    const result = text.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
      const cleanVar = variable.trim();
      const varWithoutAt = cleanVar.replace(/^@/, "");
      const value =
        primary[cleanVar] ??
        primary[varWithoutAt] ??
        fallback[cleanVar] ??
        fallback[varWithoutAt];
      
      console.log(`🔍 Lookup: "${cleanVar}" →`, value !== undefined ? value : "NOT FOUND");
      
      return value !== undefined ? String(value) : match;
    });
    
    console.log("✅ Interpolation result:", result);
    return result;
  };

  const normalizeVarName = (name?: string | null): string => {
    if (!name) return "";
    return name.trim().replace(/^@/, "").replace(/^\{\{\s*/, "").replace(/\s*\}\}$/, "");
  };

  const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Falha ao ler imagem"));
    reader.readAsDataURL(file);
  });

  const uploadSimulatorReferenceImage = async (file: File): Promise<string> => {
    const safeExt = (file.name.split(".").pop() || "jpg").replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const path = `simulator-references/${Date.now()}_${Math.random().toString(36).slice(2)}.${safeExt}`;
    const { error } = await supabase.storage
      .from("marketing-images")
      .upload(path, file, { contentType: file.type || "image/jpeg", upsert: true });

    if (!error) {
      const { data } = supabase.storage.from("marketing-images").getPublicUrl(path);
      if (data.publicUrl) return data.publicUrl;
    }

    console.warn("Falha ao enviar referência para storage, usando data URL:", error?.message);
    return readFileAsDataUrl(file);
  };

  const evaluateExpression = (expression: string, context: Record<string, any>): boolean => {
    try {
      const interpolated = interpolateVariables(expression, context);
      // Avaliação básica de expressões
      // eslint-disable-next-line no-eval
      return eval(interpolated);
    } catch {
      return false;
    }
  };

  const findStartNode = () => {
    return nodes.find((node) => {
      const nodeData = node.data as any;
      return nodeData.type === "start";
    });
  };

  const getNextNode = (currentId: string, conditionIndex?: number) => {
    const outgoingEdges = edges.filter((edge) => edge.source === currentId);
    
    if (outgoingEdges.length === 0) return null;
    
    // Se houver índice de condição, tenta encontrar a edge específica
    if (conditionIndex !== undefined && outgoingEdges[conditionIndex]) {
      const nextEdge = outgoingEdges[conditionIndex];
      return nodes.find((node) => node.id === nextEdge.target);
    }
    
    // Caso contrário, pega a primeira
    const nextEdge = outgoingEdges[0];
    return nodes.find((node) => node.id === nextEdge.target);
  };

  const runProductSearch = async (node: Node, query: string) => {
    const config = (node.data as any).config || {};
    const limit = Math.max(1, Math.min(10, parseInt(config.limit) || 5));
    addSystemMessage(`🔍 Buscando "${query}" no catálogo...`);
    try {
      const estId = await getEstabelecimentoId();
      let q = supabase.from("produtos").select("id,nome,codigo,foto_url").eq("ativo", true).ilike("nome", `%${query}%`).limit(limit);
      if (estId) q = q.eq("estabelecimento_id", estId);
      const { data: produtos, error } = await q;
      if (error) throw error;
      if (!produtos || produtos.length === 0) {
        addSystemMessage(interpolateVariables(config.notFoundMessage || "Nenhum produto encontrado.", context));
        addBotMessage(interpolateVariables(config.askText || "Qual produto?", context), node.id);
        setIsWaitingInput(true);
        setCurrentBlockType("product_search_query");
        setPendingVariable(`__psq_${node.id}`);
        setCurrentNodeId(node.id);
        return;
      }
      produtos.forEach((p: any, i: number) => {
        const caption = `${i + 1}. ${p.nome}${p.codigo ? ` (${p.codigo})` : ""}`;
        if (p.foto_url) addBotMediaMessage(p.foto_url, "image", caption, node.id);
        else addBotMessage(`${caption}\n(sem imagem)`, node.id);
      });
      addBotMessage(interpolateVariables(config.selectionPrompt || "Responda com o número do produto desejado:", context), node.id);
      simNodeStateRef.current[node.id] = { candidates: produtos };
      setIsWaitingInput(true);
      setCurrentBlockType("product_search_select");
      setPendingVariable(`__pss_${node.id}`);
      setCurrentNodeId(node.id);
    } catch (e: any) {
      addSystemMessage(`❌ Erro ao buscar produtos: ${e?.message || e}`);
    }
  };

  const runAIMediaGeneration = async (node: Node, prompt: string, userRefImageUrl?: string | null) => {
    const config = (node.data as any).config || {};
    const variations = Math.max(1, Math.min(6, parseInt(config.variations) || 4));
    const userPrompt = interpolateVariables(prompt || config.basePrompt || "criativo", contextRef.current).trim();
    const basePrompt = interpolateVariables(config.basePrompt || "", contextRef.current).trim();
    const imageRefSource = config.imageRefSource || "user";
    const imageAspectRatio = config.aspectRatio || (config.preset === "story_vertical" ? "9:16" : "1:1");

    // Resolve reference image(s) — coleta TODAS (produto + influencer + logo + extras)
    // para compor uma única cena. Ordem: produto (#1), influencer (#2), logo, demais.
    let refImageUrl: string | null = userRefImageUrl || null;
    let primaryRefKey: string = userRefImageUrl ? "usuario" : "";
    const extraRefs: Array<{ key: string; url: string }> = [];

    const _styleSourceForRefs = config.styleSource || "visual_identity";
    if (_styleSourceForRefs === "preset" && config.referenceInputs && typeof config.referenceInputs === "object") {
      const refInputs = config.referenceInputs as Record<string, any>;
      const orderedKeys = [
        "productImageSelect",
        "galleryInfluencer",
        "galleryLogo",
        ...Object.keys(refInputs),
      ];
      const seen = new Set<string>();
      for (const key of orderedKeys) {
        if (seen.has(key)) continue;
        seen.add(key);
        const r = refInputs[key];
        if (!r || !r.mode) continue;
        let val: string | null = null;
        let label = "";
        if (r.mode === "variable" && r.variable) {
          const varName = normalizeVarName(r.variable);
          const raw = (contextRef.current as any)?.[varName];
          if (raw && typeof raw === "string") val = interpolateVariables(raw, contextRef.current);
          else if (raw && typeof raw === "object" && raw.foto_url) val = raw.foto_url;
          label = `${key} via {{${varName}}}`;
          if (!val) addSystemMessage(`⚠️ Variável {{${varName}}} (${key}) vazia — ignorando.`);
        } else if (r.mode === "gallery" && r.galleryUrl) {
          val = r.galleryUrl;
          label = `${key} da galeria${r.galleryName ? ` (${r.galleryName})` : ""}`;
        }
        if (!val) continue;
        if (!refImageUrl) {
          refImageUrl = val;
          primaryRefKey = key;
          addSystemMessage(`🖼️ Referência principal: ${label}`);
          addBotMediaMessage(refImageUrl, "image", "Referência principal", node.id);
        } else if (!extraRefs.some((e) => e.url === val) && val !== refImageUrl) {
          extraRefs.push({ key, url: val });
          addSystemMessage(`➕ Referência adicional: ${label}`);
          addBotMediaMessage(val, "image", `Referência (${key})`, node.id);
        }
      }
    }

    // Legacy: imageRefSource/imageRefVariable
    if (!refImageUrl && config.acceptImageRef && (imageRefSource === "variable" || imageRefSource === "both")) {
      const varName = normalizeVarName(config.imageRefVariable || "produto_imagem_url");
      const raw = (contextRef.current as any)?.[varName];
      if (raw && typeof raw === "string") {
        refImageUrl = interpolateVariables(raw, contextRef.current);
      } else if (raw && typeof raw === "object" && raw.foto_url) {
        refImageUrl = raw.foto_url;
      }
      if (refImageUrl) {
        addSystemMessage(`🖼️ Usando imagem de referência da variável {{${varName}}}`);
        addBotMediaMessage(refImageUrl, "image", "Referência", node.id);
      } else if (imageRefSource === "variable") {
        addSystemMessage(`⚠️ Variável {{${varName}}} vazia — gerando sem imagem de referência.`);
      }
    }

    const styleSource = config.styleSource || "visual_identity";
    const styleLabel = styleSource === "visual_identity"
      ? "Identidade Visual da marca"
      : (styleSource === "preset" && config.preset ? `preset "${config.preset}"` : "estilo padrão");

    const mediaType: "image" | "video" = (config.mediaType === "video") ? "video" : "image";

    // ============== VIDEO GENERATION PATH ==============
    if (mediaType === "video") {
      const allRefs = [
        ...(refImageUrl ? [{ key: primaryRefKey || "principal", url: refImageUrl }] : []),
        ...extraRefs,
      ];
      const roleFor = (key: string): string => {
        const k = (key || "").toLowerCase();
        if (k.includes("product")) return "PRODUCT";
        if (k.includes("influencer") || k.includes("pose") || k.includes("roupa")) return "INFLUENCER";
        if (k.includes("logo")) return "LOGO";
        if (k.includes("ambiente")) return "SCENE";
        return key.toUpperCase();
      };
      const imageUrls = allRefs.map((r) => r.url);
      const imageRoles = allRefs.map((r) => roleFor(r.key));
      const hasProduct = imageRoles.includes("PRODUCT");
      const hasPerson = imageRoles.includes("INFLUENCER");

      const compositionDirective = (hasProduct && hasPerson)
        ? `\n\nCOMPOSIÇÃO OBRIGATÓRIA (REGRA INVIOLÁVEL): o PRODUTO (FOTO marcada como PRODUCT) DEVE aparecer fisicamente em TODA a duração do vídeo, OBRIGATORIAMENTE: (a) segurado pela mão do INFLUENCIADOR, ou (b) apoiado sobre uma superfície visível ao lado dele. NUNCA mostre a pessoa sem o produto. NUNCA esconda o produto. Preserve fielmente o rosto, traços e estilo do influenciador.`
        : allRefs.length >= 2
          ? `\n\nCOMPOSIÇÃO: combine TODAS as referências numa única cena coesa, preservando fielmente cada elemento.`
          : "";

      const modelMap: Record<string, string> = {
        "google/veo-3": "google/veo-3",
        "google/veo-2.0": "google/veo-2",
        "google/veo-2": "google/veo-2",
        "kling/3.0": "kling/3.0",
        "runway/gen-3": "runway/gen-3",
        "luma/dream-machine": "luma/dream-machine",
      };
      const videoModel = modelMap[config.model] || "google/veo-3";

      const audioMode = config.audioMode || "none";
      const withAudio = audioMode !== "none";
      const withMusic = audioMode === "ambient" || audioMode === "voice_ambient";
      const audioScript = (audioMode === "voice" || audioMode === "voice_ambient") ? (config.audioScript || "") : "";

      const finalVideoPrompt = [
        userPrompt,
        basePrompt ? `\n[INSTRUÇÕES FIXAS DO BLOCO]: ${basePrompt}` : "",
        styleSource === "preset" && config.preset ? `\n[ESTILO/PRESET]: ${config.presetName || config.preset}` : "",
        compositionDirective,
        audioScript ? `\n[NARRAÇÃO — fale exatamente este texto em Português Brasileiro]: ${audioScript}` : "",
        `\nFormato ${imageAspectRatio}.`,
      ].filter(Boolean).join("");

      addSystemMessage(`🎬 Gerando ${variations} vídeo(s) com IA · ${styleLabel} · modelo ${videoModel}${imageUrls.length ? ` · ${imageUrls.length} referência(s)` : ""}…`);
      addBotMessage(`⏳ Aguarde, criando ${variations} vídeo(s). Pode levar alguns minutos.`, node.id);

      try {
        const estId = await getEstabelecimentoId();
        const collectedVideos: string[] = [];
        const vidErrors: string[] = [];

        for (let i = 0; i < variations; i++) {
          try {
            const { data, error } = await supabase.functions.invoke("ai-creative-studio", {
              body: {
                action: "generate_video",
                params: {
                  prompt: finalVideoPrompt + (variations > 1 ? `\n\nVARIAÇÃO ${i + 1} de ${variations}: mude apenas ângulo/movimento de câmera.` : ""),
                  model: videoModel,
                  aspectRatio: (videoModel.startsWith("google/veo") && !["16:9","9:16"].includes(imageAspectRatio)) ? "16:9" : imageAspectRatio,
                  resolution: config.resolution || "1080p",
                  duration: config.duration || 5,
                  withAudio,
                  withMusic,
                  imageUrls: imageUrls.length ? imageUrls : undefined,
                  imageRoles: imageRoles.length ? imageRoles : undefined,
                  estabelecimentoId: estId || "",
                },
                estabelecimentoId: estId || "",
              },
            });
            if (error) {
              const ctx: any = (error as any)?.context;
              const status = ctx?.status ?? (error as any)?.status;
              let serverMsg = "";
              try {
                const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
                serverMsg = body?.error || "";
              } catch {}
              vidErrors.push(serverMsg || (error as any)?.message || String(error));
              if (status === 402 || /cr[eé]dito|insufficient/i.test(serverMsg)) {
                addSystemMessage(`😕 Créditos de IA esgotados.`);
                return;
              }
              if (/api[_ ]?key|chave|provider|not configured/i.test(serverMsg)) {
                addSystemMessage(`😕 Sem chave de API configurada para vídeo (${videoModel}). Configure em AI Creative Studio → Configurações → Chaves de API.`);
                return;
              }
              continue;
            }
            const videoUrl: string = data?.videoUrl || data?.result?.videoUrl || "";
            if (videoUrl) {
              collectedVideos.push(videoUrl);
              addSystemMessage(`✅ ${collectedVideos.length}/${variations} vídeo(s) prontos.`);
            } else {
              vidErrors.push(data?.error || `Vídeo ${i + 1}: sem URL retornada.`);
            }
          } catch (e: any) {
            vidErrors.push(e?.message || String(e));
          }
        }

        if (collectedVideos.length === 0) {
          addSystemMessage(`❌ Não foi possível gerar vídeos. ${vidErrors.slice(0, 2).join(" | ")}`);
          return;
        }

        const items = collectedVideos.map((url, i) => ({ url, index: i + 1 }));
        items.forEach((it) => addBotMediaMessage(it.url, "video", `Opção ${it.index}`, node.id));

        if (items.length === 1) {
          const outputVar = config.outputVariable || "midia_selecionada";
          setContext((prev) => ({ ...prev, [outputVar]: items[0].url }));
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            safeSetTimeout(() => executeNode(nextNode), 600);
          }
        } else {
          addBotMessage("Responda com o número da opção que você gostou:", node.id);
          simNodeStateRef.current[node.id] = { items };
          setIsWaitingInput(true);
          setCurrentBlockType("ai_media_select");
          setPendingVariable(`__aims_${node.id}`);
          setCurrentNodeId(node.id);
        }
      } catch (e: any) {
        addSystemMessage(`❌ Erro ao gerar vídeo: ${e?.message || e}`);
      }
      return;
    }
    // ============== END VIDEO PATH ==============

    addSystemMessage(`🎨 Gerando ${variations} imagem(ns) com IA · ${styleLabel}${refImageUrl ? " · com imagem de referência" : ""}…`);
    addBotMessage(`⏳ Aguarde, estou criando ${variations} opções de imagem. Isso pode levar até 1 minuto — você receberá todas juntas quando ficarem prontas.`, node.id);
    addSystemMessage(`📝 Texto usado: ${userPrompt}`);

    try {
      const estId = await getEstabelecimentoId();
      const collectedImages: string[] = [];
      const errors: string[] = [];
      const maxTotalAttempts = variations * 8;
      let totalAttempts = 0;

      while (collectedImages.length < variations && totalAttempts < maxTotalAttempts) {
        const optionIndex = collectedImages.length;
        let optionImage = "";
        for (let attempt = 1; !optionImage && attempt <= 4; attempt++) {
          totalAttempts++;
          const { data, error } = await supabase.functions.invoke("bot-generate-ai-media", {
            body: {
              prompt: `${userPrompt}\n\nGere somente a opção ${optionIndex + 1} de ${variations}. Mantenha o mesmo briefing, identidade visual e formato ${imageAspectRatio}; varie apenas ângulo, enquadramento ou composição.`,
              basePrompt,
              variations: 1,
              styleSource,
              preset: styleSource === "preset" ? (config.preset || "") : "",
              referenceImageUrl: refImageUrl || "",
              referenceImageUrls: [refImageUrl, ...extraRefs.map((e) => e.url)].filter(Boolean),
              referenceLabels: [
                refImageUrl ? (primaryRefKey || "principal") : null,
                ...extraRefs.map((e) => e.key),
              ].filter(Boolean),
              estabelecimentoId: estId || "",
              aspectRatio: imageAspectRatio,
            },
          });
          if (error) {
            const ctx: any = (error as any)?.context;
            const status = ctx?.status ?? (error as any)?.status;
            let serverMsg = "";
            try {
              const body = ctx && typeof ctx.json === "function" ? await ctx.json() : null;
              serverMsg = body?.error || "";
            } catch {}
            if (status === 402 || /cr[eé]dito|payment|insufficient/i.test(serverMsg)) {
              addSystemMessage(`😕 Não consegui criar suas imagens agora porque os créditos de IA acabaram. Peça ao responsável para adicionar créditos e tente novamente em seguida.`);
              return;
            }
            if (status === 429 || /rate|limite/i.test(serverMsg)) {
              addSystemMessage(`⏳ A IA está muito ocupada neste momento. Aguarde alguns segundos e tente gerar novamente, por favor.`);
              return;
            }
            if (status === 404 || /model|not found|indispon/i.test(serverMsg)) {
              addSystemMessage(`😕 O modelo de IA escolhido está indisponível agora. Selecione outro modelo nas configurações do bloco e tente novamente.`);
              return;
            }
            addSystemMessage(`😕 Não consegui gerar a imagem desta vez. Tente novamente em instantes — se persistir, revise as configurações do bloco.`);
            return;
          }

          const batchImages: string[] = Array.isArray(data?.images) ? data.images.filter(Boolean) : [];
          optionImage = batchImages[0] || "";
          if (Array.isArray(data?.errors)) errors.push(...data.errors);

          // Detectar falhas explícitas do backend embutidas no payload de sucesso
          const blockingErr = (data?.errors || []).find((m: string) =>
            /cr[eé]dito|insufficient|payment|402|429|rate|limite/i.test(m || "")
          );
          if (!optionImage && blockingErr) {
            if (/cr[eé]dito|insufficient|payment|402/i.test(blockingErr)) {
              addSystemMessage(`😕 Não consegui criar suas imagens agora porque os créditos de IA acabaram. Peça ao responsável para adicionar créditos e tente novamente em seguida.`);
            } else if (/rate|limite|429/i.test(blockingErr)) {
              addSystemMessage(`⏳ A IA está muito ocupada neste momento. Aguarde alguns segundos e tente gerar novamente, por favor.`);
            } else {
              addSystemMessage(`😕 Não consegui gerar a imagem agora. Tente novamente em instantes.`);
            }
            return;
          }
        }

        if (!optionImage) continue;
        collectedImages.push(optionImage);
        addSystemMessage(
          collectedImages.length < variations
            ? `⏳ ${collectedImages.length}/${variations} opções prontas. Gerando a próxima...`
            : `✅ ${collectedImages.length}/${variations} opções prontas. Enviando imagens...`
        );
      }

      if (collectedImages.length < variations) {
        addSystemMessage(`❌ A IA retornou apenas ${collectedImages.length}/${variations} opções. Não enviei opções parciais para evitar pular numeração. ${errors.join(" | ")}`);
        return;
      }

      const items = collectedImages.slice(0, variations).map((url, i) => ({ url, index: i + 1 }));

      // Salvar as imagens geradas na Galeria de Marketing na pasta "Gerado por WhatsApp Marketing"
      try {
        const estabId = localStorage.getItem("estabelecimentoId") || estId || "";
        if (estabId) {
          const FOLDER_NAME = "Gerado por WhatsApp Marketing";
          const foldersKey = `galeria_content_folders_${estabId}`;
          const assignmentsKey = `galeria_content_assignments_${estabId}`;
          let folders: string[] = [];
          let assignments: Record<string, string | null> = {};
          try { folders = JSON.parse(localStorage.getItem(foldersKey) || "[]"); } catch {}
          try { assignments = JSON.parse(localStorage.getItem(assignmentsKey) || "{}"); } catch {}
          if (!folders.includes(FOLDER_NAME)) {
            folders.push(FOLDER_NAME);
            localStorage.setItem(foldersKey, JSON.stringify(folders));
          }
          for (const it of items) {
            try {
              const { data: inserted, error: insErr } = await supabase
                .from("media_gallery")
                .insert({
                  estabelecimento_id: estabId,
                  tipo: "image",
                  public_url: it.url,
                  storage_path: it.url.split("/marketing-images/")[1] || it.url,
                  nome: `Opção ${it.index} · WhatsApp Marketing ${new Date().toLocaleString("pt-BR")}`,
                  mime_type: "image/png",
                  origem: "whatsapp_marketing",
                } as any)
                .select("id")
                .single();
              if (!insErr && inserted?.id) {
                assignments[inserted.id] = FOLDER_NAME;
              }
            } catch (galErr) {
              console.warn("Falha ao salvar imagem na galeria:", galErr);
            }
          }
          localStorage.setItem(assignmentsKey, JSON.stringify(assignments));
          addSystemMessage(`💾 ${items.length} imagem(ns) salva(s) na Galeria → pasta "${FOLDER_NAME}".`);
        }
      } catch (galErr) {
        console.warn("Falha geral ao salvar na galeria:", galErr);
      }

      items.forEach((it) => addBotMediaMessage(it.url, "image", `Opção ${it.index}`, node.id));
      addBotMessage("Responda com o número da opção que você gostou:", node.id);
      simNodeStateRef.current[node.id] = { items };
      setIsWaitingInput(true);
      setCurrentBlockType("ai_media_select");
      setPendingVariable(`__aims_${node.id}`);
      setCurrentNodeId(node.id);
    } catch (e: any) {
      addSystemMessage(`❌ Erro ao gerar imagens: ${e?.message || e}`);
    }
  };

  // Ask user for reference image URL (simulator step) before generation
  const askUserForRefImage = (node: Node, textPrompt: string) => {
    const config = (node.data as any).config || {};
    const ask = interpolateVariables(config.imagePrompt || "Envie a URL de uma imagem de referência (ou digite 'pular'):", contextRef.current);
    addBotMessage(ask, node.id);
    simNodeStateRef.current[node.id] = { ...(simNodeStateRef.current[node.id] || {}), pendingPrompt: textPrompt };
    setIsWaitingInput(true);
    setCurrentBlockType("ai_media_image_ref");
    setPendingVariable(`__aimr_${node.id}`);
    setCurrentNodeId(node.id);
  };

  const executeNode = async (node: Node) => {
    const nodeData = node.data as any;
    const blockDef = BLOCK_DEFINITIONS.find((b) => b.type === nodeData.type);
    
    if (!blockDef) return;

    // Verificar se o bloco deve ser pulado
    if (skipNodes.has(node.id)) {
      addSystemMessage(`⏭️ Bloco "${blockDef.label}" pulado`);
      safeSetTimeout(() => {
        const nextNode = getNextNode(node.id);
        if (nextNode) {
          setCurrentNodeId(nextNode.id);
          executeNode(nextNode);
        }
      }, 300);
      return;
    }

    // Verificar se há breakpoint neste bloco
    if (breakpointNodes.has(node.id)) {
      addSystemMessage(`⏸️ Pausa de breakpoint no bloco "${blockDef.label}"`);
      return; // Interrompe a execução aqui
    }

    const config = nodeData.config || {};
    
    console.log("Executing node:", nodeData.type, { type: nodeData.type, label: nodeData.label, config });

    switch (nodeData.type) {
      case "start":
        addSystemMessage("✅ Fluxo iniciado");
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;

      case "send_message":
        console.log("send_message config:", config);
        // Suporte para múltiplas mensagens
        const messages = config.messages || [];
        console.log("messages array:", messages);
        if (messages.length > 0) {
          console.log("Processing multiple messages:", messages.length);
          messages.forEach((msg: any, index: number) => {
            console.log("Scheduling message", index, ":", msg);
            safeSetTimeout(() => {
              const messageText = interpolateVariables(msg.text || "", context);
              console.log("Adding message text:", messageText);
              addBotMessage(messageText, node.id);
            }, index * 500);
          });
          
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, messages.length * 500 + 500);
        } else {
          // Fallback para texto simples
          console.log("Using fallback text:", config.text);
          const messageText = interpolateVariables(config.text || "Mensagem não configurada", context);
          addBotMessage(messageText, node.id);
          
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 1000);
        }
        break;

      case "media":
        console.log("media config:", config);
        const mediaType = config.mediaType || "image";
        const mediaUrl = interpolateVariables(config.url || "", context);
        const caption = interpolateVariables(config.caption || "", context);
        console.log("media details:", { mediaType, mediaUrl, caption });
        
        if (!mediaUrl) {
          console.log("No media URL, adding fallback message");
          addBotMessage("📎 [Mídia não configurada]", node.id);
        } else {
          console.log("Adding media message with URL:", mediaUrl);
          addBotMediaMessage(mediaUrl, mediaType as any, caption, node.id);
        }
        
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, caption ? 1500 : 1000);
        break;

      case "goodbye":
        const goodbyeText = interpolateVariables(config.message || config.text || "Até logo!", context);
        addBotMessage(goodbyeText, node.id);
        
        console.log("Goodbye config:", config);
        console.log("showSocialButtons:", config.showSocialButtons);
        
        let finalDelay = 500;
        
        // Exibir botões sociais se configurado
        if (config.showSocialButtons) {
          console.log("Social buttons enabled");
          safeSetTimeout(() => {
            const socialLinks = JSON.parse(localStorage.getItem("socialLinks") || "{}");
            console.log("Social links from localStorage:", socialLinks);
            const buttons = [];
            
            if (config.socialWhatsApp && socialLinks.whatsapp) {
              console.log("Adding WhatsApp button");
              buttons.push({ text: "📱 WhatsApp", value: socialLinks.whatsapp });
            }
            if (config.socialInstagram && socialLinks.instagram) {
              console.log("Adding Instagram button");
              buttons.push({ text: "📷 Instagram", value: socialLinks.instagram });
            }
            if (config.socialFacebook && socialLinks.facebook) {
              console.log("Adding Facebook button");
              buttons.push({ text: "👥 Facebook", value: socialLinks.facebook });
            }
            if (config.socialWebsite && socialLinks.website) {
              console.log("Adding Website button");
              buttons.push({ text: "🌐 Website", value: socialLinks.website });
            }
            
            console.log("Total buttons:", buttons.length);
            
            if (buttons.length > 0) {
              const messageId = `msg-${Date.now()}-social`;
              setMessages((prev) => [
                ...prev,
                {
                  id: messageId,
                  sender: "bot",
                  text: "Nos acompanhe em nossas redes sociais:",
                  timestamp: new Date(),
                  nodeId: node.id,
                  buttons,
                },
              ]);
              console.log("Social buttons message added");
            } else {
              console.log("No buttons to show - check if links are configured in Config page");
            }
          }, 500);
          finalDelay = 1500; // Aumentar o delay final se mostrou botões sociais
        } else {
          console.log("Social buttons NOT enabled");
        }
        
        if (config.showStartAgainButton !== false) {
          safeSetTimeout(() => {
            addSystemMessage("💬 Conversa finalizada. Clique em 'Reiniciar' para começar novamente.");
          }, finalDelay);
        }
        
        setIsWaitingInput(false);
        break;

      case "ask_name":
      case "ask_question":
      case "ask_email":
      case "ask_number":
      case "ask_phone":
      case "ask_date":
      case "ask_file":
      case "ask_address":
      case "ask_url":
      case "ask_cnpj":
      case "ask_cep":
        const type = (node.data as any)?.type as string;
        const defaults: Record<string, string> = {
          ask_name: "nome",
          ask_question: "resposta",
          ask_email: "email",
          ask_number: "numero",
          ask_phone: "telefone",
          ask_date: "data",
          ask_file: "arquivo",
          ask_address: "endereco",
          ask_url: "url",
          ask_cnpj: "cnpj",
          ask_cep: "cep",
        };
        const rawVar = config.variable || defaults[type] || "resposta";
        const variable = normalizeVarName(rawVar);
        const question = interpolateVariables(config.question || "Pergunta não configurada", context);
        console.log("❓ Question block:", { 
          type, 
          rawVar, 
          variable, 
          question,
          fullConfig: config,
          currentContext: context 
        });
        addBotMessage(question, node.id);
        setIsWaitingInput(true);
        setPendingVariable(variable);
        console.log("⏳ Waiting for input, pendingVariable set to:", variable);
        break;

      case "condition":
        addSystemMessage("🔀 Avaliando condições...");
        const conditions = config.conditions || [];
        
        let matchedIndex = -1;
        for (let i = 0; i < conditions.length; i++) {
          const condition = conditions[i];
          if (evaluateExpression(condition.expression, context)) {
            matchedIndex = i;
            addSuccessMessage(`Condição ${i + 1} atendida: ${condition.label || condition.expression}`);
            break;
          }
        }

        safeSetTimeout(() => {
          if (matchedIndex >= 0) {
            const nextNode = getNextNode(node.id, matchedIndex);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          } else {
            addSystemMessage("Nenhuma condição atendida, seguindo caminho padrão");
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }
        }, 1000);
        break;

      case "variables":
        addSystemMessage("📝 Atualizando variáveis...");
        try {
          const operation = config.operation || "set";
          const variablesJson = interpolateVariables(config.variables || "{}", context);
          const variables = JSON.parse(variablesJson);

          if (operation === "set") {
            setContext((prev) => ({ ...prev, ...variables }));
            addSuccessMessage(`Variáveis definidas: ${Object.keys(variables).join(", ")}`);
          } else if (operation === "unset") {
            setContext((prev) => {
              const newContext = { ...prev };
              Object.keys(variables).forEach((key) => delete newContext[key]);
              return newContext;
            });
            addSuccessMessage(`Variáveis removidas: ${Object.keys(variables).join(", ")}`);
          } else if (operation === "merge") {
            setContext((prev) => {
              const merged = { ...prev };
              Object.entries(variables).forEach(([key, value]) => {
                if (typeof value === "object" && typeof merged[key] === "object") {
                  merged[key] = { ...merged[key], ...value };
                } else {
                  merged[key] = value;
                }
              });
              return merged;
            });
            addSuccessMessage(`Variáveis mescladas: ${Object.keys(variables).join(", ")}`);
          }
        } catch (error) {
          addSystemMessage(`❌ Erro ao processar variáveis: ${error}`);
        }

        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;

      case "api":
        const apiUrl = interpolateVariables(config.url || "", context);
        addSystemMessage(`🌐 Chamando API: ${config.method || "GET"} ${apiUrl}`);
        
        // Simula resposta da API
        safeSetTimeout(() => {
          const mockResponse = {
            status: 200,
            data: {
              success: true,
              message: "Resposta simulada da API",
              timestamp: new Date().toISOString(),
            },
          };
          
          if (config.outputVariable) {
            setContext((prev) => ({
              ...prev,
              [config.outputVariable]: mockResponse.data,
            }));
            addSuccessMessage(`API respondeu. Dados salvos em "${config.outputVariable}"`);
          } else {
            addSuccessMessage("API respondeu com sucesso");
          }
          
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 2000);
        break;

      case "script":
        addSystemMessage("⚙️ Executando script...");
        try {
          // Simula execução de script
          const code = config.code || "";
          addSuccessMessage("Script executado com sucesso");
          
          // Em produção, aqui seria executado em sandbox
          const mockResult = { executed: true };
          setContext((prev) => ({
            ...prev,
            script_result: mockResult,
          }));
          
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 1000);
        } catch (error) {
          addSystemMessage(`❌ Erro ao executar script: ${error}`);
        }
        break;

      case "delay":
        const duration = config.duration || 5;
        const unit = config.unit || "seconds";
        addSystemMessage(`⏱️ Aguardando ${duration} ${unit}...`);
        
        // Simula com tempo reduzido para testes
        const simulatedDelay = Math.min(3000, duration * 100);
        safeSetTimeout(() => {
          addSuccessMessage("Delay concluído");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, simulatedDelay);
        break;

      case "handoff":
        const department = config.department || "equipe";
        const priority = config.priority || "normal";
        addSystemMessage(`👤 Transferindo para ${department} (prioridade: ${priority})`);
        addBotMessage("Um agente humano irá atendê-lo em breve.", node.id);
        addSuccessMessage("Transferência realizada com sucesso");
        setIsWaitingInput(false);
        break;

      case "trigger_automation":
        const platform = config.platform || "zapier";
        const automationId = config.automationId || "não configurado";
        addSystemMessage(`⚡ Disparando automação em ${platform}: ${automationId}`);
        
        safeSetTimeout(() => {
          const mockAutomationResponse = {
            platform,
            automationId,
            success: true,
            data: { triggered: true },
          };
          
          if (config.outputVariable) {
            setContext((prev) => ({
              ...prev,
              [config.outputVariable]: mockAutomationResponse,
            }));
          }
          
          addSuccessMessage("Automação disparada com sucesso");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 2000);
        break;

      case "intent":
        const inputVar = config.inputVariable || "user_message";
        const inputText = context[inputVar] || "";
        addSystemMessage(`🧠 Classificando intent: "${inputText}"`);
        
        safeSetTimeout(() => {
          const mockIntent = {
            intent: "greeting",
            confidence: 0.95,
            entities: [],
          };
          
          if (config.outputVariable) {
            setContext((prev) => ({
              ...prev,
              [config.outputVariable]: mockIntent,
            }));
          }
          
          addSuccessMessage(`Intent detectado: ${mockIntent.intent} (${mockIntent.confidence * 100}%)`);
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1500);
        break;

      case "ai_agent":
        const aiModel = config.model || "gpt-4";
        const systemPrompt = config.systemPrompt || "Você é um assistente útil";
        addSystemMessage(`🤖 Agente IA ativado (${aiModel})`);
        
        if (isWaitingInput) {
          // Se está esperando input, responde com IA
          safeSetTimeout(() => {
            addBotMessage("Esta é uma resposta simulada do agente IA. Em produção, aqui seria processada uma resposta real.", node.id);
            setIsWaitingInput(true); // Continua aguardando input
          }, 1500);
        } else {
          // Senão, apenas passa para o próximo
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 1000);
        }
        break;

      case "crm_cadastro_empresa": {
        addSystemMessage("📇 Validando e cadastrando empresa...");
        try {
          const fieldMappings = config.fieldMappings || {};
          const empresaData: Record<string, any> = {};
          const customFields: Record<string, any> = {};
          // Definir tipo padrão como Pessoa Jurídica
          customFields.tipo = "Pessoa Jurídica";

          const formatValue = (campo: string, valor: string): string => {
            if (!valor) return valor;
            const v = String(valor).trim();
            switch (campo) {
              case 'cnpj':
                return maskCNPJ(v);
              case 'cep':
                const cepLimpo = v.replace(/\D/g, '');
                if (cepLimpo.length === 8) {
                  return `${cepLimpo.substring(0, 5)}-${cepLimpo.substring(5)}`;
                }
                return cepLimpo;
              case 'telefone':
                // Pegar apenas o primeiro número se houver múltiplos
                let primeiroTel = v.split(/[,;]/)[0].trim();
                let telNumeros = primeiroTel.replace(/\D/g, '');
                
                // Adicionar código do país se não tiver
                if (!telNumeros.startsWith('55')) {
                  telNumeros = '55' + telNumeros;
                }
                
                // Limitar a 13 dígitos
                telNumeros = telNumeros.substring(0, 13);
                
                // Formatar com máscara
                if (telNumeros.length === 13) {
                  return `+${telNumeros.substring(0, 2)} (${telNumeros.substring(2, 4)}) ${telNumeros.substring(4, 9)}-${telNumeros.substring(9)}`;
                } else if (telNumeros.length === 12) {
                  return `+${telNumeros.substring(0, 2)} (${telNumeros.substring(2, 4)}) ${telNumeros.substring(4, 8)}-${telNumeros.substring(8)}`;
                }
                return telNumeros;
              case 'email':
                return v.toLowerCase().replace(/\s/g, '');
              case 'estado':
                return v.toUpperCase().substring(0, 2);
              case 'razao_social':
              case 'nome_fantasia':
              case 'cidade':
              case 'endereco':
              case 'bairro':
                return v.toUpperCase();
              default:
                return v;
            }
          };

          // Interpolar todas as variáveis mapeadas
          for (const [field, template] of Object.entries(fieldMappings)) {
            if (typeof template === 'string' && template) {
              const raw = interpolateVariables(template as string, context);
              if (raw && raw.trim()) {
                const value = formatValue(field, raw);
                if ([
                  'cnpj','email','telefone','endereco','cidade','estado','cep','bairro','nome_fantasia'
                ].includes(field)) {
                  empresaData[field] = value;
                } else if (field === 'razao_social') {
                  empresaData['nome'] = value;
                } else {
                  customFields[field] = value;
                }
              }
            }
          }

          if (Object.keys(customFields).length > 0) {
            empresaData.custom_fields = customFields;
          }

          // Estabelecimento
          const estabId = await getEstabelecimentoId();
          if (!estabId) {
            addSystemMessage("❌ Estabelecimento não identificado. Selecione um estabelecimento.");
            break;
          }
          empresaData.estabelecimento_id = estabId;
          
          // Garantir tipo padrão como Pessoa Jurídica em custom_fields
          empresaData.custom_fields = {
            ...(empresaData.custom_fields || {}),
            company_type: "Pessoa Jurídica",
            tipo: "Pessoa Jurídica",
          };

          // Campos obrigatórios
          let camposObrigatorios: string[] = [];
          const { data: fieldConfigs } = await supabase
            .from('form_field_configs')
            .select('field_id, required')
            .eq('estabelecimento_id', estabId)
            .eq('form_type', 'empresa')
            .eq('required', true);

          if (fieldConfigs && fieldConfigs.length > 0) {
            const mapIds: Record<string, string> = {
              company_type: 'tipo',
              cpf_cnpj: 'cnpj',
              company_name: 'nome',
              razao_social: 'nome',
              company_fantasia: 'nome_fantasia',
              address: 'endereco',
              city: 'cidade',
              neighborhood: 'bairro',
              state: 'estado',
              cep: 'cep',
            };
            const NORMALIZE = (s: any) => (typeof s === 'string' ? s.toLowerCase().trim() : String(s));
            const EXCLUDE = new Set(['tipo','type','company_type','tipo_empresa','tipo_pessoa']);
            camposObrigatorios = fieldConfigs
              .map((fc: any) => mapIds[fc.field_id] || fc.field_id)
              .map(NORMALIZE)
              .filter((s: string) => !EXCLUDE.has(s));
          }
          if (camposObrigatorios.length === 0) {
            camposObrigatorios = ['cnpj','nome','nome_fantasia'];
          }

          const camposParaValidar = camposObrigatorios;
          const faltando = camposParaValidar.filter((campo) => {
            const isTableField = ['cnpj','nome','nome_fantasia','email','telefone','endereco','cidade','estado','cep','bairro'].includes(campo);
            if (isTableField) {
              return !(empresaData as any)[campo];
            }
            const cfVal = (customFields as any)[campo] ?? (empresaData.custom_fields ? (empresaData.custom_fields as any)[campo] : undefined);
            return !cfVal;
          });
          if (faltando.length > 0) {
            addSystemMessage(`❌ Campos obrigatórios faltando: ${faltando.join(', ')}`);
            break;
          }

          // Buscar existente comparando CNPJ sem máscara
          const cnpjSemMascara = empresaData.cnpj.replace(/\D/g, '');
          
          const { data: todasEmpresas, error: searchError } = await supabase
            .from('empresas')
            .select('id, cnpj')
            .eq('estabelecimento_id', estabId);
            
          if (searchError) {
            addSystemMessage(`❌ Erro ao buscar empresas: ${searchError.message}`);
            break;
          }
          
          // Encontrar empresa com mesmo CNPJ (comparando sem máscara)
          const empresaExistente = todasEmpresas?.find(e => {
            const cnpjBancoSemMascara = e.cnpj?.replace(/\D/g, '') || '';
            return cnpjBancoSemMascara === cnpjSemMascara;
          });

          let clienteNovo = 'Não';

          if (empresaExistente) {
            if (config.updateExisting) {
              const { error: updateError } = await supabase
                .from('empresas')
                .update({ ...empresaData, updated_at: new Date().toISOString() })
                .eq('id', empresaExistente.id);
              if (updateError) {
                addSystemMessage(`❌ Erro ao atualizar empresa: ${updateError.message}`);
                break;
              }
              addSuccessMessage(`✅ Empresa atualizada: ${empresaData.nome_fantasia || empresaData.nome}`);
            } else {
              addSystemMessage(`ℹ️ Empresa já cadastrada (não foi atualizada).`);
            }
          } else {
            clienteNovo = 'Sim';
            const { error: insertError } = await supabase
              .from('empresas')
              .insert([empresaData as any]);
            if (insertError) {
              addSystemMessage(`❌ Erro ao criar empresa: ${insertError.message}`);
              break;
            }
            addSuccessMessage(`✅ Empresa cadastrada: ${empresaData.nome_fantasia || empresaData.nome}`);
          }

          const outputVar = config.outputVariable || 'cliente_novo';
          setContext((prev) => ({ ...prev, [outputVar]: clienteNovo }));
        } catch (e: any) {
          addSystemMessage(`❌ Erro no cadastro de empresa: ${e?.message || e}`);
        }

        // Próximo bloco
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;
      }

      case "crm_gerar_relatorio": {
        addSystemMessage("📄 Gerando relatório em background...");
        try {
          const relatorioId = interpolateVariables(config.relatorioId || "", context);
          if (!relatorioId) {
            addSystemMessage("❌ Nenhum relatório selecionado.");
            break;
          }

          const rawVars = config.apiVariables || {};
          const apiVariables: Record<string, any> = {};
          for (const [key, val] of Object.entries(rawVars)) {
            apiVariables[key] = typeof val === "string" ? interpolateVariables(val as string, context) : val;
          }

          // Variáveis fixas do relatório
          const rawReportVars = (config as any).reportVariables || {};
          const reportVariables: Record<string, any> = {};
          for (const [key, val] of Object.entries(rawReportVars)) {
            reportVariables[key] = interpolateVariables(String(val ?? ""), context);
          }

          const outputType = interpolateVariables((config as any).outputType || "pdf", context);

          const { data, error } = await supabase.functions.invoke('gerar-relatorio-pdf', {
            body: { relatorioId, apiVariables, reportVariables, outputType }
          });

          if (error) {
            addSystemMessage(`❌ Erro ao gerar relatório: ${error.message || error}`);
            break;
          }

          if (data?.pdfUrl) {
            addBotMediaMessage(data.pdfUrl, "file", data.fileName || "Relatório gerado", node.id);
            const outputVar = normalizeVarName(config.outputVariable || "relatorio_gerado");
            if (outputVar) {
              setContext((prev) => ({ ...prev, [outputVar]: "Sucesso" }));
            }
            safeSetTimeout(() => {
              const nextNode = getNextNode(node.id);
              if (nextNode) {
                setCurrentNodeId(nextNode.id);
                executeNode(nextNode);
              }
            }, 500);
          } else {
            addSystemMessage("❌ Erro: Relatório não foi gerado corretamente.");
          }
        } catch (e: any) {
          addSystemMessage(`❌ Erro ao gerar relatório: ${e?.message || e}`);
        }
        break;
      }

      case "reply_buttons":
        const replyHeader = interpolateVariables(config.header || "", context);
        const replyText = interpolateVariables(config.text || "", context);
        const replyFooter = interpolateVariables(config.footer || "", context);
        const replyButtons = config.buttons || [];
        const replyImage = config.image || config.mediaUrl;
        
        console.log("reply_buttons config:", { replyButtons, variable: config.variable, context });
        
        // Exibir imagem se houver
        if (replyImage) {
          addBotMediaMessage(replyImage, "image", "", node.id);
        }
        
        // Exibir header
        if (replyHeader) {
          safeSetTimeout(() => {
            addBotMessage(`*${replyHeader}*`, node.id);
          }, replyImage ? 500 : 0);
        }
        
        // Exibir texto com botões
        const delay = (replyImage ? 500 : 0) + (replyHeader ? 500 : 0);
        safeSetTimeout(() => {
          const msgWithButtons: Message = {
            id: uid(),
            sender: "bot",
            text: replyText,
            timestamp: new Date(),
            nodeId: node.id,
            buttons: replyButtons.map((btn: any, idx: number) => ({
              text: btn.label || btn.text || `Botão ${idx + 1}`,
              value: btn.value || btn.text || `button_${idx}`,
              buttonId: `button_${idx}`
            }))
          };
          console.log("Created message with buttons:", msgWithButtons);
          setMessages((prev) => [...prev, msgWithButtons]);
        }, delay);
        
        // Exibir footer
        if (replyFooter) {
          safeSetTimeout(() => {
            addSystemMessage(`ℹ️ ${replyFooter}`);
          }, delay + 500);
        }
        
        setIsWaitingInput(true);
        setCurrentBlockType("reply_buttons");
        setPendingVariable(normalizeVarName(config.variable || "button_response"));
        console.log("Waiting for button input, pendingVariable:", normalizeVarName(config.variable || "button_response"));
        break;

      case "list_buttons":
        const listText = interpolateVariables(config.text || "", context);
        const listHeader = config.header ? interpolateVariables(config.header, context) : null;
        const listFooter = config.footer ? interpolateVariables(config.footer, context) : null;
        const buttonText = config.buttonText || config.listHeader || "Ver opções";
        const sections = config.sections || [];
        
        if (listHeader) {
          addSystemMessage(`📌 ${listHeader}`);
        }
        
        // Adicionar mensagem com botão de lista estilo WhatsApp
        safeSetTimeout(() => {
          const newListId = Date.now().toString();
          setActiveListId(newListId);
          setMessages((prev) => [...prev, {
            id: newListId,
            sender: "bot",
            text: listText,
            timestamp: new Date(),
            nodeId: node.id,
            isListButton: true,
            listButtonText: buttonText,
            listSections: sections,
          }]);
        }, listHeader ? 300 : 0);
        
        if (listFooter) {
          safeSetTimeout(() => {
            addSystemMessage(`ℹ️ ${listFooter}`);
          }, (listHeader ? 300 : 0) + 300);
        }
        
        setIsWaitingInput(true);
        setCurrentBlockType("list_buttons");
        setPendingVariable(normalizeVarName(config.variable || "list_response"));
        break;

      case "keyword_options":
        const koQuestion = interpolateVariables(config.question || "Escolha uma opção:", context);
        const koButtons = config.buttons || [];
        const showValidation = config.showValidationError !== false;
        
        // Mostrar pergunta
        addBotMessage(koQuestion, node.id);
        
        // Criar botões numerados clicáveis
        safeSetTimeout(() => {
          const numberedButtons = koButtons.map((btn: any, idx: number) => ({
            text: `${idx + 1}. ${btn.label || `Opção ${idx + 1}`}`,
            value: btn.label || `Opção ${idx + 1}`,
            buttonId: `button_${idx}`,
            keywords: btn.keywords || [],
          }));
          
          setMessages((prev) => [...prev, {
            id: uid(),
            sender: "system",
            text: "",
            timestamp: new Date(),
            buttons: numberedButtons,
            nodeId: node.id,
          }]);
        }, 500);
        
        setIsWaitingInput(true);
        setCurrentBlockType("keyword_options");
        setPendingVariable(normalizeVarName(config.variable || "opcao_escolhida"));
        break;

      case "message_template":
        const templateName = config.templateName || "não configurado";
        const language = config.language || "pt_BR";
        addSystemMessage(`📧 Enviando template: ${templateName} (${language})`);
        addBotMessage("📧 [Template do WhatsApp enviado]", node.id);
        
        safeSetTimeout(() => {
          addSuccessMessage("Template enviado com sucesso");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "opt_in_out":
        const optAction = config.action || "opt-in";
        const category = config.category || "marketing";
        addSystemMessage(`✅ ${optAction === "opt-in" ? "Registrando" : "Removendo"} consentimento (${category})`);
        
        safeSetTimeout(() => {
          addSuccessMessage(`Consentimento ${optAction === "opt-in" ? "registrado" : "removido"} com sucesso`);
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "opt_in_check":
        const checkCategory = config.category || "marketing";
        addSystemMessage(`🔍 Verificando consentimento (${checkCategory})`);
        
        // Simula que o usuário tem opt-in
        const hasOptIn = true;
        safeSetTimeout(() => {
          if (hasOptIn) {
            addSuccessMessage("Usuário possui consentimento");
          } else {
            addSystemMessage("Usuário não possui consentimento");
          }
          
          const nextNode = getNextNode(node.id, hasOptIn ? 0 : 1);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "audience":
        const segments = config.segments || [];
        const audienceAction = config.action || "add";
        addSystemMessage(`👥 ${audienceAction === "add" ? "Adicionando a" : "Removendo de"} segmentos: ${segments.join(", ")}`);
        
        safeSetTimeout(() => {
          addSuccessMessage("Segmentação atualizada");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "set_field":
        const setFieldMode = config.mode || "SET";
        const setFieldField = config.field || "";
        const setFieldValue = config.value || "";
        
        addSystemMessage(`📝 ${setFieldMode === "UNSET" ? "Removendo" : "Definindo"} campo...`);
        
        if (setFieldMode === "SET") {
          // SET: Define/sobrescreve o valor da variável
          const interpolatedValue = interpolateVariables(setFieldValue, context);
          const newContext = {
            ...contextRef.current,
            [setFieldField]: interpolatedValue,
          };
          contextRef.current = newContext;
          setContext(newContext);
          addSuccessMessage(`${setFieldField} = ${interpolatedValue}`);
        } else {
          // UNSET: Remove a variável do contexto
          const newContext = { ...contextRef.current };
          delete newContext[setFieldField];
          contextRef.current = newContext;
          setContext(newContext);
          addSuccessMessage(`${setFieldField} foi removido`);
        }
        
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "keyword_jump":
        const jumpKeywords = config.keywords || [];
        addSystemMessage("🔀 Aguardando palavra-chave para pular...");
        
        if (jumpKeywords.length > 0) {
          const jumpList = jumpKeywords.map((kw: any) => `"${kw.keyword}" → ${kw.targetNode}`).join(", ");
          safeSetTimeout(() => {
            addSystemMessage(`Pulos disponíveis: ${jumpList}`);
          }, 500);
        }
        
        setIsWaitingInput(true);
        break;

      case "global_keywords":
        const globalKeywords = config.keywords || [];
        addSystemMessage(`🌐 Palavras-chave globais ativas: ${globalKeywords.length}`);
        
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 500);
        break;

      case "formulas":
        const formula = config.formula || "";
        const outputVariable = config.outputVariable || "result";
        addSystemMessage(`🧮 Calculando: ${formula}`);
        
        try {
          const interpolatedFormula = interpolateVariables(formula, context);
          // eslint-disable-next-line no-eval
          const result = eval(interpolatedFormula);
          
          setContext((prev) => ({
            ...prev,
            [outputVariable]: result,
          }));
          
          safeSetTimeout(() => {
            addSuccessMessage(`${outputVariable} = ${result}`);
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 1000);
        } catch (error) {
          addSystemMessage(`❌ Erro ao calcular fórmula: ${error}`);
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 1000);
        }
        break;

      case "jump_to":
        const targetNodeId = config.targetNodeId || "";
        addSystemMessage(`⏭️ Pulando para bloco: ${targetNodeId}`);
        
        safeSetTimeout(() => {
          const targetNode = nodes.find((n) => n.id === targetNodeId);
          if (targetNode) {
            setCurrentNodeId(targetNode.id);
            executeNode(targetNode);
          } else {
            addSystemMessage("❌ Bloco de destino não encontrado");
          }
        }, 500);
        break;

      case "lead_scoring":
        const scoreField = config.scoreField || "lead_score";
        const points = config.points || 0;
        const scoringAction = config.action || "add";
        
        const currentScore = context[scoreField] || 0;
        const newScore = scoringAction === "add" ? currentScore + points : currentScore - points;
        
        setContext((prev) => ({
          ...prev,
          [scoreField]: newScore,
        }));
        
        addSystemMessage(`📊 ${scoringAction === "add" ? "+" : "-"}${points} pontos`);
        addSuccessMessage(`${scoreField} = ${newScore}`);
        
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "goal":
        const goalName = config.goalName || "conversão";
        const goalValue = config.value || 0;
        addSystemMessage(`🎯 Meta atingida: ${goalName}`);
        addSuccessMessage(`Valor: ${goalValue}`);
        
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1000);
        break;

      case "webhook":
        const webhookUrl = interpolateVariables(config.url || "", context);
        const method = config.method || "POST";
        addSystemMessage(`🌐 Chamando webhook: ${method} ${webhookUrl}`);
        
        safeSetTimeout(() => {
          const mockResponse = {
            status: 200,
            data: { success: true, message: "Webhook simulado" },
          };
          
          if (config.outputVariable) {
            setContext((prev) => ({
              ...prev,
              [config.outputVariable]: mockResponse.data,
            }));
          }
          
          addSuccessMessage("Webhook respondeu com sucesso");
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 2000);
        break;

      case "dynamic_data":
        const source = config.source || "não configurado";
        const query = config.query || "";
        const dataOutputVariable = config.outputVariable || "data";
        addSystemMessage(`💾 Buscando dados: ${source}`);
        
        safeSetTimeout(() => {
          const mockData = { items: [], count: 0, timestamp: new Date().toISOString() };
          
          setContext((prev) => ({
            ...prev,
            [dataOutputVariable]: mockData,
          }));
          
          addSuccessMessage(`Dados salvos em "${dataOutputVariable}"`);
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }
        }, 1500);
        break;

      case "fallback":
        addBotMessage("Desculpe, não entendi. Pode reformular?", node.id);
        addSystemMessage("⚠️ Fallback acionado");
        setIsWaitingInput(true);
        break;

      case "product_search_select": {
        const sourceVar = normalizeVarName(config.sourceVariable || "");
        const askText = interpolateVariables(config.askText || "Qual produto você está procurando?", context);
        const sourceVal = sourceVar
          ? (contextRef.current[sourceVar] ?? contextRef.current[`@${sourceVar}`])
          : null;
        if (sourceVal) {
          await runProductSearch(node, String(sourceVal));
        } else {
          addBotMessage(askText, node.id);
          setIsWaitingInput(true);
          setCurrentBlockType("product_search_query");
          setPendingVariable(`__psq_${node.id}`);
          setCurrentNodeId(node.id);
        }
        break;
      }

      case "generate_ai_media": {
        const ask = interpolateVariables(config.textPrompt || "Descreva o que você quer gerar:", context);
        const imageRefSource = config.imageRefSource || "user";
        const needsUserImg = config.acceptImageRef && (imageRefSource === "user" || imageRefSource === "both");
        if (config.acceptText !== false) {
          addBotMessage(ask, node.id);
          setIsWaitingInput(true);
          setCurrentBlockType("ai_media_prompt");
          setPendingVariable(`__aim_${node.id}`);
          setCurrentNodeId(node.id);
        } else if (needsUserImg) {
          askUserForRefImage(node, interpolateVariables(config.basePrompt || "criativo", context));
        } else {
          await runAIMediaGeneration(node, interpolateVariables(config.basePrompt || "criativo", context));
        }
        break;
      }

      case "publish_social_post": {
        const platforms = (config.platforms || ["instagram"]).join(", ");
        const caption = interpolateVariables(config.caption || "", context);
        const mediaUrl = interpolateVariables(config.mediaUrl || "", context);
        addSystemMessage(`📤 Publicando em: ${platforms}${mediaUrl ? "\n🖼️ " + mediaUrl : ""}${caption ? "\n📝 " + caption : ""}`);
        safeSetTimeout(() => {
          const outputVar = normalizeVarName(config.outputVariable || "post_publicado");
          const fakeId = `sim_${Date.now()}`;
          const fakeLink = `https://instagram.com/p/${fakeId}`;
          const result = { id: fakeId, permalink: fakeLink, platforms: config.platforms };
          const newCtx = {
            ...contextRef.current,
            [outputVar]: result,
            [`${outputVar}_permalink`]: fakeLink,
            [`${outputVar}_id`]: fakeId,
          };
          contextRef.current = newCtx;
          setContext(newCtx);
          onContextChange?.(newCtx);
          addSuccessMessage(`✅ Publicado (simulado): ${fakeLink}`);
          const nextNode = getNextNode(node.id);
          if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
        }, 1500);
        break;
      }

      case "send_whatsapp_to_number": {
        const phone = interpolateVariables(config.phoneNumber || "", context);
        const msg = interpolateVariables(config.message || "", context);
        const mediaUrl = interpolateVariables(config.mediaUrl || "", context);
        addSystemMessage(`📱 WhatsApp → ${phone || "(número não informado)"}`);
        if (mediaUrl) addBotMediaMessage(mediaUrl, "image", msg, node.id);
        else if (msg) addBotMessage(`[para ${phone}] ${msg}`, node.id);
        const outputVar = normalizeVarName(config.outputVariable || "envio_whatsapp_status");
        const newCtx = { ...contextRef.current, [outputVar]: "enviado" };
        contextRef.current = newCtx;
        setContext(newCtx);
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
        }, 1000);
        break;
      }

      default:
        addSystemMessage(`▶️ Executando: ${blockDef.label}`);
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          } else {
            addSuccessMessage("Fluxo concluído!");
          }
        }, 1000);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log("📎 Arquivo selecionado:", file.name, file.type, file.size);

    // Se estamos no bloco ask_file, validar o arquivo
    if (currentBlockType === "ask_file" && currentNodeId) {
      const currentNode = nodes.find((n) => n.id === currentNodeId);
      if (!currentNode) return;
      
      const nodeData = currentNode.data as any;
      const nodeConfig = nodeData?.config || {};
      const fileType = nodeConfig.fileType || "any";
      const maxSizeMB = parseFloat(nodeConfig.maxSizeMB) || 10;
      const errorMessage = nodeConfig.errorMessage || "";

      console.log("🔍 Validando arquivo:", { fileType, maxSizeMB, fileName: file.name, fileSize: file.size, mimeType: file.type, nodeConfig });

      // Validar tipo de arquivo
      const validTypes: Record<string, string[]> = {
        image: ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"],
        video: ["video/mp4", "video/mpeg", "video/quicktime", "video/avi"],
        audio: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/mp4"],
        document: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "text/plain"]
      };

      if (fileType !== "any" && validTypes[fileType]) {
        console.log("🔍 Verificando tipo:", file.type, "está em", validTypes[fileType]);
        if (!validTypes[fileType].includes(file.type)) {
          const typeNames: Record<string, string> = {
            image: "imagem",
            video: "vídeo", 
            audio: "áudio",
            document: "documento"
          };
          const msg = errorMessage || `Por favor, envie apenas arquivos de ${typeNames[fileType]}.`;
          console.log("❌ Tipo inválido:", msg);
          addSystemMessage(`⚠️ ${msg}`);
          if (fileInputRef.current) fileInputRef.current.value = "";
          setSelectedFile(null);
          setInput("");
          return;
        }
      }

      // Validar tamanho do arquivo
      const fileSizeMB = file.size / (1024 * 1024);
      console.log("📏 Tamanho do arquivo:", fileSizeMB, "MB, máximo:", maxSizeMB);
      
      if (fileSizeMB > maxSizeMB) {
        const msg = errorMessage || `O arquivo não pode ser maior que ${maxSizeMB}MB.`;
        console.log("❌ Tamanho inválido:", msg);
        addSystemMessage(`⚠️ ${msg}`);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setSelectedFile(null);
        setInput("");
        return;
      }

      console.log("✅ Arquivo válido!");
    }

    // Arquivo válido ou não é bloco ask_file
    const fileSizeMB = file.size / (1024 * 1024);
    setSelectedFile(file);
    setInput(`📎 ${file.name} (${fileSizeMB.toFixed(2)}MB)`);
  };

  const handleFileUpload = () => {
    if (!selectedFile || !pendingVariable) return;

    const cleanVarName = normalizeVarName(pendingVariable);
    
    // Simular URL do arquivo (em produção, seria upload para servidor)
    const fileUrl = `https://storage.example.com/files/${selectedFile.name}`;
    const fileInfo = {
      name: selectedFile.name,
      size: selectedFile.size,
      type: selectedFile.type,
      url: fileUrl
    };

    console.log("📎 [FILE] Saving file:", cleanVarName, "=", fileInfo);
    
    const newContext = { 
      ...contextRef.current, 
      [cleanVarName]: fileUrl,
      ['@' + cleanVarName]: fileUrl,
      [`${cleanVarName}_info`]: fileInfo
    };
    contextRef.current = newContext;
    setContext(newContext);
    if (onContextChange) {
      onContextChange(newContext);
    }
    
    addSuccessMessage(`Arquivo "${selectedFile.name}" recebido`);
    
    // Limpar estado do arquivo
    setSelectedFile(null);
    setInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    setPendingVariable(null);
    setIsWaitingInput(false);
    setCurrentBlockType(null);
    
    // Buscar próximo nó
    if (currentNodeId) {
      const defaultEdge = edges.find(
        (edge) => edge.source === currentNodeId && edge.sourceHandle === "default"
      );
      
      if (defaultEdge) {
        const nextNode = nodes.find((node) => node.id === defaultEdge.target);
        if (nextNode) {
          safeSetTimeout(() => {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }, 500);
          return;
        }
      }
      
      addSuccessMessage("Fluxo concluído!");
    }
  };

  const handleSendMessage = async () => {
    // Para ask_file, processar o arquivo
    if (currentBlockType === "ask_file" && selectedFile) {
      handleFileUpload();
      return;
    }
    
    if (!input.trim()) return;

    console.log("📨 handleSendMessage called with:", { 
      input, 
      pendingVariable,
      currentBlockType,
      currentContext: context 
    });

    addUserMessage(input);

    // === Multi-step: blocos novos ===
    if (currentBlockType === "product_search_query" && currentNodeId) {
      const node = nodes.find(n => n.id === currentNodeId);
      const q = input.trim();
      setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
      setInput("");
      if (node) await runProductSearch(node, q);
      return;
    }
    if (currentBlockType === "product_search_select" && currentNodeId) {
      const node = nodes.find(n => n.id === currentNodeId);
      const state = simNodeStateRef.current[currentNodeId];
      const idx = parseInt(input.trim()) - 1;
      if (!state || isNaN(idx) || idx < 0 || idx >= state.candidates.length) {
        addSystemMessage("⚠️ Número inválido. Digite o número do produto.");
        setInput(""); return;
      }
      const selected = state.candidates[idx];
      const cfg = (node!.data as any).config || {};
      const outVar = normalizeVarName(cfg.outputVariable || "produto_selecionado");
      const imgVar = normalizeVarName(cfg.imageUrlVariable || "produto_imagem_url");
      const newCtx = { ...contextRef.current, [outVar]: selected, [imgVar]: selected.foto_url || "" };
      contextRef.current = newCtx; setContext(newCtx); onContextChange?.(newCtx);
      addSuccessMessage(`✅ Produto selecionado: ${selected.nome}`);
      delete simNodeStateRef.current[currentNodeId];
      setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
      const nextNode = getNextNode(currentNodeId);
      if (nextNode) safeSetTimeout(() => { setCurrentNodeId(nextNode.id); executeNode(nextNode); }, 400);
      setInput(""); return;
    }
    if (currentBlockType === "ai_media_prompt" && currentNodeId) {
      const node = nodes.find(n => n.id === currentNodeId);
      const p = input.trim();
      setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
      setInput("");
      if (node) {
        const cfg = (node.data as any).config || {};
        const imageRefSource = cfg.imageRefSource || "user";
        const needsUserImg = cfg.acceptImageRef && (imageRefSource === "user" || imageRefSource === "both");
        if (needsUserImg) askUserForRefImage(node, p);
        else await runAIMediaGeneration(node, p);
      }
      return;
    }
    if (currentBlockType === "ai_media_image_ref" && currentNodeId && selectedFile) {
      const node = nodes.find(n => n.id === currentNodeId);
      const state = simNodeStateRef.current[currentNodeId] || {};
      const textPrompt = state.pendingPrompt || "";
      const file = selectedFile;
      setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
      setSelectedFile(null);
      setInput("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      try {
        const userImg = await uploadSimulatorReferenceImage(file);
        addSuccessMessage(`Imagem de referência recebida: ${file.name}`);
        addBotMediaMessage(userImg, "image", "Sua referência", node?.id);
        if (node) await runAIMediaGeneration(node, textPrompt, userImg);
      } catch (e: any) {
        addSystemMessage(`❌ Erro ao processar imagem de referência: ${e?.message || e}`);
        if (node) await runAIMediaGeneration(node, textPrompt, null);
      }
      return;
    }
    if (currentBlockType === "ai_media_image_ref" && currentNodeId) {
      const node = nodes.find(n => n.id === currentNodeId);
      const raw = input.trim();
      const state = simNodeStateRef.current[currentNodeId] || {};
      const textPrompt = state.pendingPrompt || "";
      setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
      setInput("");
      let userImg: string | null = null;
      if (raw && !/^(pular|skip|n[ãa]o)$/i.test(raw)) {
        if (/^https?:\/\//i.test(raw)) userImg = raw;
        else addSystemMessage("⚠️ URL inválida — gerando sem imagem do usuário.");
      }
      if (userImg) addBotMediaMessage(userImg, "image", "Sua referência", node!.id);
      if (node) await runAIMediaGeneration(node, textPrompt, userImg);
      return;
    }
    if (currentBlockType === "ai_media_select" && currentNodeId) {
      const node = nodes.find(n => n.id === currentNodeId);
      const state = simNodeStateRef.current[currentNodeId];
      const idx = parseInt(input.trim()) - 1;
      if (!state || isNaN(idx) || idx < 0 || idx >= state.items.length) {
        addSystemMessage("⚠️ Número inválido."); setInput(""); return;
      }
      const sel = state.items[idx];
      const cfg = (node!.data as any).config || {};
      const outVar = normalizeVarName(cfg.outputVariable || "midia_selecionada");
      const newCtx = { ...contextRef.current, [outVar]: sel.url };
      contextRef.current = newCtx; setContext(newCtx); onContextChange?.(newCtx);
      addSuccessMessage(`✅ Mídia ${sel.index} selecionada`);
      delete simNodeStateRef.current[currentNodeId];
      setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
      const nextNode = getNextNode(currentNodeId);
      if (nextNode) safeSetTimeout(() => { setCurrentNodeId(nextNode.id); executeNode(nextNode); }, 400);
      setInput(""); return;
    }

    if (pendingVariable) {
      const cleanVarName = normalizeVarName(pendingVariable);
      
      // Tratamento especial para keyword_options
      if (currentBlockType === "keyword_options" && currentNodeId) {
        const currentNode = nodes.find((n) => n.id === currentNodeId);
        if (currentNode) {
          const nodeData = currentNode.data as any;
          const koConfig = nodeData?.config || {};
          const koButtons = koConfig.buttons || [];
          const showValidation = koConfig.showValidationError !== false;
          
          // Verificar se o input contém alguma keyword ou número
          let matchedButtonIndex = -1;
          
          // Primeiro, verificar se é um número (1, 2, 3...)
          const inputNum = parseInt(input.trim());
          if (!isNaN(inputNum) && inputNum >= 1 && inputNum <= koButtons.length) {
            matchedButtonIndex = inputNum - 1;
          } else {
            // Se não é número, procurar keywords nos botões
            const inputLower = input.toLowerCase();
            koButtons.forEach((btn: any, idx: number) => {
              if (matchedButtonIndex === -1 && btn.keywords) {
                const keywords = Array.isArray(btn.keywords) ? btn.keywords : [];
                // Verificar se alguma keyword está contida no input (sem pontuação grudada)
                keywords.forEach((keyword: string) => {
                  if (keyword && matchedButtonIndex === -1) {
                    const keywordLower = keyword.toLowerCase();
                    // Regex para verificar se keyword está no input com espaços ou no início/fim
                    const regex = new RegExp(`(^|\\s)${keywordLower}($|\\s)`, 'i');
                    if (regex.test(inputLower) || inputLower === keywordLower) {
                      matchedButtonIndex = idx;
                    }
                  }
                });
              }
            });
          }
          
          if (matchedButtonIndex >= 0) {
            // Keyword encontrada - salvar input do usuário e rotear
            console.log("💾 Keyword matched at index:", matchedButtonIndex, "saving:", input);
            setContext((prev) => {
              const newContext = { ...prev, [cleanVarName]: input };
              contextRef.current = newContext;
              return newContext;
            });
            
            addSuccessMessage(`Variável "${cleanVarName}" = "${input}"`);
            setPendingVariable(null);
            setIsWaitingInput(false);
            setCurrentBlockType(null);
            
            // Rotear para o output do botão correspondente
            const buttonEdge = edges.find(
              (edge) => edge.source === currentNodeId && edge.sourceHandle === `button_${matchedButtonIndex}`
            );
            
            if (buttonEdge) {
              const nextNode = nodes.find((node) => node.id === buttonEdge.target);
              if (nextNode) {
                console.log("➡️ Routing to button output:", matchedButtonIndex);
                safeSetTimeout(() => {
                  setCurrentNodeId(nextNode.id);
                  executeNode(nextNode);
                }, 500);
                setInput("");
                return;
              }
            }
          } else {
            // Nenhuma keyword encontrada
            if (showValidation) {
              // Mostrar mensagem de erro e aguardar novamente
              addSystemMessage("⚠️ Resposta inválida. Por favor, digite um número ou uma das palavras-chave destacadas.");
              setInput("");
              return; // Mantém isWaitingInput=true, aguarda nova tentativa
            } else {
              // Usar output default (não salva variável)
              console.log("➡️ No keyword matched, routing to default output");
              setPendingVariable(null);
              setIsWaitingInput(false);
              setCurrentBlockType(null);
              
              const defaultEdge = edges.find(
                (edge) => edge.source === currentNodeId && edge.sourceHandle === "default"
              );
              
              if (defaultEdge) {
                const nextNode = nodes.find((node) => node.id === defaultEdge.target);
                if (nextNode) {
                  safeSetTimeout(() => {
                    setCurrentNodeId(nextNode.id);
                    executeNode(nextNode);
                  }, 500);
                  setInput("");
                  return;
                }
              }
            }
          }
        }
      }
      // Para reply_buttons: sempre salva o input (seja texto digitado ou clique)
      // Para list_buttons: só salva se for clique de botão (não salva texto digitado)
      else if (currentBlockType !== "list_buttons") {
        // Validação antes de salvar
        if (currentNodeId) {
          const currentNode = nodes.find((n) => n.id === currentNodeId);
          if (currentNode) {
            const nodeData = currentNode.data as any;
            const nodeConfig = nodeData?.config || {};
            const nodeType = nodeData?.type;
            
            // Validar email
            if (nodeType === "ask_email") {
              console.log("📧 Validando email:", input.trim());
              if (!validateEmail(input.trim())) {
                const errorMessage = nodeConfig.errorMessage || "Por favor, digite um email válido.";
                addSystemMessage(`⚠️ ${errorMessage}`);
                setInput("");
                return; // Não avança, mantém isWaitingInput=true
              }
              console.log("✅ Email válido!");
            }
            
            // Validar telefone
            if (nodeType === "ask_phone") {
              const validateFormat = nodeConfig.validateFormat !== false;
              const format = nodeConfig.format || "any";
              
              console.log("📞 Validando telefone:", { input: input.trim(), validateFormat, format });
              
              if (validateFormat && !validatePhoneFormat(input.trim(), format)) {
                const errorMessage = nodeConfig.errorMessage || "Por favor, digite um telefone válido no formato especificado.";
                addSystemMessage(`⚠️ ${errorMessage}`);
                setInput("");
                return; // Não avança, mantém isWaitingInput=true
              }
              console.log("✅ Telefone válido!");
            }
            
            // Validar número (SEMPRE obrigatório)
            if (nodeType === "ask_number") {
              const numValue = parseFloat(input.trim());
              const acceptDecimals = nodeConfig.allowDecimals !== false; // Corrigido: allowDecimals ao invés de acceptDecimals
              const minValue = nodeConfig.min; // Corrigido: min ao invés de minValue
              const maxValue = nodeConfig.max; // Corrigido: max ao invés de maxValue
              
              console.log("🔢 Validando número:", { 
                input: input.trim(), 
                numValue, 
                acceptDecimals, 
                minValue, 
                maxValue,
                nodeConfig
              });
              
              // Verificar se é um número válido (SEMPRE)
              if (isNaN(numValue) || input.trim() === "") {
                const errorMessage = nodeConfig.errorMessage || "Por favor, digite um número válido.";
                addSystemMessage(`⚠️ ${errorMessage}`);
                setInput("");
                return;
              }
              
              // Verificar se aceita decimais
              if (!acceptDecimals && !Number.isInteger(numValue)) {
                const errorMessage = nodeConfig.errorMessage || "Por favor, digite um número inteiro.";
                addSystemMessage(`⚠️ ${errorMessage}`);
                setInput("");
                return;
              }
              
              // Verificar valor mínimo
              if (minValue !== undefined && minValue !== null && minValue !== "") {
                const min = parseFloat(minValue);
                console.log("⬇️ Verificando mínimo:", numValue, "<", min, "?", numValue < min);
                if (!isNaN(min) && numValue < min) {
                  const errorMessage = nodeConfig.errorMessage || `O número deve ser maior ou igual a ${min}.`;
                  addSystemMessage(`⚠️ ${errorMessage}`);
                  setInput("");
                  return;
                }
              }
              
              // Verificar valor máximo
              if (maxValue !== undefined && maxValue !== null && maxValue !== "") {
                const max = parseFloat(maxValue);
                console.log("⬆️ Verificando máximo:", numValue, ">", max, "?", numValue > max);
                if (!isNaN(max) && numValue > max) {
                  const errorMessage = nodeConfig.errorMessage || `O número deve ser menor ou igual a ${max}.`;
                  addSystemMessage(`⚠️ ${errorMessage}`);
                  setInput("");
                  return;
                }
              }
              
              console.log("✅ Número válido!");
            }
            
            // Validar CNPJ e buscar dados da Receita Federal
            if (nodeType === "ask_cnpj") {
              const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
              console.log("🏢 Validando CNPJ:", input.trim());
              
              if (!cnpjRegex.test(input.trim())) {
                const errorMessage = nodeConfig.errorMessage || "Por favor, digite um CNPJ válido no formato XX.XXX.XXX/XXXX-XX";
                addSystemMessage(`⚠️ ${errorMessage}`);
                setInput("");
                return;
              }
              
              // Consultar CNPJ na Receita Federal via edge function
              try {
                setIsLoading(true);
                addSystemMessage("🔍 Consultando CNPJ na Receita Federal...");
                
                const { data, error } = await supabase.functions.invoke('consultar-cnpj', {
                  body: { cnpj: input.trim() }
                });

                if (error) throw error;
                
                if (data?.success && data?.data) {
                  const cnpjData = data.data;
                  
                  // Usar os campos configurados ou valores padrão
                  const fields = {
                    cnpj: nodeConfig.variable || cleanVarName || 'cnpj',
                    razaoSocial: nodeConfig.razaoSocialField || 'razao_social',
                    nomeFantasia: nodeConfig.nomeFantasiaField || 'nome_fantasia',
                    naturezaJuridica: nodeConfig.naturezaJuridicaField || 'natureza_juridica',
                    dataAbertura: nodeConfig.dataAberturaField || 'data_abertura',
                    situacao: nodeConfig.situacaoField || 'situacao',
                    porte: nodeConfig.porteField || 'porte',
                    atividadePrincipal: nodeConfig.atividadePrincipalField || 'atividade_principal',
                    logradouro: nodeConfig.logradouroField || 'logradouro',
                    numero: nodeConfig.numeroField || 'numero',
                    complemento: nodeConfig.complementoField || 'complemento',
                    bairro: nodeConfig.bairroField || 'bairro',
                    municipio: nodeConfig.municipioField || 'municipio',
                    uf: nodeConfig.ufField || 'uf',
                    cep: nodeConfig.cepField || 'cep',
                    telefone: nodeConfig.telefoneField || 'telefone',
                    email: nodeConfig.emailField || 'email',
                    socioNome: nodeConfig.socioNomeField || 'socio_nome',
                    socioQualificacao: nodeConfig.socioQualificacaoField || 'socio_qualificacao',
                    regimeTributario: nodeConfig.regimeTributarioField || 'regime_tributario',
                    simplesOptante: nodeConfig.simplesOptanteField || 'simples_optante',
                    simeiOptante: nodeConfig.simeiOptanteField || 'simei_optante',
                  };
                  
                  // Guardar cada variável no campo configurado
                  const cnpjContext = {
                    ...contextRef.current,
                    [fields.cnpj]: input.trim(),
                    [fields.razaoSocial]: cnpjData.razao_social || '',
                    [fields.nomeFantasia]: cnpjData.nome_fantasia || '',
                    [fields.naturezaJuridica]: cnpjData.natureza_juridica || '',
                    [fields.dataAbertura]: cnpjData.abertura || '',
                    [fields.situacao]: cnpjData.situacao || '',
                    [fields.porte]: cnpjData.porte || '',
                    [fields.atividadePrincipal]: cnpjData.atividade_principal || '',
                    [fields.logradouro]: cnpjData.logradouro || '',
                    [fields.numero]: cnpjData.numero || '',
                    [fields.complemento]: cnpjData.complemento || '',
                    [fields.bairro]: cnpjData.bairro || '',
                    [fields.municipio]: cnpjData.municipio || '',
                    [fields.uf]: cnpjData.uf || '',
                    [fields.cep]: cnpjData.cep || '',
                    [fields.telefone]: cnpjData.telefone || '',
                    [fields.email]: cnpjData.email || '',
                    [fields.socioNome]: cnpjData.socio_nome || '',
                    [fields.socioQualificacao]: cnpjData.socio_qualificacao || '',
                    [fields.regimeTributario]: cnpjData.regime_tributario || '',
                    [fields.simplesOptante]: cnpjData.simples_optante || '',
                    [fields.simeiOptante]: cnpjData.simei_optante || '',
                  } as Record<string, any>;

                  // Aliases com prefixo (compatível com variáveis do editor)
                  const prefix = normalizeVarName(fields.cnpj || 'cnpj');
                  const addressFull = [
                    cnpjData.logradouro,
                    cnpjData.numero,
                    cnpjData.bairro,
                    cnpjData.municipio,
                    cnpjData.uf,
                    cnpjData.cep,
                  ]
                    .filter(Boolean)
                    .join(', ');
                  cnpjContext[`${prefix}_cnpj`] = input.trim();
                  cnpjContext[`${prefix}_name`] = cnpjData.razao_social || '';
                  cnpjContext[`${prefix}_fantasy`] = cnpjData.nome_fantasia || '';
                  cnpjContext[`${prefix}_address`] = addressFull.trim();
                  cnpjContext[`${prefix}_phone`] = cnpjData.telefone || '';
                  cnpjContext[`${prefix}_email`] = cnpjData.email || '';

                  contextRef.current = cnpjContext;
                  setContext(cnpjContext);
                  if (onContextChange) {
                    onContextChange(cnpjContext);
                  }

                  addSuccessMessage(`✅ CNPJ consultado com sucesso!\n📋 ${cnpjData.razao_social || cnpjData.nome_fantasia}`);
                  console.log("✅ CNPJ válido e dados salvos!");
                  setIsLoading(false);
                  
                  // Avançar para próximo bloco
                  setPendingVariable(null);
                  setIsWaitingInput(false);
                  setCurrentBlockType(null);
                  
                  if (currentNodeId) {
                    const nextNode = getNextNode(currentNodeId);
                    if (nextNode) {
                      safeSetTimeout(() => {
                        setCurrentNodeId(nextNode.id);
                        executeNode(nextNode);
                      }, 500);
                      setInput("");
                      return;
                    }
                  }
                  
                  setInput("");
                  return;
                } else {
                  throw new Error(data?.error || 'Erro ao consultar CNPJ');
                }
              } catch (error) {
                console.error('Erro ao consultar CNPJ:', error);
                const errorMessage = nodeConfig.errorMessage || "Erro ao consultar CNPJ. Por favor, verifique o número e tente novamente.";
                addSystemMessage(`⚠️ ${errorMessage}`);
                setIsLoading(false);
                setInput("");
                return;
              }
            }
            
            // Validar CEP e buscar dados do ViaCEP
            if (nodeType === "ask_cep") {
              const cepRegex = /^\d{5}-?\d{3}$/;
              console.log("📍 Validando CEP:", input.trim());
              
              if (!cepRegex.test(input.trim())) {
                const errorMessage = nodeConfig.errorMessage || "Por favor, digite um CEP válido no formato XXXXX-XXX";
                addSystemMessage(`⚠️ ${errorMessage}`);
                setInput("");
                return;
              }
              
              // Consultar CEP no ViaCEP
              try {
                setIsLoading(true);
                addSystemMessage("🔍 Consultando CEP...");
                
                const cleanCEP = input.trim().replace(/\D/g, '');
                const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
                const data = await response.json();

                if (data.erro) {
                  throw new Error('CEP não encontrado');
                }
                
                // Usar os campos configurados ou valores padrão
                const fields = {
                  cep: nodeConfig.variable || cleanVarName || 'cep',
                  logradouro: nodeConfig.logradouroField || 'logradouro',
                  bairro: nodeConfig.bairroField || 'bairro',
                  localidade: nodeConfig.localidadeField || 'localidade',
                  uf: nodeConfig.ufField || 'uf',
                  complemento: nodeConfig.complementoField || 'complemento',
                };
                
                // Guardar cada variável no campo configurado
                const cepContext = {
                  ...contextRef.current,
                  [fields.cep]: data.cep || input.trim(),
                  [fields.logradouro]: data.logradouro || '',
                  [fields.bairro]: data.bairro || '',
                  [fields.localidade]: data.localidade || '',
                  [fields.uf]: data.uf || '',
                  [fields.complemento]: data.complemento || '',
                };
                
                contextRef.current = cepContext;
                setContext(cepContext);
                if (onContextChange) {
                  onContextChange(cepContext);
                }

                addSuccessMessage(`✅ CEP consultado com sucesso!\n📍 ${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`);
                console.log("✅ CEP válido e dados salvos!");
                setIsLoading(false);
                
                // Avançar para próximo bloco
                setPendingVariable(null);
                setIsWaitingInput(false);
                setCurrentBlockType(null);
                
                if (currentNodeId) {
                  const nextNode = getNextNode(currentNodeId);
                  if (nextNode) {
                    safeSetTimeout(() => {
                      setCurrentNodeId(nextNode.id);
                      executeNode(nextNode);
                    }, 500);
                    setInput("");
                    return;
                  }
                }
                
                setInput("");
                return;
              } catch (error) {
                console.error('Erro ao consultar CEP:', error);
                const errorMessage = nodeConfig.errorMessage || "Erro ao consultar CEP. Por favor, verifique o número e tente novamente.";
                addSystemMessage(`⚠️ ${errorMessage}`);
                setIsLoading(false);
                setInput("");
                return;
              }
            }
          }
        }
        
        console.log("💾 [CRITICAL] Saving variable:", cleanVarName, "=", input);
        console.log("📦 [CRITICAL] Context before save:", context);
        
        const newContext = { ...contextRef.current, [cleanVarName]: input, ['@' + cleanVarName]: input };
        contextRef.current = newContext;
        console.log("📦 [CRITICAL] Context after save:", newContext);
        console.log("✅ [CRITICAL] Variable saved successfully:", cleanVarName, "→", newContext[cleanVarName]);
        setContext(newContext);
        if (onContextChange) {
          onContextChange(newContext);
        }
        
        addSuccessMessage(`Variável "${cleanVarName}" = "${input}"`);
      } else {
        console.log("⚠️ List buttons - not saving typed text to variable");
      }
      
      setPendingVariable(null);
      setIsWaitingInput(false);
      setCurrentBlockType(null);
      
      // Buscar o próximo nó - rota para "Any of the above" quando texto é digitado
      if (currentNodeId) {
        // Procurar edge "any_of_above" para texto digitado
        const anyOfAboveEdge = edges.find(
          (edge) => edge.source === currentNodeId && edge.sourceHandle === "any_of_above"
        );
        
        if (anyOfAboveEdge) {
          const nextNode = nodes.find((node) => node.id === anyOfAboveEdge.target);
          if (nextNode) {
            console.log("➡️ Routing to 'Any of the above' output");
            safeSetTimeout(() => {
              console.log("🚀 Executing 'Any of the above' node with context:", contextRef.current);
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }, 500);
            setInput("");
            return;
          }
        }
        
        // Fallback: próximo nó padrão
        const nextNode = getNextNode(currentNodeId);
        console.log("➡️ [CRITICAL] Next node after saving variable:", nextNode?.id);
        if (nextNode) {
          safeSetTimeout(() => {
            console.log("🚀 [CRITICAL] Executing next node with context:", contextRef.current);
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }, 500);
        }
      }
    }

    setInput("");
  };

  const handleButtonClick = (button: { text: string; value: string; buttonId?: string; keywords?: string[] }, nodeId?: string) => {
    console.log("🔘 Button clicked:", { button, nodeId, pendingVariable, currentBlockType });
    
    // Para keyword_options, extrair o texto sem o número
    let displayText = button.text;
    let saveValue = button.value;
    
    if (currentBlockType === "keyword_options") {
      // Remover o número do início (ex: "1. Opção" -> "Opção")
      displayText = button.text.replace(/^\d+\.\s*/, '');
      saveValue = displayText;
    }
    
    addUserMessage(displayText);
    
    if (pendingVariable) {
      const cleanVarName = normalizeVarName(pendingVariable);
      console.log("💾 [BUTTON] Saving variable:", cleanVarName, "with value:", saveValue);
      console.log("📦 [BUTTON] Context before save:", contextRef.current);
      
      // Atualizar contextRef.current IMEDIATAMENTE
      const newContext = { ...contextRef.current, [cleanVarName]: saveValue, ['@' + cleanVarName]: saveValue };
      contextRef.current = newContext;
      console.log("📦 [BUTTON] Context after save:", contextRef.current);
      console.log("✅ [BUTTON] Variable saved in contextRef:", cleanVarName, "→", contextRef.current[cleanVarName]);
      
      // Atualizar o estado também (para UI)
      setContext(newContext);
      
      if (onContextChange) {
        onContextChange(newContext);
      }
      
      addSuccessMessage(`Variável "${cleanVarName}" = "${saveValue}"`);
      setPendingVariable(null);
      setIsWaitingInput(false);
      setCurrentBlockType(null);

      if (nodeId) {
        // Procurar edge específica do botão usando o buttonId como sourceHandle
        const buttonEdge = edges.find(
          (edge) => edge.source === nodeId && edge.sourceHandle === button.buttonId
        );
        
        if (buttonEdge) {
          const nextNode = nodes.find((node) => node.id === buttonEdge.target);
          if (nextNode) {
            console.log("➡️ [BUTTON] Executing next node via button edge:", nextNode.id);
            console.log("🚀 [BUTTON] Context available for next node:", contextRef.current);
            safeSetTimeout(() => {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }, 500);
            return;
          }
        }
        
        // Fallback: usar índice do botão
        const buttonIndex = parseInt(button.buttonId?.split('_').pop() || '0');
        console.log("🔍 Finding next node with index:", buttonIndex);
        const nextNode = getNextNode(nodeId, buttonIndex);
        if (nextNode) {
          console.log("➡️ [BUTTON] Executing next node:", nextNode.id);
          console.log("🚀 [BUTTON] Context available for next node:", contextRef.current);
          safeSetTimeout(() => {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }, 500);
        } else {
          console.log("❌ No next node found");
        }
      }
    } else {
      console.log("⚠️ No pending variable to save; trying to infer from node config.");
      if (nodeId) {
        const currentNode = nodes.find((n) => n.id === nodeId);
        const nodeVar = normalizeVarName(((currentNode?.data as any)?.config?.variable) || "");
        if (nodeVar) {
          const newContext = { ...contextRef.current, [nodeVar]: saveValue, ['@' + nodeVar]: saveValue };
          contextRef.current = newContext;
          setContext(newContext);
          onContextChange?.(newContext);
          addSuccessMessage(`Variável "${nodeVar}" = "${saveValue}"`);
        }

        const buttonEdge = edges.find(
          (edge) => edge.source === nodeId && edge.sourceHandle === button.buttonId
        );
        if (buttonEdge) {
          const nextNode = nodes.find((node) => node.id === buttonEdge.target);
          if (nextNode) {
            console.log("➡️ [BUTTON] Executing next node via button edge:", nextNode.id);
            console.log("🚀 [BUTTON] Context available for next node:", contextRef.current);
            safeSetTimeout(() => {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }, 500);
            return;
          }
        }

        const buttonIndex = parseInt(button.buttonId?.split('_').pop() || '0');
        console.log("🔍 Finding next node with index:", buttonIndex);
        const nextNode = getNextNode(nodeId, buttonIndex);
        if (nextNode) {
          console.log("➡️ [BUTTON] Executing next node:", nextNode.id);
          console.log("🚀 [BUTTON] Context available for next node:", contextRef.current);
          safeSetTimeout(() => {
            setCurrentNodeId(nextNode.id);
            executeNode(nextNode);
          }, 500);
        } else {
          console.log("❌ No next node found");
        }
      }
    }
  };

  const addUserMessage = (text: string) => {
    const msg: Message = {
      id: uid(),
      sender: "user",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const addBotMessage = (text: string, nodeId?: string) => {
    console.log("Adding bot message:", text);
    const msg: Message = {
      id: uid(),
      sender: "bot",
      text,
      timestamp: new Date(),
      nodeId,
    };
    setMessages((prev) => {
      console.log("Messages before:", prev.length, "after:", prev.length + 1);
      return [...prev, msg];
    });
  };

  const addBotMediaMessage = (mediaUrl: string, mediaType: "image" | "video" | "audio" | "file", caption: string, nodeId?: string) => {
    console.log("Adding bot media message:", { mediaUrl, mediaType, caption });
    const safeMediaUrl = typeof mediaUrl === "string" ? mediaUrl.trim() : "";
    if (!safeMediaUrl) {
      console.warn("Mensagem de mídia ignorada sem URL válida:", { mediaUrl, mediaType, caption });
      return;
    }
    const msg: Message = {
      id: uid(),
      sender: "bot",
      text: caption || "",
      timestamp: new Date(),
      nodeId,
      mediaUrl: safeMediaUrl,
      mediaType,
    };
    setMessages((prev) => {
      console.log("Media messages before:", prev.length, "after:", prev.length + 1);
      return [...prev, msg];
    });
  };

  const addSystemMessage = (text: string) => {
    const msg: Message = {
      id: uid(),
      sender: "system",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const addSuccessMessage = (text: string) => {
    const msg: Message = {
      id: uid(),
      sender: "success",
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, msg]);
  };

  const handleReset = () => {
    // Limpar todos os timeouts pendentes
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current = [];
    
    // Reativar o simulador
    setIsActive(true);
    
    setMessages([]);
    const emptyContext = {};
    setContext(emptyContext);
    onContextChange?.(emptyContext); // Notifica imediatamente o reset
    setIsWaitingInput(true); // Habilitar input desde o início
    setPendingVariable(null);
    setSelectedFile(null);
    setInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    
    const startNode = findStartNode();
    if (startNode) {
      setCurrentNodeId(startNode.id);
      executeNode(startNode);
      // Removido toast "Simulação iniciada" a pedido do usuário
    } else {
      toast.error("Adicione um bloco 'Start' para iniciar o fluxo");
      addSystemMessage("❌ Nenhum bloco 'Start' encontrado. Adicione um para iniciar.");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <CardHeader className={`flex-shrink-0 border-b ${channelStyle.headerBg}`}>
        <div className="flex items-center justify-between">
          <CardTitle className={`text-sm flex items-center gap-2 ${channelStyle.headerText}`}>
            <span>{channelStyle.icon}</span>
            <span>Simulador - {channelStyle.name}</span>
          </CardTitle>
          <Button size="sm" variant="outline" onClick={handleReset} className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full">
            <RotateCcw className="w-4 h-4 mr-2" />
            Reiniciar
          </Button>
        </div>
      </CardHeader>

      <CardContent className={`flex-1 min-h-0 flex flex-col p-0 overflow-hidden ${channelStyle.bg}`}>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.sender === "system" ? (
                  <div className={`w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${channel === 'telegram' ? 'text-gray-300 bg-[#1A2633]' : 'text-muted-foreground bg-white/60'}`}>
                    <AlertCircle className="w-3 h-3" />
                    <span>{msg.text}</span>
                  </div>
                ) : msg.sender === "success" ? (
                  <div className={`w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${channel === 'telegram' ? 'text-green-400 bg-[#1A2633]' : 'text-green-600 bg-green-50'}`}>
                    <CheckCircle className="w-3 h-3" />
                    <span>{msg.text}</span>
                  </div>
                ) : (
                  <div
                    className={`max-w-[80%] rounded-2xl overflow-hidden shadow-sm ${
                      msg.sender === "user"
                        ? `${channelStyle.userBubble} ${channel === 'facebook' || channel === 'telegram' || channel === 'instagram' ? 'text-white' : 'text-foreground'}`
                        : `${channelStyle.botBubble} ${channel === 'telegram' ? 'text-white' : 'text-foreground'}`
                    }`}
                  >
                    {msg.mediaUrl && (
                      <div className="w-full">
                        {msg.mediaType === "image" && (
                          <img 
                            src={msg.mediaUrl} 
                            alt={msg.text || "Mídia"} 
                            className="w-64 aspect-square max-w-full object-cover"
                            loading="lazy"
                            onError={(e) => {
                              console.error("Image failed to load:", msg.mediaUrl);
                              e.currentTarget.style.display = 'block';
                              e.currentTarget.alt = "Imagem indisponível";
                            }}
                          />
                        )}
                        {msg.mediaType === "video" && (
                          <video 
                            src={msg.mediaUrl} 
                            controls 
                            className="w-full max-w-xs"
                          />
                        )}
                        {msg.mediaType === "audio" && (
                          <audio 
                            src={msg.mediaUrl} 
                            controls 
                            className="w-full"
                          />
                        )}
                        {msg.mediaType === "file" && (
                          <div className="p-4 flex items-center gap-2">
                            <span>📄</span>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch(msg.mediaUrl, { credentials: 'omit' });
                                  const blob = await res.blob();
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement('a');
                                  const contentType = blob.type || '';
                                  const extMap: Record<string, string> = {
                                    'application/pdf': 'pdf',
                                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
                                    'application/vnd.ms-excel': 'xls',
                                    'text/csv': 'csv',
                                  };
                                  const inferredExt = extMap[contentType] || '';
                                  const urlName = msg.mediaUrl.split('/').pop()?.split('?')[0] || '';
                                  const urlExt = urlName.includes('.') ? (urlName.split('.').pop() || '') : '';
                                  const hasExtInText = !!(msg.text && /\.[a-z0-9]+$/i.test(msg.text));
                                  let baseName = (msg.text || urlName || 'arquivo').replace(/\?.*$/, '');
                                  let finalName = baseName;
                                  if (!hasExtInText) {
                                    const ext = (urlExt || inferredExt || 'pdf').toLowerCase();
                                    if (!finalName.toLowerCase().endsWith(`.${ext}`)) finalName = `${finalName}.${ext}`;
                                  }
                                  a.href = url;
                                  a.download = finalName;
                                  document.body.appendChild(a);
                                  a.click();
                                  a.remove();
                                  URL.revokeObjectURL(url);
                                } catch (err) {
                                  console.error('Falha ao baixar arquivo:', err);
                                  window.open(msg.mediaUrl, '_blank', 'noopener'); // fallback
                                }
                              }}
                              className="text-sm underline"
                            >
                              Baixar arquivo
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`flex items-start gap-2 ${msg.mediaUrl ? 'px-4 py-2' : 'px-4 py-2'}`}>
                      {msg.sender === "bot" && <Bot className="w-4 h-4 mt-0.5" />}
                      {msg.sender === "user" && <User className="w-4 h-4 mt-0.5" />}
                      <div className="flex-1">
                        {msg.text && <p className="text-sm whitespace-pre-wrap">{formatText(msg.text)}</p>}
                        
                        {msg.isListButton && msg.listSections && (
                          <div className="mt-3">
                            {expandedListId === msg.id ? (
                              <div className="border border-border rounded-lg overflow-hidden bg-background">
                                <div className="p-3 bg-muted border-b border-border flex items-center justify-between">
                                  <span className="text-sm font-medium">Selecione uma opção</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setExpandedListId(null)}
                                    className="h-6 px-2"
                                  >
                                    ✕
                                  </Button>
                                </div>
                                <ScrollArea className="max-h-[300px]">
                                  {msg.listSections.map((section, secIdx) => (
                                    <div key={secIdx}>
                                      {section.title && (
                                        <div className={`px-4 py-2 bg-muted/50 text-xs font-semibold ${channel === 'telegram' ? 'text-gray-300 bg-[#1A2633]' : 'text-muted-foreground'}`}>
                                          {section.title}
                                        </div>
                                      )}
                                      {section.items.map((item, itemIdx) => (
                                        <button
                                          key={itemIdx}
                                          onClick={() => {
                                            setExpandedListId(null);
                                            handleButtonClick({ 
                                              text: item.label, 
                                              value: item.value || item.label,
                                              buttonId: `section_${secIdx}_item_${itemIdx}`
                                            }, msg.nodeId);
                                          }}
                                          disabled={!isWaitingInput || msg.id !== activeListId}
                                          className={`w-full px-4 py-3 text-left hover:bg-accent/50 border-b border-border last:border-0 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${channel === 'telegram' ? 'text-white hover:bg-[#2B5278]/50' : ''}`}
                                        >
                                          <div className={`text-sm font-medium ${channel === 'telegram' ? 'text-white' : ''}`}>{item.label}</div>
                                          {item.description && (
                                            <div className={`text-xs mt-0.5 ${channel === 'telegram' ? 'text-gray-300' : 'text-muted-foreground'}`}>{item.description}</div>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  ))}
                                </ScrollArea>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setExpandedListId(msg.id)}
                                disabled={!isWaitingInput || msg.id !== activeListId}
                                className={`w-full justify-between ${channel === 'telegram' ? 'bg-[#3390EC] hover:bg-[#2B7FD9] text-white border-transparent' : ''}`}
                              >
                                <span>{msg.listButtonText || "Ver opções"}</span>
                                <span className="ml-2">▼</span>
                              </Button>
                            )}
                          </div>
                        )}
                        
                        {msg.buttons && msg.buttons.length > 0 && !msg.isListButton && (
                          <div className="mt-3 space-y-2">
                            {msg.buttons.map((button, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className={`w-full justify-start ${channel === 'telegram' ? 'bg-[#3390EC] hover:bg-[#2B7FD9] text-white border-transparent' : ''}`}
                                onClick={() => handleButtonClick(button, msg.nodeId)}
                                disabled={!isWaitingInput}
                              >
                                {button.text}
                              </Button>
                            ))}
                          </div>
                        )}
                        
                        <span className="text-xs opacity-70 mt-1 block">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {Object.keys(context).length > 0 && (
          <>
            <div className={`flex-shrink-0 max-h-40 overflow-y-auto ${channel === 'telegram' ? 'bg-[#1A2633]' : 'bg-muted/50'}`}>
              <div className="p-3">
                <h4 className={`text-xs font-medium mb-2 ${channel === 'telegram' ? 'text-gray-300' : ''}`}>📦 Contexto (Variáveis)</h4>
                <div className="space-y-1">
                  {Object.entries(context).map(([key, value]) => (
                    <div key={key} className="flex gap-2 text-xs">
                      <Badge variant="outline" className={`font-mono text-xs ${channel === 'telegram' ? 'text-white border-gray-600' : ''}`}>
                        {key}
                      </Badge>
                      <span className={`truncate ${channel === 'telegram' ? 'text-gray-400' : 'text-muted-foreground'}`}>
                        {typeof value === "object" 
                          ? JSON.stringify(value).substring(0, 50) + "..."
                          : String(value).substring(0, 50)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Separator />
          </>
        )}

        <div className={`flex-shrink-0 p-4 border-t ${channel === 'telegram' ? 'bg-[#1A2633] border-gray-700' : 'bg-background'}`}>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <div className="flex gap-2">
            {/* Botão de anexar arquivo - sempre visível */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              title="Anexar arquivo"
              className={`flex-shrink-0 rounded-full ${channel === 'telegram' ? 'bg-[#2B5278] hover:bg-[#3A6B92] text-white border-transparent' : ''}`}
            >
              📎
            </Button>
            
            <Input
              placeholder="Digite sua mensagem..."
              value={selectedFile ? `📎 ${selectedFile.name}` : input}
              onChange={(e) => {
                if (!selectedFile) setInput(e.target.value);
              }}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !selectedFile) handleSendMessage();
              }}
              readOnly={!!selectedFile}
              className={`rounded-full ${channel === 'telegram' ? 'bg-[#212D3B] text-white border-gray-600 placeholder:text-gray-400' : ''}`}
            />
            
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!selectedFile && !input.trim()}
              className={`rounded-full ${channelStyle.headerBg} ${channelStyle.headerText}`}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  );
};
