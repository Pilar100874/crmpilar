import { useState, useEffect, useRef } from "react";
import { Node, Edge } from "@xyflow/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Send, RotateCcw, User, Bot, AlertCircle, CheckCircle, Instagram, Facebook, Music2, Linkedin, Twitter, Youtube, ExternalLink, CheckCheck, RefreshCw, List as ListIcon, X as XIcon, Zap } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { validateEmail, validatePhone, validatePhoneFormat } from "@/lib/validators";
import { maskCNPJ } from "@/lib/masks";
import { BLOCK_DEFINITIONS } from "@/types/flow";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { loadActiveCatalogs, generateCatalogPdf } from "@/lib/catalogPdfGenerator";

interface SocialLink {
  platform: string; // instagram | facebook | tiktok | linkedin | twitter | youtube
  url: string;
  label?: string;
}

interface Message {
  id: string;
  sender: "user" | "bot" | "system" | "success";
  text: string;
  timestamp: Date;
  nodeId?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video" | "audio" | "file";
  buttons?: Array<{ text: string; value: string; buttonId?: string; keywords?: string[]; action?: { type: "url" | "copy" | "call" | "pix"; payload: string } }>;
  isListButton?: boolean;
  listButtonText?: string;
  listSections?: Array<{ title: string; items: Array<{ label: string; value: string; description?: string }> }>;
  socialLinks?: SocialLink[];
}

interface FlowSimulatorProps {
  nodes: Node[];
  edges: Edge[];
  onHighlightNode?: (nodeId: string | null) => void;
  breakpointNodes?: Set<string>;
  skipNodes?: Set<string>;
  onContextChange?: (context: Record<string, any>) => void;
  channel?: "whatsapp" | "facebook" | "instagram" | "telegram" | "webchat";
  provider?: "evolution" | "whatsapp_oficial";
  onProviderChange?: (provider: "evolution" | "whatsapp_oficial") => void;
}

export const FlowSimulator = ({ nodes, edges, onHighlightNode, breakpointNodes = new Set(), skipNodes = new Set(), onContextChange, channel = "whatsapp", provider = "evolution", onProviderChange }: FlowSimulatorProps) => {
  const isOficial = provider === "whatsapp_oficial" && channel === "whatsapp";
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
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const contextRef = useRef<Record<string, any>>({});
  const simNodeStateRef = useRef<Record<string, any>>({});
  const [realMode, setRealMode] = useState(false);
  const realModeRef = useRef(false);
  useEffect(() => { realModeRef.current = realMode; }, [realMode]);
  const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;

  // Configurações visuais por canal
  const getChannelStyles = () => {
    const styles = {
      whatsapp: {
        bg: "bg-[#E5DDD5] bg-[url('data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22120%22%20height%3D%22120%22%20viewBox%3D%220%200%20120%20120%22%3E%3Cg%20fill%3D%22%23d9d2c8%22%20fill-opacity%3D%220.45%22%3E%3Ccircle%20cx%3D%2210%22%20cy%3D%2210%22%20r%3D%221%22%2F%3E%3Ccircle%20cx%3D%2240%22%20cy%3D%2230%22%20r%3D%221%22%2F%3E%3Ccircle%20cx%3D%2270%22%20cy%3D%2260%22%20r%3D%221%22%2F%3E%3Ccircle%20cx%3D%22100%22%20cy%3D%2290%22%20r%3D%221%22%2F%3E%3Ccircle%20cx%3D%2220%22%20cy%3D%2280%22%20r%3D%221%22%2F%3E%3Ccircle%20cx%3D%2290%22%20cy%3D%2220%22%20r%3D%221%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E')]",
        userBubble: "bg-[#D9FDD3]",
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

  // Resolve os valores de um bloco text_content. Sempre prefere o runtime
  // (definido pelo novo fluxo Sim/Não → Digitar/IA) se existir; senão usa
  // o valor fixo configurado no bloco.
  const resolveTextContentValues = (tcNodeId: string, cfg: any) => {
    const runtime = simNodeStateRef.current[tcNodeId]?.resolvedTextContent;
    const pick = (key: "title" | "subtitle" | "body") => {
      if (runtime && runtime[key] !== undefined) {
        return (runtime[key] || "").toString().trim();
      }
      if (key === "body" && cfg["bodyEnabled"] === false) return "";
      return interpolateVariables(cfg[key] || "", contextRef.current).trim();
    };
    return { title: pick("title"), subtitle: pick("subtitle"), body: pick("body") };
  };

  // Procura recursivamente upstream por um bloco "text_content" conectado antes deste nó.
  const findUpstreamTextContent = (nodeId: string, visited = new Set<string>()): any | null => {
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);
    const incoming = edges.filter((e) => e.target === nodeId);
    for (const e of incoming) {
      const src = nodes.find((n) => n.id === e.source);
      if (!src) continue;
      const sd: any = src.data || {};
      if (sd.type === "text_content") {
        return resolveTextContentValues(src.id, sd.config || {});
      }
      // Permite "atravessar" no máximo 1 bloco intermediário leve (ex: send_message) — busca direta.
      const found = findUpstreamTextContent(src.id, visited);
      if (found) return found;
    }
    return null;
  };


  const buildLockedTextDirective = (tc: any): string => {
    if (!tc) return "";
    const t = (tc.title || "").trim();
    const s = (tc.subtitle || "").trim();
    const b = (tc.body || "").trim();
    if (!t && !s && !b) return "";
    const lines: string[] = [];
    if (t) lines.push(`  • Texto principal (maior destaque): ${t}`);
    if (s) lines.push(`  • Texto secundário (menor): ${s}`);
    if (b) lines.push(`  • Texto complementar (menor ainda): ${b}`);
    return [
      "TEXTO OBRIGATÓRIO NA IMAGEM (REGRA INVIOLÁVEL):",
      "Renderize na imagem APENAS os CONTEÚDOS de texto listados abaixo, com ortografia, acentuação e pontuação idênticas.",
      "PROIBIDO escrever na imagem as palavras 'TÍTULO', 'SUBTÍTULO', 'CORPO', 'TITLE', 'SUBTITLE', 'BODY' nem qualquer outro rótulo/label — esses nomes são apenas referência de hierarquia, NÃO devem aparecer na arte final.",
      "NÃO traduza, NÃO altere, NÃO invente, NÃO acrescente, NÃO substitua, NÃO abrevie.",
      "NÃO inclua nenhum outro texto, palavra, slogan, marca d'água ou número além dos conteúdos abaixo:",
      ...lines,
      "Hierarquia visual: o primeiro item em maior destaque, os seguintes em tamanho decrescente. Tipografia legível e bem posicionada.",
    ].join("\n");
  };

  // ====== content_type (Tipo de Conteúdo: Divulgação / Promoção / Institucional...) ======
  const CONTENT_TYPE_DIRECTIVES: Record<string, { label: string; rule: string; badgeText?: string }> = {
    divulgacao: {
      label: "Divulgação",
      badgeText: "DIVULGAÇÃO",
      rule:
        "OBJETIVO: peça de DIVULGAÇÃO/AWARENESS. Apresente o produto, serviço ou marca de forma atrativa, com estética convidativa e tom inspirador/lifestyle. Inclua um selo visual com o texto exato 'DIVULGAÇÃO'. PROIBIDO incluir preços, percentuais de desconto, selos de oferta, palavras como 'OFERTA', 'PROMOÇÃO', 'DESCONTO', '% OFF'. Composição mais leve, aspiracional, sem apelo de varejo.",
    },
    promocao: {
      label: "Promoção",
      badgeText: "PROMOÇÃO",
      rule:
        "OBJETIVO: peça PROMOCIONAL/COMERCIAL com foco em CONVERSÃO. Estética de varejo, energética, com hierarquia visual forte. Inclua um selo visual com o texto exato 'PROMOÇÃO'. Use cores vibrantes e contraste alto, sem preços ou percentuais se esses conteúdos não estiverem exatamente no título/subtítulo fornecidos.",
    },
    institucional: {
      label: "Institucional",
      badgeText: "INSTITUCIONAL",
      rule:
        "OBJETIVO: peça INSTITUCIONAL/BRANDING. Estética sóbria, elegante, minimalista, corporativa. Inclua um selo discreto com o texto exato 'INSTITUCIONAL'. Tipografia refinada, paleta contida. PROIBIDO ar de varejo, selos de desconto, urgência, preços, percentuais ou linguagem promocional. Foco em credibilidade, valores e posicionamento da marca.",
    },
    evento: {
      label: "Evento",
      badgeText: "EVENTO",
      rule:
        "OBJETIVO: CONVITE/ANÚNCIO de evento. Estética de pôster/flyer com forte hierarquia visual. Inclua um selo visual com o texto exato 'EVENTO'. Só destaque nome do evento, data ou local se esses conteúdos estiverem exatamente no título/subtítulo fornecidos. Atmosfera coerente com o tema do evento, sem texto extra.",
    },
    lancamento: {
      label: "Lançamento",
      badgeText: "LANÇAMENTO",
      rule:
        "OBJETIVO: peça de LANÇAMENTO de produto/serviço. Estética premium e dramática, iluminação cinematográfica, produto em primeiro plano. Inclua um selo visual com o texto exato 'LANÇAMENTO'. Sem apelo promocional/desconto.",
    },
    educacional: {
      label: "Educacional / Informativo",
      badgeText: "DICA",
      rule:
        "OBJETIVO: peça EDUCACIONAL/INFORMATIVA (dica, tutorial, conteúdo de valor). Estética clean e didática, hierarquia clara de informação, similar a um post de carrossel informativo. Inclua um selo visual com o texto exato 'DICA'. SEM apelo comercial agressivo, SEM preços, SEM ofertas.",
    },
    custom: {
      label: "Personalizado",
      rule: "",
    },
  };

  const resolveContentTypeValue = (ctNodeId: string, cfg: any): { type: string; guidance: string; useBadge: boolean } => {
    const runtime = simNodeStateRef.current[ctNodeId]?.resolvedContentType;
    const fromAsk = runtime?.contentType ? String(runtime.contentType).trim().toLowerCase() : "";
    const fixed = (cfg.contentType || "divulgacao").toString().trim().toLowerCase();
    const chosen = cfg.mode === "ask" ? (fromAsk || fixed) : fixed;
    const normalized = CONTENT_TYPE_DIRECTIVES[chosen] ? chosen : "custom";
    return {
      type: normalized,
      guidance: interpolateVariables(cfg.customGuidance || "", contextRef.current).trim(),
      useBadge: cfg.useBadge !== false,
    };
  };

  const findUpstreamContentType = (nodeId: string, visited = new Set<string>()): { type: string; guidance: string; useBadge: boolean } | null => {
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);
    const incoming = edges.filter((e) => e.target === nodeId);
    for (const e of incoming) {
      const src = nodes.find((n) => n.id === e.source);
      if (!src) continue;
      const sd: any = src.data || {};
      if (sd.type === "content_type") {
        return resolveContentTypeValue(src.id, sd.config || {});
      }
      const found = findUpstreamContentType(src.id, visited);
      if (found) return found;
    }
    return null;
  };

  // ====== Upstream "Influencer?" e "Imagem do Produto?" ======
  // Procura recursivamente blocos ask_influencer / ask_product_image antes deste nó
  // e devolve as URLs e descrições já confirmadas pelo usuário no simulador.
  const findUpstreamPiecaRefs = (
    nodeId: string,
    visited = new Set<string>(),
  ): { influencerUrl?: string; productUrl?: string; productDescription?: string } => {
    const out: { influencerUrl?: string; productUrl?: string; productDescription?: string } = {};
    if (visited.has(nodeId)) return out;
    visited.add(nodeId);
    const incoming = edges.filter((e) => e.target === nodeId);
    for (const e of incoming) {
      const src = nodes.find((n) => n.id === e.source);
      if (!src) continue;
      const sd: any = src.data || {};
      const cfg = sd.config || {};
      const state = simNodeStateRef.current[src.id] || {};
      if (sd.type === "ask_influencer" && !out.influencerUrl) {
        const v = state.influencerImageUrl
          || (contextRef.current as any)?.[normalizeVarName(cfg.outputVariable || "influencer_image_url")];
        if (v) out.influencerUrl = String(v);
      }
      if (sd.type === "ask_product_image") {
        const url = state.productImageUrl
          || (contextRef.current as any)?.[normalizeVarName(cfg.outputImageVariable || "produto_imagem_url")];
        const desc = state.productDescription
          || (contextRef.current as any)?.[normalizeVarName(cfg.outputDescVariable || "produto_descricao")];
        if (url && !out.productUrl) out.productUrl = String(url);
        if (desc && !out.productDescription) out.productDescription = String(desc);
      }
      const upstream = findUpstreamPiecaRefs(src.id, visited);
      if (!out.influencerUrl && upstream.influencerUrl) out.influencerUrl = upstream.influencerUrl;
      if (!out.productUrl && upstream.productUrl) out.productUrl = upstream.productUrl;
      if (!out.productDescription && upstream.productDescription) out.productDescription = upstream.productDescription;
    }
    return out;
  };

  // Diretriz para textos marcados como "Gerar por IA" no bloco Conteúdo de Texto upstream
  const buildAITextDirective = (nodeId: string): string => {
    const visited = new Set<string>();
    const walk = (id: string): any | null => {
      if (visited.has(id)) return null;
      visited.add(id);
      const incoming = edges.filter((e) => e.target === id);
      for (const e of incoming) {
        const src = nodes.find((n) => n.id === e.source);
        if (!src) continue;
        const sd: any = src.data || {};
        if (sd.type === "text_content") return sd.config || {};
        const r = walk(src.id);
        if (r) return r;
      }
      return null;
    };
    const cfg = walk(nodeId);
    if (!cfg) return "";
    const aiFields: Array<{ key: string; label: string; hint: string }> = [];
    (["title", "subtitle", "body"] as const).forEach((k) => {
      if (k === "body" && cfg.bodyEnabled === false) return;
      if (cfg[`${k}Mode`] === "ai") {
        aiFields.push({
          key: k,
          label: k === "title" ? "principal (maior destaque)" : k === "subtitle" ? "secundário (menor)" : "complementar (menor ainda)",
          hint: (cfg[`${k}AIHint`] || "").trim(),
        });
      }
    });
    if (!aiFields.length) return "";
    return [
      "TEXTOS A SEREM CRIADOS PELA IA (escreva você mesmo, em Português Brasileiro, curtos e legíveis):",
      ...aiFields.map((f) => `- Texto ${f.label}${f.hint ? ` — orientação: ${f.hint}` : ""}`),
      "Renderize APENAS o CONTEÚDO desses textos na imagem. PROIBIDO escrever rótulos como 'TÍTULO', 'SUBTÍTULO', 'CORPO', 'TITLE', 'SUBTITLE', 'BODY' ou similar na arte final.",
      "Esses textos devem ser coerentes com o tipo de conteúdo, produto e influencer (quando houver), e renderizados de forma legível na imagem com hierarquia visual clara.",
    ].join("\n");
  };


  const buildContentTypeDirective = (ct: { type: string; guidance: string; useBadge: boolean } | null): string => {
    if (!ct) return "";
    const meta = CONTENT_TYPE_DIRECTIVES[ct.type];
    const blocks: string[] = [];
    if (meta?.rule) blocks.push(meta.rule);
    if (ct.useBadge && meta?.badgeText) {
      blocks.push(`SELO OBRIGATÓRIO NA IMAGEM: crie um selo/badge profissional, integrado ao layout e legível, com o texto EXATO "${meta.badgeText}". Este selo é autorizado mesmo quando houver regra de não adicionar textos extras, pois faz parte do Tipo de Conteúdo selecionado.`);
    }
    if (ct.guidance) blocks.push(`ORIENTAÇÃO ADICIONAL OBRIGATÓRIA: ${ct.guidance}`);
    if (!blocks.length) return "";
    return [
      `TIPO DE CONTEÚDO (REGRA INVIOLÁVEL — ${meta?.label || ct.type}):`,
      ...blocks,
      "Essas regras se sobrepõem ao estilo padrão do preset quando houver conflito.",
    ].join("\n");
  };

  const runAIMediaGeneration = async (node: Node, prompt: string, userRefImageUrl?: string | null) => {
    const config = (node.data as any).config || {};
    const variations = Math.max(1, Math.min(6, parseInt(config.variations) || 4));
    const userPrompt = interpolateVariables(prompt || config.basePrompt || "criativo", contextRef.current).trim();
    const basePrompt = interpolateVariables(config.basePrompt || "", contextRef.current).trim();
    const lockedTextDirective = buildLockedTextDirective(findUpstreamTextContent(node.id));
    const contentType = findUpstreamContentType(node.id);
    const contentTypeDirective = buildContentTypeDirective(contentType);
    const contentTypeBadge = contentType && contentType.useBadge ? CONTENT_TYPE_DIRECTIVES[contentType.type]?.badgeText : "";
    const aiTextDirective = buildAITextDirective(node.id);
    const upstreamPieca = findUpstreamPiecaRefs(node.id);

    // Regra GLOBAL: nada além do título/subtítulo definidos (ou nada de texto, se não houver).
    const hasAnyText = !!(lockedTextDirective || aiTextDirective);
    const noExtraTextDirective = hasAnyText
      ? `REGRA ABSOLUTA DE TEXTO NA IMAGEM: renderize SOMENTE os textos especificados acima (título/subtítulo)${contentTypeBadge ? ` e o selo obrigatório "${contentTypeBadge}"` : ""}. PROIBIDO acrescentar QUALQUER outro texto, palavra, frase, slogan, call-to-action, hashtag, URL, telefone, endereço, preço, percentual, número, código, rótulo (como 'TÍTULO', 'SUBTÍTULO', 'TITLE', 'SUBTITLE'), legenda, marca d'água ou assinatura. NÃO copie nem invente textos vindos da identidade visual, referências, embalagens, exemplos, marca, campanha ou preset. Não use texto decorativo, microtexto, textos falsos, letras aleatórias, placas, botões${contentTypeBadge ? " além do selo autorizado" : ", selos"} ou etiquetas. Apenas o conteúdo textual listado, nada mais.`
      : `REGRA ABSOLUTA DE TEXTO NA IMAGEM: NÃO escreva NENHUM texto na imagem${contentTypeBadge ? `, exceto o selo obrigatório "${contentTypeBadge}"` : ""}. Sem palavras, frases, slogans, hashtags, URLs, telefones, endereços, preços, percentuais, números, códigos, rótulos, legendas, marcas d'água ou assinaturas. NÃO copie nem invente textos vindos da identidade visual, referências, embalagens, exemplos, marca, campanha ou preset. Não use texto decorativo, microtexto, textos falsos, letras aleatórias, placas, botões${contentTypeBadge ? " além do selo autorizado" : ", selos"} ou etiquetas.${contentTypeBadge ? "" : " Imagem 100% sem texto."}`;

    // Regra GLOBAL: logo da empresa sempre presente na peça.
    const logoMandatoryDirective = "LOGO DA EMPRESA (OBRIGATÓRIO): incorpore o LOGO da empresa fornecido como referência na peça final, de forma elegante, legível e bem posicionada (geralmente em um canto), preservando fielmente cores, formas e proporções originais do logo. NÃO recrie, NÃO redesenhe, NÃO traduza, NÃO altere o logo — use-o tal qual a referência.";

    const imageRefSource = config.imageRefSource || "user";
    const imageAspectRatio = config.aspectRatio || (config.preset === "story_vertical" ? "9:16" : "1:1");

    // Resolve reference image(s) — coleta TODAS (produto + influencer + logo + extras)
    // para compor uma única cena. Ordem: produto (#1), influencer (#2), logo, demais.
    let refImageUrl: string | null = userRefImageUrl || null;
    let primaryRefKey: string = userRefImageUrl ? "usuario" : "";
    const extraRefs: Array<{ key: string; url: string }> = [];

    const _styleSourceForRefs = config.styleSource || "visual_identity";
    const presetRolesFilled = new Set<string>();

    // ⭐ PRIORIDADE: quando um PRESET está selecionado, as referências do preset
    // mandam sobre as capturadas pelo roteiro (upstream). Processamos primeiro.
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
        presetRolesFilled.add(key);
        if (!refImageUrl) {
          refImageUrl = val;
          primaryRefKey = key;
          addSystemMessage(`🎨 [PRESET] Referência principal: ${label}`);
          addBotMediaMessage(refImageUrl, "image", "Referência principal (preset)", node.id);
        } else if (!extraRefs.some((e) => e.url === val) && val !== refImageUrl) {
          extraRefs.push({ key, url: val });
          addSystemMessage(`➕ [PRESET] Referência adicional: ${label}`);
          addBotMediaMessage(val, "image", `Referência preset (${key})`, node.id);
        }
      }
    }

    // Injeta referências capturadas pelos blocos upstream do roteiro
    // (Imagem do Produto / Influencer) — só preenche papéis que o PRESET não cobriu.
    if (upstreamPieca.productUrl && !presetRolesFilled.has("productImageSelect")) {
      if (!refImageUrl) {
        refImageUrl = upstreamPieca.productUrl;
        primaryRefKey = "productImageSelect";
        addSystemMessage(`🛍️ Usando imagem do produto capturada no roteiro.`);
        addBotMediaMessage(refImageUrl, "image", "Produto", node.id);
      } else if (!extraRefs.some((r) => r.url === upstreamPieca.productUrl)) {
        extraRefs.push({ key: "productImageSelect", url: upstreamPieca.productUrl });
      }
    } else if (upstreamPieca.productUrl && presetRolesFilled.has("productImageSelect")) {
      addSystemMessage(`ℹ️ Produto do roteiro ignorado — preset já define o produto.`);
    }
    if (upstreamPieca.influencerUrl && !presetRolesFilled.has("galleryInfluencer")) {
      if (!refImageUrl) {
        refImageUrl = upstreamPieca.influencerUrl;
        primaryRefKey = "galleryInfluencer";
        addSystemMessage(`👤 Usando foto do influencer capturada no roteiro.`);
        addBotMediaMessage(refImageUrl, "image", "Influencer", node.id);
      } else if (!extraRefs.some((r) => r.url === upstreamPieca.influencerUrl)) {
        extraRefs.push({ key: "galleryInfluencer", url: upstreamPieca.influencerUrl });
        addSystemMessage(`👤 Influencer adicionado como referência secundária.`);
      }
    } else if (upstreamPieca.influencerUrl && presetRolesFilled.has("galleryInfluencer")) {
      addSystemMessage(`ℹ️ Influencer do roteiro ignorado — preset já define o influencer.`);
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

    // 🏷️ LOGO SEMPRE PRESENTE: busca o logo da empresa e injeta como referência,
    // a menos que o preset já tenha definido um logo explícito.
    try {
      if (!presetRolesFilled.has("galleryLogo")) {
        const estIdForLogo = await getEstabelecimentoId();
        if (estIdForLogo) {
          const { data: ecomCfg } = await supabase
            .from("ecommerce_config")
            .select("logo_url")
            .eq("estabelecimento_id", estIdForLogo)
            .maybeSingle();
          const logoUrl = (ecomCfg as any)?.logo_url || "";
          if (logoUrl && logoUrl !== refImageUrl && !extraRefs.some((r) => r.url === logoUrl)) {
            extraRefs.push({ key: "galleryLogo", url: logoUrl });
            addSystemMessage(`🏷️ Logo da empresa adicionado como referência obrigatória.`);
          } else if (!logoUrl) {
            addSystemMessage(`⚠️ Logo da empresa não configurado em E-commerce → Branding. A peça será gerada sem o logo.`);
          }
        }
      }
    } catch (e) {
      console.warn("[FlowSimulator] Falha ao buscar logo da empresa:", e);
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
        "wavespeed/seedance-2.0": "wavespeed/seedance-2.0",
        "wavespeed/kling-2.6": "wavespeed/kling-2.6",
        "wavespeed/wan-2.5": "wavespeed/wan-2.5",
        "wavespeed/ltx-video": "wavespeed/ltx-video",
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
        contentTypeDirective ? `\n\n${contentTypeDirective}` : "",
        lockedTextDirective ? `\n\n${lockedTextDirective}` : "",
        aiTextDirective ? `\n\n${aiTextDirective}` : "",
        `\n\n${noExtraTextDirective}`,
        `\n\n${logoMandatoryDirective}`,
        upstreamPieca.productDescription ? `\n\nPRODUTO (descrição do usuário): ${upstreamPieca.productDescription}` : "",
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
              prompt: `${userPrompt}${contentTypeDirective ? `\n\n${contentTypeDirective}` : ""}${lockedTextDirective ? `\n\n${lockedTextDirective}` : ""}${aiTextDirective ? `\n\n${aiTextDirective}` : ""}\n\n${noExtraTextDirective}\n\n${logoMandatoryDirective}${upstreamPieca.productDescription ? `\n\nPRODUTO (descrição do usuário): ${upstreamPieca.productDescription}` : ""}\n\nGere somente a opção ${optionIndex + 1} de ${variations}. Mantenha o mesmo briefing, identidade visual e formato ${imageAspectRatio}; varie apenas ângulo, enquadramento ou composição.${contentTypeDirective ? " Respeite ESTRITAMENTE o TIPO DE CONTEÚDO definido acima." : ""}${lockedTextDirective ? " O TEXTO renderizado na imagem deve ser EXATAMENTE o especificado — não varie, não traduza, não invente." : ""}${aiTextDirective ? " Para os textos marcados como GERAR PELA IA, crie textos curtos coerentes em PT-BR." : ""} O LOGO da empresa DEVE aparecer na peça final.`,
              basePrompt,
              variations: 1,
              contentTypeBadge,
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
      // Mostra cada opção como botão clicável + Cancelar / Gerar novas
      const selectButtons = items.map((it) => ({
        text: `✅ Usar opção ${it.index}`,
        value: `pick_${it.index}`,
        buttonId: `aim_pick_${it.index}`,
      }));
      selectButtons.push({ text: `🔄 Gerar ${variations} novas`, value: "regen", buttonId: "aim_regen" });
      selectButtons.push({ text: "❌ Cancelar", value: "cancel", buttonId: "aim_cancel" });
      setMessages((prev) => [...prev, {
        id: uid(),
        sender: "bot",
        text: "Qual opção você quer usar? (Ou gere novas / cancele)",
        timestamp: new Date(),
        nodeId: node.id,
        buttons: selectButtons,
      }]);
      simNodeStateRef.current[node.id] = { items };
      setIsWaitingInput(true);
      setCurrentBlockType("ai_media_select");
      setPendingVariable(`__aims_${node.id}`);
      setCurrentNodeId(node.id);

    } catch (e: any) {
      addSystemMessage(`❌ Erro ao gerar imagens: ${e?.message || e}`);
    }
  };

  // Helper extraído: executa a publicação social para um conjunto de plataformas
  const runPublishSocial = (node: Node, selectedPlatforms: string[]) => {
    const config = (node.data as any).config || {};
    const caption = interpolateVariables(config.caption || "", contextRef.current);
    const mediaUrl = interpolateVariables(config.mediaUrl || "", contextRef.current);

    addSystemMessage(`📤 Publicando em: ${selectedPlatforms.join(", ")}${mediaUrl ? "\n🖼️ " + mediaUrl : ""}${caption ? "\n📝 " + caption : ""}`);

    safeSetTimeout(() => {
      const fakeId = `sim_${Date.now()}`;
      const platformUrlBuilders: Record<string, (id: string) => string> = {
        instagram: (id) => `https://instagram.com/p/${id}`,
        facebook: (id) => `https://facebook.com/posts/${id}`,
        tiktok: (id) => `https://tiktok.com/@usuario/video/${id}`,
        linkedin: (id) => `https://linkedin.com/feed/update/${id}`,
        twitter: (id) => `https://x.com/usuario/status/${id}`,
        youtube: (id) => `https://youtube.com/watch?v=${id}`,
      };
      const platformLabels: Record<string, string> = {
        instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
        linkedin: "LinkedIn", twitter: "X (Twitter)", youtube: "YouTube",
      };
      const links: SocialLink[] = selectedPlatforms.map((p) => ({
        platform: p,
        url: (platformUrlBuilders[p] || ((id) => `https://${p}.com/${id}`))(fakeId),
        label: platformLabels[p] || p,
      }));
      const outputVar = normalizeVarName(config.outputVariable || "post_publicado");
      const result = {
        id: fakeId,
        permalinks: links.reduce<Record<string, string>>((acc, l) => { acc[l.platform] = l.url; return acc; }, {}),
        platforms: selectedPlatforms,
      };
      const newCtx = {
        ...contextRef.current,
        [outputVar]: result,
        [`${outputVar}_id`]: fakeId,
        [`${outputVar}_permalink`]: links[0]?.url || "",
      };
      contextRef.current = newCtx;
      setContext(newCtx);
      onContextChange?.(newCtx);

      const linksText = links
        .map((l) => `${l.label}\n${l.url}`)
        .join("\n\n");
      setMessages((prev) => [...prev, {
        id: uid(),
        sender: "bot",
        text: `✅ Publicado com sucesso!\n\n${linksText}`,
        timestamp: new Date(),
        nodeId: node.id,
        socialLinks: links,
      }]);

      safeSetTimeout(() => {
        setMessages((prev) => [...prev, {
          id: uid(),
          sender: "bot",
          text: "O que deseja fazer agora?",
          timestamp: new Date(),
          nodeId: node.id,
          buttons: [
            { text: "✅ Finalizar", value: "finalizar", buttonId: "pub_done" },
            { text: "🔁 Gerar nova peça", value: "regenerar", buttonId: "pub_regen" },
          ],
        }]);
        setIsWaitingInput(true);
        setCurrentBlockType("publish_social_done");
        setCurrentNodeId(node.id);
      }, 500);
    }, 1500);
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
        let mediaType = config.media?.type || config.mediaType || "image";
        const mediaUrl = interpolateVariables(config.media?.url || config.url || config.mediaUrl || "", context);
        const caption = interpolateVariables(config.media?.caption || config.caption || "", context);
        // Auto-detect tipo pela extensão da URL (sobrepõe mediaType incorreto como "file")
        const _urlLow = mediaUrl.toLowerCase().split("?")[0];
        if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|heic)$/.test(_urlLow)) mediaType = "image";
        else if (/\.(mp4|webm|mov|m4v|3gp|mkv)$/.test(_urlLow)) mediaType = "video";
        else if (/\.(mp3|wav|ogg|m4a|aac|opus)$/.test(_urlLow)) mediaType = "audio";
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

      case "goodbye": {
        const goodbyeText = interpolateVariables(config.message || config.text || "Até logo!", context);

        const SOCIAL_ICONS: Record<string, string> = {
          whatsapp: "🟢",
          instagram: "📸",
          facebook: "📘",
          website: "🌐",
          tiktok: "🎵",
          youtube: "▶️",
          linkedin: "💼",
          telegram: "✈️",
          twitter: "🐦",
          threads: "🧵",
          pinterest: "📌",
        };
        const SOCIAL_LABELS: Record<string, string> = {
          whatsapp: "WhatsApp",
          instagram: "Instagram",
          facebook: "Facebook",
          website: "Website",
          tiktok: "TikTok",
          youtube: "YouTube",
          linkedin: "LinkedIn",
          telegram: "Telegram",
          twitter: "X (Twitter)",
          threads: "Threads",
          pinterest: "Pinterest",
        };
        const SOCIAL_KEYS = ["whatsapp","instagram","facebook","website","tiktok","youtube","linkedin","telegram","twitter","threads","pinterest"];
        const enabledMap: Record<string, boolean> = {
          whatsapp: !!config.socialWhatsApp,
          instagram: !!config.socialInstagram,
          facebook: !!config.socialFacebook,
          website: !!config.socialWebsite,
          tiktok: !!config.socialTiktok,
          youtube: !!config.socialYoutube,
          linkedin: !!config.socialLinkedin,
          telegram: !!config.socialTelegram,
          twitter: !!config.socialTwitter,
          threads: !!config.socialThreads,
          pinterest: !!config.socialPinterest,
        };

        (async () => {
          let fullText = goodbyeText;
          if (config.showSocialButtons) {
            try {
              const estId = await getEstabelecimentoId();
              if (estId) {
                const { data: rs } = await supabase
                  .from("redes_sociais")
                  .select("whatsapp,instagram,facebook,website,tiktok,youtube,linkedin,telegram,twitter,threads,pinterest")
                  .eq("estabelecimento_id", estId)
                  .maybeSingle();
                if (rs) {
                  const lines: string[] = [];
                  for (const k of SOCIAL_KEYS) {
                    if (!enabledMap[k]) continue;
                    const url = ((rs as any)[k] || "").toString().trim();
                    if (!url) continue;
                    lines.push(`${SOCIAL_ICONS[k]} *${SOCIAL_LABELS[k]}*: ${url}`);
                  }
                  if (lines.length > 0) {
                    fullText += `\n\n*Nos acompanhe nas nossas redes:*\n${lines.join("\n")}`;
                  }
                }
              }
            } catch (e) {
              console.error("[goodbye] erro buscando redes_sociais:", e);
            }
          }

          const showRestart = config.showStartAgainButton !== false;
          const messageId = `msg-${Date.now()}-goodbye`;
          setMessages((prev) => [
            ...prev,
            {
              id: messageId,
              sender: "bot",
              text: fullText,
              timestamp: new Date(),
              nodeId: node.id,
              buttons: showRestart
                ? [{ text: "🔄 Recomeçar", value: "__restart__", buttonId: "recomeçar" }]
                : undefined,
            },
          ]);
          setIsWaitingInput(showRestart);
        })();

        setCurrentNodeId(node.id);
        break;
      }

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

      case "attach_catalog": {
        try {
          const mode: "latest" | "specific" = config.mode === "specific" ? "specific" : "latest";
          const caption = interpolateVariables(config.caption || "", context);
          const mediaTitle = interpolateVariables(config.mediaTitle || "", context);
          const mediaDescription = interpolateVariables(config.mediaDescription || caption || "", context);
          const mediaFooter = interpolateVariables(config.mediaFooter || "", context);

          // Mensagem "aguarde..." configurável
          if (config.waitingMessageEnabled !== false) {
            const waitMsg = interpolateVariables(
              config.waitingMessage || "⏳ Aguarde... gerando catálogo em tempo real.",
              context
            );
            addBotMessage(waitMsg, node.id);
          }

          const allCatalogs = await loadActiveCatalogs();
          if (allCatalogs.length === 0) {
            addSystemMessage("❌ Nenhum catálogo ativo disponível.");
            break;
          }

          let targets = [] as typeof allCatalogs;
          if (mode === "latest") {
            targets = [allCatalogs[0]]; // já vem ordenado por updated_at desc
          } else {
            const ids: string[] = Array.isArray(config.catalogIds) ? config.catalogIds : [];
            targets = allCatalogs.filter((c) => ids.includes(c.id));
            if (targets.length === 0) {
              addSystemMessage("❌ Nenhum catálogo selecionado foi encontrado entre os ativos.");
              break;
            }
          }

          let sucesso = 0;
          for (const cat of targets) {
            try {
              const result = await generateCatalogPdf(cat);
              if (!result) {
                addSystemMessage(`⚠️ Catálogo "${cat.nome}" está incompleto e foi ignorado.`);
                continue;
              }
              // Título antes do PDF (em negrito, como no WhatsApp)
              if (mediaTitle) {
                addBotMessage(`*${mediaTitle}*`, node.id);
              }
              addBotMediaMessage(result.url, "file", mediaDescription || cat.nome, node.id);
              // Rodapé depois
              if (mediaFooter) {
                addBotMessage(`_${mediaFooter}_`, node.id);
              }
              sucesso++;
            } catch (err: any) {
              addSystemMessage(`❌ Erro ao gerar "${cat.nome}": ${err?.message || err}`);
            }
          }

          const outputVar = normalizeVarName(config.outputVariable || "catalogo_enviado");
          if (outputVar) {
            setContext((prev) => ({ ...prev, [outputVar]: sucesso > 0 ? "Sucesso" : "Falha" }));
          }

          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) {
              setCurrentNodeId(nextNode.id);
              executeNode(nextNode);
            }
          }, 500);
        } catch (e: any) {
          addSystemMessage(`❌ Erro ao anexar catálogo: ${e?.message || e}`);
        }
        break;
      }

      case "reply_buttons":
        const replyHeader = interpolateVariables(config.header || "", context);
        const replyText = interpolateVariables(config.text || "", context);
        const replyFooter = interpolateVariables(config.footer || "", context);
        let replyButtons = config.buttons || [];
        const replyImage = config.image || config.mediaUrl;
        
        console.log("reply_buttons config:", { replyButtons, variable: config.variable, context });
        
        // WhatsApp Oficial: máx 3 botões de resposta rápida
        if (isOficial && replyButtons.length > 3) {
          addSystemMessage(`⚠️ WhatsApp Oficial permite no máximo 3 botões. ${replyButtons.length - 3} botão(ões) ignorado(s).`);
          replyButtons = replyButtons.slice(0, 3);
        }
        
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

      case "buttons_media": {
        const bmTitle = interpolateVariables(config.title || "", context);
        const bmDesc = interpolateVariables(config.description || "", context);
        const bmFooter = interpolateVariables(config.footer || "", context);
        const bmMedia = config.thumbnailUrl || config.mediaUrl || config.image;
        const bmMediaType = config.mediaType || "image";
        let bmButtons = config.buttons || [];

        // WhatsApp Oficial: máx 3 botões; áudio não é suportado como header interativo
        if (isOficial) {
          if (bmButtons.length > 3) {
            addSystemMessage(`⚠️ WhatsApp Oficial permite no máximo 3 botões. ${bmButtons.length - 3} ignorado(s).`);
            bmButtons = bmButtons.slice(0, 3);
          }
          if (bmMediaType === "audio") {
            addSystemMessage("⚠️ WhatsApp Oficial não permite áudio como header de mensagem interativa.");
          }
        }

        // Monta um card unificado: mídia + título + descrição + (rodapé) + botões
        const parts: string[] = [];
        if (bmTitle) parts.push(`*${bmTitle}*`);
        if (bmDesc) parts.push(bmDesc);
        if (bmFooter) parts.push(`_${bmFooter}_`);
        const unifiedText = parts.join("\n\n") || (bmButtons.length > 0 ? "Escolha uma opção:" : "");

        setMessages((prev) => [...prev, {
          id: uid(),
          sender: "bot",
          text: unifiedText,
          mediaUrl: bmMedia || undefined,
          mediaType: bmMedia ? bmMediaType : undefined,
          timestamp: new Date(),
          nodeId: node.id,
          buttons: bmButtons.map((btn: any, idx: number) => {
            const label = btn.displayText || btn.label || btn.text || `Botão ${idx + 1}`;
            const id = btn.id || btn.value || `button_${idx}`;
            return {
              text: label,
              value: label,
              buttonId: String(id),
            };
          }),
        }]);

        if (bmButtons.length > 0) {
          setIsWaitingInput(true);
          setCurrentBlockType("reply_buttons");
          setPendingVariable(normalizeVarName(config.variable || "resposta_botao"));
        }
        break;
      }

      case "button_url":
      case "button_copy":
      case "button_call":
      case "button_pix": {
        const t = interpolateVariables(config.title || "", context);
        const d = interpolateVariables(config.description || "", context);
        const f = interpolateVariables(config.footer || "", context);

        let actionLabel = config.displayText || "";
        let extraLine = "";
        let actionInfo: { type: "url" | "copy" | "call" | "pix"; payload: string } | undefined;
        if (nodeData.type === "button_url") {
          const rawUrl = interpolateVariables(config.url || "", context);
          actionLabel = actionLabel || (rawUrl ? `🔗 Abrir` : "Visitar");
          if (!actionLabel.startsWith("🔗")) actionLabel = `🔗 ${actionLabel}`;
          if (rawUrl) actionInfo = { type: "url", payload: rawUrl };
        } else if (nodeData.type === "button_copy") {
          const code = interpolateVariables(config.copyCode || "", context);
          actionLabel = `📋 ${actionLabel || `Copiar ${code || ""}`}`.trim();
          if (code) { extraLine = `Código: *${code}*`; actionInfo = { type: "copy", payload: code }; }
        } else if (nodeData.type === "button_call") {
          const phone = interpolateVariables(config.phoneNumber || "", context);
          actionLabel = `📞 ${actionLabel || phone || "Ligar"}`;
          if (phone) { extraLine = `Telefone: ${phone}`; actionInfo = { type: "call", payload: phone }; }
        } else if (nodeData.type === "button_pix") {
          actionLabel = `💠 Pagar com Pix (${config.currency || "BRL"})`;
          const parts: string[] = [];
          if (config.keyType) parts.push(String(config.keyType).toUpperCase());
          if (config.pixKey) parts.push(config.pixKey);
          if (config.name) parts.push(config.name);
          if (parts.length) extraLine = parts.join(" • ");
          if (config.pixKey) actionInfo = { type: "pix", payload: String(config.pixKey) };
        }

        const parts: string[] = [];
        if (t) parts.push(`*${t}*`);
        if (d) parts.push(d);
        if (extraLine) parts.push(extraLine);
        if (f) parts.push(`_${f}_`);

        setMessages((prev) => [...prev, {
          id: uid(),
          sender: "bot",
          text: parts.join("\n\n"),
          timestamp: new Date(),
          nodeId: node.id,
          buttons: [{
            text: actionLabel,
            value: actionLabel,
            buttonId: `action_${nodeData.type}`,
            action: actionInfo,
          }],
        }]);

        // Botões de ação não esperam resposta — auto-avança
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
          else { addSuccessMessage("Fluxo concluído!"); }
        }, 800);
        break;
      }

      case "buttons_mixed": {
        const bmxTitle = interpolateVariables(config.title || "", context);
        const bmxDesc = interpolateVariables(config.description || "", context);
        const bmxFooter = interpolateVariables(config.footer || "", context);
        let bmxButtons = config.buttons || [];

        if (isOficial && bmxButtons.length > 3) {
          addSystemMessage(`⚠️ WhatsApp Oficial permite no máximo 3 botões. ${bmxButtons.length - 3} ignorado(s).`);
          bmxButtons = bmxButtons.slice(0, 3);
        }

        const iconFor: Record<string, string> = { url: "🔗", copy: "📋", call: "📞", reply: "💬", pix: "💠" };
        const parts: string[] = [];
        if (bmxTitle) parts.push(`*${bmxTitle}*`);
        if (bmxDesc) parts.push(bmxDesc);
        if (bmxFooter) parts.push(`_${bmxFooter}_`);

        const renderedButtons = bmxButtons.map((b: any, idx: number) => {
          const icon = iconFor[b.type] || "▫️";
          const label = b.displayText || b.label || b.text || `Botão ${idx + 1}`;
          let action: { type: "url" | "copy" | "call" | "pix"; payload: string } | undefined;
          if (b.type === "url" && b.url) action = { type: "url", payload: interpolateVariables(String(b.url), context) };
          else if (b.type === "copy" && (b.copyCode || b.code)) action = { type: "copy", payload: interpolateVariables(String(b.copyCode || b.code), context) };
          else if (b.type === "call" && (b.phoneNumber || b.phone)) action = { type: "call", payload: interpolateVariables(String(b.phoneNumber || b.phone), context) };
          else if (b.type === "pix" && (b.pixKey || b.key)) action = { type: "pix", payload: interpolateVariables(String(b.pixKey || b.key), context) };
          return {
            text: `${icon} ${label}`,
            value: label,
            buttonId: String(b.id || `button_${idx}`),
            action,
          };
        });

        setMessages((prev) => [...prev, {
          id: uid(),
          sender: "bot",
          text: parts.join("\n\n") || (bmxButtons.length ? "Escolha uma opção:" : ""),
          timestamp: new Date(),
          nodeId: node.id,
          buttons: renderedButtons,
        }]);

        const hasReply = bmxButtons.some((b: any) => b.type === "reply");
        if (hasReply) {
          setIsWaitingInput(true);
          setCurrentBlockType("reply_buttons");
          setPendingVariable(normalizeVarName(config.variable || "resposta_botao"));
        } else {
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
            else { addSuccessMessage("Fluxo concluído!"); }
          }, 800);
        }
        break;
      }


      case "list_buttons":
        const listText = interpolateVariables(config.text || "", context);
        const listHeader = config.header ? interpolateVariables(config.header, context) : null;
        const listFooter = config.footer ? interpolateVariables(config.footer, context) : null;
        const buttonText = config.buttonText || config.listHeader || "Ver opções";
        let sections = config.sections || [];

        // WhatsApp Oficial: máx 10 seções e 10 itens por seção; títulos obrigatórios
        if (isOficial) {
          const totalItems = sections.reduce((a: number, s: any) => a + ((s?.items || []).length), 0);
          if (sections.length > 10) {
            addSystemMessage(`⚠️ WhatsApp Oficial permite no máximo 10 seções na lista. ${sections.length - 10} ignorada(s).`);
            sections = sections.slice(0, 10);
          }
          sections = sections.map((s: any, i: number) => {
            const items = s?.items || [];
            const cut = items.length > 10 ? items.slice(0, 10) : items;
            if (items.length > 10) {
              addSystemMessage(`⚠️ Seção "${s.title || `#${i + 1}`}" excedeu 10 itens; ${items.length - 10} ignorado(s).`);
            }
            if (!s?.title) {
              addSystemMessage(`⚠️ Seção #${i + 1} sem título — WhatsApp Oficial exige título por seção.`);
            }
            return { ...s, items: cut };
          });
          if (totalItems === 0) {
            addSystemMessage("⚠️ Lista vazia: WhatsApp Oficial exige ao menos 1 item.");
          }
        }

        
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

        if (!koButtons.length) {
          addBotMessage(koQuestion, node.id);
          addSystemMessage("⚠️ Nenhuma opção configurada neste bloco.");
          break;
        }

        // Mostrar pergunta com botões clicáveis na mesma mensagem
        safeSetTimeout(() => {
          const numberedButtons = koButtons.map((btn: any, idx: number) => ({
            text: `${idx + 1}. ${btn.label || `Opção ${idx + 1}`}`,
            value: btn.label || `Opção ${idx + 1}`,
            buttonId: `button_${idx}`,
            keywords: btn.keywords || [],
          }));
          
          setMessages((prev) => [...prev, {
            id: uid(),
            sender: "bot",
            text: koQuestion,
            timestamp: new Date(),
            buttons: numberedButtons,
            nodeId: node.id,
          }]);
        }, 0);
        
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

      case "webhook": {
        const webhookUrl = interpolateVariables(config.url || "", context);
        const method = (config.method || "POST").toUpperCase();
        const useReal = realModeRef.current;
        addSystemMessage(`🌐 ${useReal ? "[MODO REAL] " : ""}Chamando webhook: ${method} ${webhookUrl}`);

        (async () => {
          let response: any = { success: true, message: "Webhook simulado" };
          let ok = true;
          if (useReal && webhookUrl) {
            try {
              const headers: Record<string, string> = { "Content-Type": "application/json" };
              if (config.headers && typeof config.headers === "object") {
                for (const [k, v] of Object.entries(config.headers)) headers[k] = interpolateVariables(String(v ?? ""), context);
              }
              const bodyStr = interpolateVariables(config.body || "", context) || JSON.stringify(context);
              const { data, error } = await supabase.functions.invoke("execute-dynamic-query", {
                body: { url: webhookUrl, method, headers, body: bodyStr },
              });
              if (error) { ok = false; response = { error: error.message }; }
              else response = data;
            } catch (e: any) {
              ok = false; response = { error: e?.message || String(e) };
            }
          }
          if (config.outputVariable) {
            const newCtx = { ...contextRef.current, [config.outputVariable]: response };
            contextRef.current = newCtx;
            setContext(newCtx);
          }
          if (ok) addSuccessMessage(useReal ? "Webhook executado" : "Webhook respondeu com sucesso (simulado)");
          else addSystemMessage(`⚠️ Webhook falhou: ${response?.error || "erro desconhecido"}`);
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
          }, useReal ? 300 : 1500);
        })();
        break;
      }

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

      case "mensagem_pre_definida": {
        let semFrase = false;
        try {
          const cursorKey = `sim:${node.id}`;
          const estabelecimentoId = contextRef.current.estabelecimento_id || await getEstabelecimentoId();
          if (!estabelecimentoId) {
            semFrase = true;
          } else {
            const { data, error } = await supabase.functions.invoke("pick-mensagem-pre-definida", {
              body: {
                estabelecimentoId,
                escopo: config.escopo || "qualquer",
                grupoId: config.grupoId || undefined,
                tema: config.tema || undefined,
                modoSelecao: config.modoSelecao || "rotacao",
                fraseId: config.fraseId || undefined,
                cursorKey,
              },
            });
            if (error) throw error;
            if ((data as any)?.error) throw new Error((data as any).error);
            const frase = data?.frase?.frase;
            if (!frase) {
              semFrase = true;
            } else {
              const newCtx = {
                ...contextRef.current,
                ...(config.outputVariable ? { [config.outputVariable]: frase } : {}),
                last_mensagem_pre_definida: frase,
              };
              contextRef.current = newCtx;
              setContext(newCtx);

              if ((config.apresentacao || "texto") === "midia") {
                // Gera mídia com a frase como texto principal
                const variations = Math.max(1, Math.min(6, config.variations || 1));
                const mediaType = config.mediaType === "video" ? "video" : "image";
                addSystemMessage(`🎨 Gerando ${variations} ${mediaType === "video" ? "vídeo(s)" : "imagem(ns)"} com a frase escolhida…`);
                addBotMessage(frase, node.id);
                try {
                  const { data: genData, error: genErr } = await supabase.functions.invoke("bot-generate-ai-media", {
                    body: {
                      prompt: `Crie uma peça de ${mediaType === "video" ? "vídeo curto" : "imagem"} destacando o texto: "${frase}"`,
                      basePrompt: config.basePrompt || "",
                      variations,
                      estabelecimentoId,
                      aspectRatio: config.aspectRatio || "1:1",
                      mediaType,
                      styleSource: config.styleSource || "visual_identity",
                      preset: config.styleSource === "preset" ? (config.preset || "") : "",
                    },
                  });
                  if (genErr) throw genErr;
                  const urls: string[] = Array.isArray(genData?.images)
                    ? genData.images.filter(Boolean)
                    : (genData?.items || genData?.results || []).map((it: any) => it?.url).filter(Boolean);
                  if (urls.length) {
                    const mediaCtx = {
                      ...contextRef.current,
                      last_generated_media_url: urls[0],
                      last_generated_media_urls: urls,
                      last_generated_media_type: mediaType === "video" ? "video" : "image",
                    };
                    contextRef.current = mediaCtx;
                    setContext(mediaCtx);
                    for (const url of urls.slice(0, variations)) {
                      addBotMediaMessage(url, mediaType === "video" ? "video" : "image", "", node.id);
                    }
                  } else {
                    addSystemMessage("⚠️ Não consegui gerar a mídia agora. Enviei apenas o texto.");
                  }
                } catch (mediaErr: any) {
                  console.error("[SIM] mensagem_pre_definida media error:", mediaErr);
                  addSystemMessage("⚠️ Falha ao gerar a mídia. Enviei apenas o texto.");
                }
              } else {
                addBotMessage(frase, node.id);
              }
            }
          }
        } catch (e: any) {
          console.error("[SIM] mensagem_pre_definida error:", e);
          semFrase = true;
        }
        // Roteia pela saída correta (sem_frase quando não há frase, senão default)
        const desiredHandle = semFrase ? "sem_frase" : "default";
        const outs = edges.filter((e) => e.source === node.id);
        const edge = outs.find((e) => e.sourceHandle === desiredHandle)
          || (!semFrase ? outs.find((e) => !e.sourceHandle || e.sourceHandle === "default") : undefined);
        const nextNode = edge ? nodes.find((n) => n.id === edge.target) : null;
        if (nextNode) await executeNode(nextNode);
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
        const selectedPlatforms: string[] = Array.isArray(config.platforms) && config.platforms.length > 0
          ? config.platforms
          : ["instagram"];
        const publishMode = config.publishMode === "ask" ? "ask" : "all";

        if (publishMode === "ask") {
          const platformLabels: Record<string, string> = {
            instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok",
            linkedin: "LinkedIn", twitter: "X (Twitter)", youtube: "YouTube",
          };
          const buttons = selectedPlatforms.map((p) => ({
            text: `📤 ${platformLabels[p] || p}`,
            value: `plat_${p}`,
            buttonId: `pub_ask_${p}`,
          }));
          if (selectedPlatforms.length > 1) {
            buttons.unshift({ text: "🚀 Publicar em todas", value: "all", buttonId: "pub_ask_all" });
          }
          buttons.push({ text: "❌ Cancelar", value: "cancel", buttonId: "pub_ask_cancel" });
          simNodeStateRef.current[node.id] = {
            ...(simNodeStateRef.current[node.id] || {}),
            askPlatforms: selectedPlatforms,
          };
          setMessages((prev) => [...prev, {
            id: uid(),
            sender: "bot",
            text: "Em qual(is) rede(s) você quer publicar?",
            timestamp: new Date(),
            nodeId: node.id,
            buttons,
          }]);
          setIsWaitingInput(true);
          setCurrentBlockType("publish_social_ask");
          setCurrentNodeId(node.id);
          break;
        }

        runPublishSocial(node, selectedPlatforms);
        break;
      }



      case "send_whatsapp_to_number": {
        const phone = interpolateVariables(config.phoneNumber || "", context);
        const msg = interpolateVariables(config.message || "", context);
        const mediaUrl = interpolateVariables(config.mediaUrl || "", context);
        const outputVar = normalizeVarName(config.outputVariable || "envio_whatsapp_status");
        const useReal = realModeRef.current;
        addSystemMessage(`📱 ${useReal ? "[MODO REAL] " : ""}WhatsApp → ${phone || "(número não informado)"}`);
        if (mediaUrl) addBotMediaMessage(mediaUrl, "image", msg, node.id);
        else if (msg) addBotMessage(`[para ${phone}] ${msg}`, node.id);

        (async () => {
          let status = "enviado";
          if (useReal && phone && msg) {
            try {
              const { executarBlocoWhatsapp } = await import("@/lib/workflowActionsExecutor");
              const r = await executarBlocoWhatsapp({ telefone: phone, mensagem: msg }, {
                variaveis: context,
                workflow_tipo: "bot",
                origem: "flow_simulator",
              });
              status = r.ok ? "enviado" : "falhou";
              if (!r.ok) addSystemMessage(`⚠️ WhatsApp real falhou: ${r.erro || ""}`);
              else addSuccessMessage("WhatsApp enviado de verdade");
            } catch (e: any) {
              status = "falhou";
              addSystemMessage(`⚠️ Erro no WhatsApp real: ${e?.message || e}`);
            }
          }
          const newCtx = { ...contextRef.current, [outputVar]: status };
          contextRef.current = newCtx;
          setContext(newCtx);
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
          }, useReal ? 300 : 1000);
        })();
        break;
      }

      case "broadcast_vendedores": {
        const outputVar = normalizeVarName(config.outputVariable || "broadcast_vendedores_resultado");
        const useReal = realModeRef.current;
        const delayMs = Math.max(0, (parseInt(config.delaySeconds) || 3) * 1000);

        (async () => {
          const estabelecimentoId = contextRef.current.estabelecimento_id || await getEstabelecimentoId();
          if (!estabelecimentoId) {
            addSystemMessage("⚠️ Broadcast Vendedores: estabelecimento não identificado.");
            const newCtx = { ...contextRef.current, [outputVar]: { enviados: 0, falhas: 0, total: 0 } };
            contextRef.current = newCtx; setContext(newCtx);
            const nextNode = getNextNode(node.id);
            if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
            return;
          }

          // Resolver mensagem
          let msg = "";
          if (config.usarMensagemPreDefinida) {
            const varName = config.preDefinidaVar || "last_mensagem_pre_definida";
            msg = String(contextRef.current[varName] || contextRef.current.last_mensagem_pre_definida || "");
          } else {
            msg = interpolateVariables(config.message || "", contextRef.current);
          }
          if (!msg.trim()) {
            addSystemMessage("⚠️ Broadcast Vendedores: mensagem vazia.");
            const newCtx = { ...contextRef.current, [outputVar]: { enviados: 0, falhas: 0, total: 0 } };
            contextRef.current = newCtx; setContext(newCtx);
            const nextNode = getNextNode(node.id);
            if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
            return;
          }

          // Buscar vendedores
          let q = supabase
            .from("empresas")
            .select("id, nome, nome_fantasia, whatsapp, telefone, segmento_id")
            .eq("estabelecimento_id", estabelecimentoId)
            .eq("tipo_cliente", "vendedor")
            .eq("ativo", true);
          if (config.filtroTipo === "segmento" && config.segmentoId) q = q.eq("segmento_id", config.segmentoId);
          if (config.combinarSegmento && config.segmentoId && config.filtroTipo !== "segmento") q = q.eq("segmento_id", config.segmentoId);
          const { data: vendedoresData } = await q;
          let vendedores: any[] = vendedoresData || [];

          // Gerentes
          const ids = vendedores.map((v: any) => v.id);
          const gerentesMap = new Map<string, { id: string; nome: string; whatsapp?: string; telefone?: string }>();
          if (ids.length) {
            const { data: gv } = await supabase
              .from("gerente_vendedores")
              .select("vendedor_empresa_id, gerente_usuario_id, usuarios:gerente_usuario_id(id, nome, whatsapp, telefone)")
              .in("vendedor_empresa_id", ids);
            (gv || []).forEach((r: any) => {
              if (r.usuarios?.id) gerentesMap.set(r.vendedor_empresa_id, {
                id: r.usuarios.id, nome: r.usuarios.nome || "", whatsapp: r.usuarios.whatsapp, telefone: r.usuarios.telefone,
              });
            });
          }
          if (config.filtroTipo === "com_gerente") vendedores = vendedores.filter((v: any) => gerentesMap.has(v.id));
          if (config.filtroTipo === "gerente_especifico" && config.gerenteId)
            vendedores = vendedores.filter((v: any) => gerentesMap.get(v.id)?.id === config.gerenteId);
          vendedores = vendedores.filter((v: any) => (v.whatsapp || v.telefone || "").replace(/\D/g, "").length >= 10);

          const total = vendedores.length;
          addSystemMessage(`📢 ${useReal ? "[REAL] " : ""}Broadcast Vendedores → ${total} destinatário(s)`);
          let enviados = 0; let falhas = 0;

          const { executarBlocoWhatsapp } = useReal ? await import("@/lib/workflowActionsExecutor") : ({} as any);

          // Mídia gerada pelo bloco "Mensagem Pré Definida" anterior (se houver)
          const mediaUrlPre = config.usarMensagemPreDefinida
            ? String(contextRef.current.last_generated_media_url || "")
            : "";
          const mediaTypePre = config.usarMensagemPreDefinida
            ? String(contextRef.current.last_generated_media_type || "")
            : "";

          for (const v of vendedores) {
            const phone = (v.whatsapp || v.telefone || "").replace(/\D/g, "");
            const nome = v.nome_fantasia || v.nome || phone;
            if (mediaUrlPre) {
              addBotMessage(`[para ${nome} · ${phone}] ${msg}`, node.id);
              addBotMediaMessage(mediaUrlPre, mediaTypePre === "video" ? "video" : "image", "", node.id);
            } else {
              addBotMessage(`[para ${nome} · ${phone}] ${msg}`, node.id);
            }

            let ok = true;
            if (useReal) {
              try {
                const r = await executarBlocoWhatsapp(
                  { telefone: phone, mensagem: msg, mediaUrl: mediaUrlPre || undefined },
                  { variaveis: contextRef.current, workflow_tipo: "bot", origem: "broadcast_vendedores" },
                );
                ok = !!r?.ok;
              } catch { ok = false; }
            }

            // Contato pós-mensagem
            if (config.enviarContato) {
              let cNome = ""; let cPhone = "";
              const tipoContato = config.contatoTipo || "gerente_do_vendedor";
              if (tipoContato === "gerente_do_vendedor") {
                const g = gerentesMap.get(v.id);
                if (g && (g.whatsapp || g.telefone)) {
                  cNome = g.nome; cPhone = (g.whatsapp || g.telefone || "").replace(/\D/g, "");
                } else {
                  cNome = config.fallbackNome || ""; cPhone = (config.fallbackWhatsapp || "").replace(/\D/g, "");
                }
              } else {
                cNome = config.contatoNome || ""; cPhone = (config.contatoWhatsapp || "").replace(/\D/g, "");
              }
              if (cPhone) {
                const cardMsg = `👤 Contato: *${cNome || cPhone}*\nhttps://wa.me/${cPhone}`;
                addBotMessage(`[para ${nome}] ${cardMsg}`, node.id);
                if (useReal) {
                  try { await executarBlocoWhatsapp({ telefone: phone, mensagem: cardMsg }, {
                    variaveis: contextRef.current, workflow_tipo: "bot", origem: "broadcast_vendedores_contato",
                  }); } catch {}
                }
              }
            }

            if (ok) enviados++; else falhas++;
            if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
          }

          const resultado = { enviados, falhas, total };
          if (falhas > 0) addSystemMessage(`⚠️ Broadcast finalizado: ${enviados} enviados, ${falhas} falhas.`);
          else addSuccessMessage(`Broadcast finalizado: ${enviados}/${total} enviados.`);

          const newCtx = { ...contextRef.current, [outputVar]: resultado };
          contextRef.current = newCtx; setContext(newCtx);
          const nextNode = getNextNode(node.id);
          if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
        })();
        break;
      }

      case "send_contact_card": {
        const modo = config.modo || "gerente_do_vendedor";
        let cNome = ""; let cPhone = "";
        if (modo === "fixo") {
          cNome = interpolateVariables(config.contatoNome || "", contextRef.current);
          cPhone = interpolateVariables(config.contatoWhatsapp || "", contextRef.current).replace(/\D/g, "");
        } else {
          // dinâmico: espera contexto do broadcast/loop atual
          cNome = String(contextRef.current.gerente_nome || config.fallbackNome || "");
          cPhone = String(contextRef.current.gerente_whatsapp || config.fallbackWhatsapp || "").replace(/\D/g, "");
        }
        const legenda = interpolateVariables(config.legenda || "", contextRef.current);
        if (!cPhone) {
          addSystemMessage("⚠️ Enviar Contato: contato não resolvido.");
        } else {
          const cardMsg = `${legenda ? legenda + "\n" : ""}👤 *${cNome || cPhone}*\nhttps://wa.me/${cPhone}`;
          addBotMessage(cardMsg, node.id);
        }
        const nextNode = getNextNode(node.id);
        if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
        break;
      }

      case "send_sms": {
        const rawNumbers: string[] = Array.isArray(config.phoneNumbers)
          ? config.phoneNumbers
          : config.phoneNumber ? [config.phoneNumber] : [];
        const numbers = rawNumbers
          .map((n) => interpolateVariables(String(n || ""), context).replace(/\D/g, ""))
          .filter(Boolean);
        const msg = interpolateVariables(config.message || "", context);
        const outputVar = normalizeVarName(config.outputVariable || "envio_sms_status");

        (async () => {
          if (numbers.length === 0 || !msg) {
            addSystemMessage("📩 SMS não enviado: número ou mensagem vazio.");
            const newCtx = { ...contextRef.current, [outputVar]: "sem_destino" };
            contextRef.current = newCtx;
            setContext(newCtx);
          } else {
            addSystemMessage(`📩 Enviando SMS → ${numbers.join(", ")}`);
            let okCount = 0;
            let lastError: string | null = null;
            try {
              const estabelecimentoId = await getEstabelecimentoId();
              for (const destino of numbers) {
                const { data, error } = await supabase.functions.invoke("send-sms", {
                  body: { estabelecimento_id: estabelecimentoId, destino, mensagem: msg },
                });
                if (error) { lastError = error.message; continue; }
                if ((data as any)?.success) { okCount++; addBotMessage(`[SMS ✓ ${destino}] ${msg}`, node.id); }
                else { lastError = (data as any)?.erro || "Falha ao enviar SMS"; addSystemMessage(`⚠️ Falha no SMS para ${destino}: ${lastError}`); }
              }
            } catch (e: any) {
              lastError = e?.message || "Erro ao enviar SMS";
              addSystemMessage(`⚠️ Erro ao enviar SMS: ${lastError}`);
            }
            const status = okCount === numbers.length ? "enviado" : okCount === 0 ? "falhou" : "parcial";
            const newCtx = { ...contextRef.current, [outputVar]: status, [`${outputVar}_erro`]: lastError || "" };
            contextRef.current = newCtx;
            setContext(newCtx);
          }
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
          }, 500);
        })();
        break;
      }

      case "text_content": {
        const blockMode = config.blockMode === "fixed" || config.blockMode === "options" ? config.blockMode : "advanced";

        // === MODO FIXO: aplica direto sem perguntar ===
        if (blockMode === "fixed") {
          simNodeStateRef.current[node.id] = {
            ...(simNodeStateRef.current[node.id] || {}),
            resolvedTextContent: {
              title: config.title || "",
              subtitle: config.subtitle || "",
              body: config.bodyEnabled === false ? "" : (config.body || ""),
            },
          };
          addSystemMessage(`📝 Conteúdo de Texto (fixo) aplicado ao próximo Gerar Mídia IA.`);
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
          }, 400);
          break;
        }

        // === MODO OPÇÕES: usuário escolhe uma das opções pré-definidas ===
        if (blockMode === "options") {
          const opts: any[] = Array.isArray(config.options) ? config.options : [];
          if (opts.length === 0) {
            addSystemMessage("⚠️ Bloco de texto em modo 'opções' sem opções configuradas. Seguindo sem textos.");
            simNodeStateRef.current[node.id] = {
              ...(simNodeStateRef.current[node.id] || {}),
              resolvedTextContent: { title: "", subtitle: "", body: "" },
            };
            safeSetTimeout(() => {
              const nextNode = getNextNode(node.id);
              if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
            }, 400);
            break;
          }
          simNodeStateRef.current[node.id] = {
            ...(simNodeStateRef.current[node.id] || {}),
            textContentOptions: opts,
          };
          const tcoListId = `list_${node.id}_${Date.now()}`;
          setActiveListId(tcoListId);
          setMessages((prev) => [...prev, {
            id: tcoListId, sender: "bot",
            text: config.optionsPrompt || "Escolha um dos textos abaixo:",
            timestamp: new Date(), nodeId: node.id,
            isListButton: true,
            listButtonText: "Ver opções",
            listSections: [{
              title: "Opções",
              items: [
                ...opts.map((o, i) => ({ label: o.label || `Opção ${i + 1}`, value: `tco_${i}` })),
                { label: "Sair", value: "__exit__", description: "Encerrar atendimento" },
              ],
            }],
          }]);
          setIsWaitingInput(true);
          setCurrentBlockType("text_content_options_pick");
          setCurrentNodeId(node.id);
          break;
        }


        // === MODO AVANÇADO (legado) ===
        // Se o designer pré-configurou textos fixos (sem nenhum modo "ask"/"ai"),
        // aplica direto sem perguntar (mantém comportamento legado).
        const modes = ["title", "subtitle", "body"].map((k) => config[`${k}Mode`] || "fixed");
        const allFixed = modes.every((m) => m === "fixed");
        const hasAnyFixedValue = !!(
          (config.title && config.title.trim()) ||
          (config.subtitle && config.subtitle.trim()) ||
          (config.body && config.body.trim())
        );
        if (allFixed && hasAnyFixedValue) {
          simNodeStateRef.current[node.id] = {
            ...(simNodeStateRef.current[node.id] || {}),
            resolvedTextContent: {
              title: config.title || "",
              subtitle: config.subtitle || "",
              body: config.bodyEnabled === false ? "" : (config.body || ""),
            },
          };
          addSystemMessage(`📝 Conteúdo de Texto fixado para o próximo Gerar Mídia IA.`);
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
          }, 400);
          break;
        }

        // Novo fluxo: pergunta Sim/Não/Sair como botões de resposta
        setMessages((prev) => [...prev, {
          id: uid(), sender: "bot", text: "Você quer usar título e subtítulo na imagem?", timestamp: new Date(), nodeId: node.id,
          buttons: [
            { text: "Sim", value: "sim", buttonId: "tc_yes" },
            { text: "Não", value: "nao", buttonId: "tc_no" },
            { text: "Sair", value: "__exit__", buttonId: "tc_exit" },
          ],
        }]);
        setIsWaitingInput(true);
        setCurrentBlockType("text_content_yesno");
        setCurrentNodeId(node.id);
        break;
      }


      case "content_type": {
        const mode = config.mode === "ask" ? "ask" : "fixed";
        if (mode === "fixed") {
          const meta = CONTENT_TYPE_DIRECTIVES[(config.contentType || "divulgacao").toLowerCase()];
          addSystemMessage(`🎯 Tipo de Conteúdo definido: ${meta?.label || config.contentType} (aplicado ao próximo Gerar Mídia IA).`);
          safeSetTimeout(() => {
            const nextNode = getNextNode(node.id);
            if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
          }, 400);
        } else {
          const prompt = interpolateVariables(
            config.askPrompt || "Qual o objetivo da peça? Toque em uma das opções abaixo:",
            contextRef.current,
          );
          const ctItems = Object.entries(CONTENT_TYPE_DIRECTIVES)
            .filter(([k]) => k !== "custom")
            .map(([key, meta]) => ({
              label: meta.label,
              value: key,
            }));
          ctItems.push({ label: "Sair", value: "__exit__" } as any);
          const ctListId = `list_${node.id}_${Date.now()}`;
          setActiveListId(ctListId);
          setMessages((prev) => [...prev, {
            id: ctListId,
            sender: "bot",
            text: prompt,
            timestamp: new Date(),
            nodeId: node.id,
            isListButton: true,
            listButtonText: "Ver opções",
            listSections: [{ title: "Objetivos", items: ctItems }],
          }]);
          setIsWaitingInput(true);
          setCurrentBlockType("content_type_ask");
          setPendingVariable(`__ct_${node.id}`);
          setCurrentNodeId(node.id);
        }
        break;
      }


      case "ask_influencer": {
        const q = interpolateVariables(config.askQuestion || "A peça terá um influencer?", contextRef.current);
        setMessages((prev) => [...prev, {
          id: uid(), sender: "bot", text: q, timestamp: new Date(), nodeId: node.id,
          buttons: [
            { text: "Sim", value: "sim", buttonId: "infl_yes" },
            { text: "Não", value: "nao", buttonId: "infl_no" },
            { text: "Sair", value: "__exit__", buttonId: "infl_exit" },
          ],
        }]);
        setIsWaitingInput(true);
        setCurrentBlockType("ask_influencer_choice");
        setCurrentNodeId(node.id);
        break;
      }

      case "ask_product_image": {
        const q = interpolateVariables(config.askQuestion || "A peça terá imagem do produto?", contextRef.current);
        setMessages((prev) => [...prev, {
          id: uid(), sender: "bot", text: q, timestamp: new Date(), nodeId: node.id,
          buttons: [
            { text: "Sim", value: "sim", buttonId: "pim_yes" },
            { text: "Não", value: "nao", buttonId: "pim_no" },
            { text: "Sair", value: "__exit__", buttonId: "pim_exit" },
          ],
        }]);
        setIsWaitingInput(true);
        setCurrentBlockType("ask_product_image_choice");
        setCurrentNodeId(node.id);
        break;
      }


      case "trigger_workflow": {
        const modLabels: Record<string, string> = {
          bot: "Bot Builder",
          omnichannel: "Omnichannel",
          ecommerce_rules: "Regras E-commerce",
          automacoes_vendas: "Automações de Vendas",
          logistica: "Logística",
          ads: "Ads",
          ai_studio: "AI Studio",
        };
        const moduleKey = config.module || "bot";
        const wfName = config.workflowName || config.workflowId || "(não selecionado)";
        const mode = config.executionMode === "await" ? "síncrono" : "assíncrono";

        if (!config.workflowId) {
          addSystemMessage(`⚠️ Disparar Workflow: nenhum workflow selecionado em ${modLabels[moduleKey]}.`);
        } else {
          // Monta payload
          let extraPayload: any = {};
          if (config.payloadJson) {
            try {
              extraPayload = JSON.parse(interpolateVariables(config.payloadJson, context));
            } catch (err) {
              addSystemMessage(`⚠️ Payload JSON inválido em Disparar Workflow.`);
            }
          }
          const payload = {
            ...(config.passVariables !== false ? { variables: { ...context } } : {}),
            ...extraPayload,
          };

          addSystemMessage(`🚀 Disparando workflow "${wfName}" em ${modLabels[moduleKey]} (${mode})...`);

          // Evento global para integrações no app
          try {
            window.dispatchEvent(new CustomEvent("workflow:trigger", {
              detail: { module: moduleKey, workflowId: config.workflowId, payload },
            }));
          } catch {}

          // 🎯 AI Studio — gera imagem/vídeo de verdade e envia ao usuário
          if (moduleKey === "ai_studio") {
            const outputVar = config.outputVariable || "workflow_disparado";
            (async () => {
              try {
                const variablesForWf = { ...(payload.variables || {}), ...payload };
                const { data: previewData, error: pErr } = await supabase.functions.invoke(
                  "bot-run-ai-studio-workflow",
                  { body: { workflowId: config.workflowId, variables: variablesForWf, preview: true } },
                );
                if (pErr) throw pErr;
                const mediaType: "image" | "video" = previewData?.mediaType || "image";
                const estSecs: number = Number(previewData?.estimatedSeconds) || (mediaType === "video" ? 120 : 25);
                const tipoLabel = mediaType === "video" ? "vídeo" : "imagem";
                const tempoLabel = estSecs >= 60
                  ? `cerca de ${Math.ceil(estSecs / 60)} minuto(s)`
                  : `cerca de ${estSecs} segundos`;
                addBotMessage(`⏳ Estou gerando sua ${tipoLabel} agora. Isso pode levar ${tempoLabel}. Já te envio assim que ficar pronta!`, node.id);

                const { data: genData, error: gErr } = await supabase.functions.invoke(
                  "bot-run-ai-studio-workflow",
                  { body: { workflowId: config.workflowId, variables: variablesForWf } },
                );
                if (gErr) throw gErr;
                if (!genData?.mediaUrl) throw new Error(genData?.error || "Sem mídia retornada");

                addBotMediaMessage(genData.mediaUrl, mediaType, "", node.id);
                setContext((prev) => ({
                  ...prev,
                  [outputVar]: { ok: true, mediaUrl: genData.mediaUrl, mediaType, model: genData?.model },
                  midia_gerada: genData.mediaUrl,
                  midia_gerada_tipo: mediaType,
                }));
                addSuccessMessage(`✅ Mídia gerada e enviada. Resultado em {{${outputVar}}}.`);
              } catch (err: any) {
                addSystemMessage(`❌ Falha ao gerar mídia do AI Studio: ${err?.message || err}`);
                setContext((prev) => ({ ...prev, [outputVar]: { ok: false, error: String(err?.message || err) } }));
              } finally {
                const nextNode = getNextNode(node.id);
                if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
              }
            })();
            break;
          }

          // Salva resultado em variável
          const outVar = config.outputVariable || "workflow_disparado";
          context[outVar] = {
            ok: true,
            module: moduleKey,
            workflowId: config.workflowId,
            workflowName: wfName,
            mode,
            triggeredAt: new Date().toISOString(),
          };
          addSuccessMessage(`✅ Workflow disparado. Resultado salvo em {{${outVar}}}.`);
        }

        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
        }, 600);
        break;
      }

      case "return_response": {
        const statusMap: Record<string, number> = { success: 200, error: 500, custom: Number(config.statusCode) || 200 };
        const status = config.status || "success";
        const statusCode = statusMap[status] ?? 200;
        let payload: any = {};
        if (config.payloadJson) {
          try {
            payload = JSON.parse(interpolateVariables(config.payloadJson, context));
          } catch {
            addSystemMessage(`⚠️ Retornar Resposta: payload JSON inválido.`);
          }
        }
        const response = {
          status,
          statusCode,
          message: interpolateVariables(config.message || "", context),
          payload,
          ...(config.includeAllVariables === true ? { variables: { ...context } } : {}),
          returnedAt: new Date().toISOString(),
        };
        try {
          window.dispatchEvent(new CustomEvent("workflow:response", { detail: response }));
        } catch {}
        addSuccessMessage(`↩️ Retorno enviado (${status} • ${statusCode}).`);
        if (config.stopFlow !== false) {
          addSuccessMessage("Fluxo encerrado pelo bloco Retornar Resposta.");
          break;
        }
        safeSetTimeout(() => {
          const nextNode = getNextNode(node.id);
          if (nextNode) { setCurrentNodeId(nextNode.id); executeNode(nextNode); }
        }, 400);
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

  // Gera N sugestões de textos via IA para o bloco text_content
  const generateTextContentSuggestions = async (nodeId: string, brief: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    const cfg = (node?.data as any)?.config || {};
    const count = Math.max(2, Math.min(5, Number(cfg.suggestionCount) || 3));

    setIsWaitingInput(false);
    addSystemMessage(`✨ Gerando ${count} sugestões de textos com IA...`);
    try {
      const ct = findUpstreamContentType(nodeId);
      const { data, error } = await supabase.functions.invoke("bot-suggest-text-content", {
        body: { briefing: brief, contentType: ct?.type || "", count, fieldsOnly: ["title", "subtitle"] },
      });
      if (error) throw new Error(error.message || "Falha na função");
      if (!data?.success || !Array.isArray(data?.suggestions) || data.suggestions.length === 0) {
        throw new Error(data?.error || "Sem sugestões retornadas");
      }
      const suggestions = data.suggestions.slice(0, count);
      const st = simNodeStateRef.current[nodeId] || {};
      st.aiSuggestions = suggestions;
      st.suggestionCount = count;
      simNodeStateRef.current[nodeId] = st;
      suggestions.forEach((s: any, i: number) => {
        const lines = [
          `✨ Opção ${i + 1}`,
          s.title && `• Título: "${s.title}"`,
          s.subtitle && `• Subtítulo: "${s.subtitle}"`,
        ].filter(Boolean).join("\n");
        addBotMessage(lines, nodeId);
      });
      const pickButtons = suggestions.map((_: any, i: number) => ({
        text: `✅ Usar opção ${i + 1}`,
        value: `pick_${i}`,
        buttonId: `tc_ai_p${i}`,
      }));
      setMessages((prev) => [...prev, {
        id: uid(), sender: "bot",
        text: `Escolha uma opção, peça ${count} novas sugestões ou cancele:`,
        timestamp: new Date(), nodeId,
        buttons: [
          ...pickButtons,
          { text: `🔄 Gerar ${count} novas sugestões`, value: "regen", buttonId: "tc_ai_regen" },
          { text: "❌ Cancelar", value: "cancel", buttonId: "tc_ai_cancel" },
        ],
      }]);
      setCurrentBlockType("text_content_ai_pick");
      setIsWaitingInput(true);

    } catch (e: any) {
      addSystemMessage(`❌ Erro ao gerar sugestões: ${e?.message || e}`);
      setMessages((prev) => [...prev, {
        id: uid(), sender: "bot",
        text: "Quer tentar de novo?",
        timestamp: new Date(), nodeId,
        buttons: [
          { text: "🔄 Tentar novamente", value: "regen", buttonId: "tc_ai_regen_err" },
          { text: "❌ Cancelar", value: "cancel", buttonId: "tc_ai_cancel_err" },
        ],
      }]);
      setCurrentBlockType("text_content_ai_pick");
      setIsWaitingInput(true);
    }
  };

  // Gera N amostras de imagem do produto (fundo transparente) a partir da descrição em texto
  const generateProductSamples = async (nodeId: string, description: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    const cfg = (node?.data as any)?.config || {};
    const count = Math.max(1, Math.min(6, Number(cfg.sampleCount) || 3));

    setIsWaitingInput(false);
    addSystemMessage(`🎨 Gerando ${count} amostra${count > 1 ? 's' : ''} de imagem do produto (fundo transparente)…`);
    try {
      const estId = await getEstabelecimentoId();
      const { data, error } = await supabase.functions.invoke("bot-generate-product-samples", {
        body: { description, count, estabelecimentoId: estId || "" },
      });
      if (error) throw new Error(error.message || "Falha na função");
      const images: string[] = Array.isArray(data?.images) ? data.images : [];
      if (!images.length) throw new Error(data?.error || "Nenhuma imagem retornada");

      const st = simNodeStateRef.current[nodeId] || {};
      st.productSamples = images;
      st.productDescription = description;
      st.productSampleCount = count;
      simNodeStateRef.current[nodeId] = st;

      images.forEach((url, i) => addBotMediaMessage(url, "image", `Opção ${i + 1}`, nodeId));

      const buttons = images.map((_, i) => ({
        text: `✅ Usar opção ${i + 1}`,
        value: `pick_${i}`,
        buttonId: `pim_s_${i}`,
      }));
      buttons.push({ text: `🔄 Gerar mais ${count}`, value: "regen", buttonId: "pim_s_regen" });
      buttons.push({ text: "❌ Cancelar", value: "cancel", buttonId: "pim_s_cancel" });

      setMessages((prev) => [...prev, {
        id: uid(), sender: "bot",
        text: `Escolha uma das opções, gere mais ${count} amostra${count > 1 ? 's' : ''} ou cancele:`,
        timestamp: new Date(), nodeId,
        buttons,
      }]);
      setCurrentBlockType("ask_product_image_text_pick");
      setIsWaitingInput(true);
    } catch (e: any) {
      addSystemMessage(`❌ Erro ao gerar amostras: ${e?.message || e}`);
      setMessages((prev) => [...prev, {
        id: uid(), sender: "bot",
        text: "Quer tentar de novo?",
        timestamp: new Date(), nodeId,
        buttons: [
          { text: "🔄 Tentar novamente", value: "regen", buttonId: "pim_s_regen_err" },
          { text: "❌ Cancelar", value: "cancel", buttonId: "pim_s_cancel_err" },
        ],
      }]);
      setCurrentBlockType("ask_product_image_text_pick");
      setIsWaitingInput(true);
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

    // === Palavra-chave universal: Recomeçar (espelha o webhook do WhatsApp) ===
    const _restartKw = input.trim().toLowerCase();
    if (/^(recome[çc]ar|reiniciar|restart|começar de novo|comecar de novo)$/i.test(_restartKw)) {
      const curNode = nodes.find((n) => n.id === currentNodeId);
      const isAfterGoodbye = curNode && (curNode.data as any)?.type === "goodbye";
      if (isAfterGoodbye || !isWaitingInput) {
        addUserMessage(input);
        setInput("");
        setTimeout(() => handleReset(), 300);
        return;
      }
    }

    addUserMessage(input);

    // === text_content: coleta multi-campo (title / subtitle / body) do usuário ===
    if (currentBlockType === "text_content_ask" && currentNodeId) {
      const state = simNodeStateRef.current[currentNodeId] || {};
      const queue: Array<{ field: "title" | "subtitle" | "body"; prompt: string }> = state.textContentAskQueue || [];
      const idx: number = state.textContentAskIndex || 0;
      const current = queue[idx];
      if (current) {
        const raw = input.trim();
        // Para body, "não/nao/skip/-" significa pular
        const isSkip = current.field === "body" && /^(nao|não|n|no|skip|-|nenhum|nada)$/i.test(raw);
        const value = isSkip ? "" : raw;
        state.resolvedTextContent = { ...(state.resolvedTextContent || {}), [current.field]: value };
        state.textContentAskIndex = idx + 1;
        simNodeStateRef.current[currentNodeId] = state;
      }
      setInput("");
      const nextIdx = (state.textContentAskIndex ?? 0);
      if (queue[nextIdx]) {
        // Pergunta o próximo campo
        addBotMessage(queue[nextIdx].prompt, currentNodeId);
        return;
      }
      // Concluiu — mostra confirmação dos textos coletados
      const v = state.resolvedTextContent || {};
      const summary = [
        v.title ? `• Título: "${v.title}"` : null,
        v.subtitle ? `• Subtítulo: "${v.subtitle}"` : null,
        v.body ? `• Texto: "${v.body}"` : null,
      ].filter(Boolean).join("\n");
      setMessages((prev) => [...prev, {
        id: uid(),
        sender: "bot",
        text: `📝 Confirme os textos:\n${summary || "(nenhum texto informado)"}`,
        timestamp: new Date(),
        nodeId: currentNodeId,
        buttons: [
          { text: "✅ Confirmar", value: "confirmar", buttonId: "tc_confirm" },
          { text: "✏️ Editar", value: "editar", buttonId: "tc_edit" },
        ],
      }]);
      setCurrentBlockType("text_content_confirm");
      setIsWaitingInput(true);
      return;
    }

    // === text_content (IA): briefing digitado pelo usuário ===
    if (currentBlockType === "text_content_ai_brief" && currentNodeId) {
      const brief = input.trim();
      setInput("");
      if (!brief) return;
      const st = simNodeStateRef.current[currentNodeId] || {};
      st.aiBrief = brief;
      simNodeStateRef.current[currentNodeId] = st;
      await generateTextContentSuggestions(currentNodeId, brief);
      return;
    }

    // === content_type: coleta o objetivo do criativo do usuário ===
    // === ask_influencer_upload removido — apenas galeria ===


    // === ask_product_image: input para os 3 métodos ===
    if (currentBlockType === "ask_product_image_input" && currentNodeId) {
      const node = nodes.find((n) => n.id === currentNodeId);
      const state = simNodeStateRef.current[currentNodeId] || {};
      const method = state.pimMethod || "text";
      const raw = input.trim();
      setInput("");
      let imageUrl = "";
      let description = "";

      if (method === "code") {
        const estId = await getEstabelecimentoId();
        let q = supabase.from("produtos").select("id,nome,codigo,foto_url").eq("ativo", true).limit(1);
        if (estId) q = q.eq("estabelecimento_id", estId);
        // Tenta por código exato; se nada, por ilike no nome
        const { data: byCode } = await q.eq("codigo", raw);
        let prod: any = byCode?.[0];
        if (!prod) {
          let q2 = supabase.from("produtos").select("id,nome,codigo,foto_url").eq("ativo", true).ilike("nome", `%${raw}%`).limit(1);
          if (estId) q2 = q2.eq("estabelecimento_id", estId);
          const { data: byName } = await q2;
          prod = byName?.[0];
        }
        if (!prod) {
          addSystemMessage(`❌ Produto "${raw}" não encontrado. Tente outro código ou nome.`);
          return;
        }
        imageUrl = prod.foto_url || "";
        description = `${prod.nome}${prod.codigo ? ` (cód. ${prod.codigo})` : ""}`;
        addSystemMessage(`✅ Produto encontrado: ${description}`);
      } else if (method === "photo") {
        if (selectedFile) {
          try { imageUrl = await uploadSimulatorReferenceImage(selectedFile); } catch {}
          setSelectedFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        } else if (/^https?:\/\//i.test(raw)) {
          imageUrl = raw;
        } else {
          addSystemMessage("⚠️ Envie uma URL válida ou anexe um arquivo.");
          return;
        }
      } else {
        // text → gera N amostras (configurável) com fundo transparente e pede para o usuário escolher
        if (!raw) { addSystemMessage("⚠️ Descreva o produto."); return; }
        description = raw;
        simNodeStateRef.current[currentNodeId] = {
          ...state,
          productDescription: description,
        };
        await generateProductSamples(currentNodeId, description);
        return;
      }

      simNodeStateRef.current[currentNodeId] = {
        ...state,
        productImageUrl: imageUrl || state.productImageUrl,
        productDescription: description || state.productDescription,
      };

      // Mostra preview e pede confirmação
      if (imageUrl) addBotMediaMessage(imageUrl, "image", description || "Produto", currentNodeId);
      else addBotMessage(`📝 ${description}`, currentNodeId);
      setMessages((prev) => [...prev, {
        id: uid(), sender: "bot", text: "Está correto? Confirme ou refaça:", timestamp: new Date(), nodeId: currentNodeId,
        buttons: [
          { text: "✅ Confirmar", value: "confirmar", buttonId: "pim_confirm" },
          { text: "🔄 Refazer", value: "refazer", buttonId: "pim_redo" },
        ],
      }]);
      setCurrentBlockType("ask_product_image_confirm");
      setIsWaitingInput(true);
      return;
    }

    if (currentBlockType === "content_type_ask" && currentNodeId) {
      const raw = input.trim().toLowerCase();
      const normalize = (s: string) => s
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z]/g, "");
      const key = normalize(raw);
      const aliasMap: Record<string, string> = {
        divulgacao: "divulgacao", divulgar: "divulgacao", awareness: "divulgacao", marca: "divulgacao",
        promocao: "promocao", promo: "promocao", oferta: "promocao", venda: "promocao", desconto: "promocao",
        institucional: "institucional", branding: "institucional", marca2: "institucional",
        evento: "evento", convite: "evento",
        lancamento: "lancamento", launch: "lancamento", novo: "lancamento",
        educacional: "educacional", informativo: "educacional", dica: "educacional", tutorial: "educacional",
      };
      const matched = aliasMap[key] || (CONTENT_TYPE_DIRECTIVES[key] ? key : "");
      if (!matched) {
        addSystemMessage("⚠️ Não reconheci o tipo. Use: divulgacao, promocao, institucional, evento, lancamento ou educacional.");
        setInput("");
        return;
      }
      simNodeStateRef.current[currentNodeId] = {
        ...(simNodeStateRef.current[currentNodeId] || {}),
        resolvedContentType: { contentType: matched },
      };
      const meta = CONTENT_TYPE_DIRECTIVES[matched];
      addSystemMessage(`🎯 Tipo de Conteúdo definido: ${meta?.label || matched}.`);
      const ctNodeId = currentNodeId;
      setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
      setInput("");
      const ctNodeData: any = nodes.find(n => n.id === ctNodeId)?.data || {};
      const ctCfg = ctNodeData.config || {};
      let nextNode: any = null;
      if (ctCfg.splitOutputs) {
        const edge = edges.find(e => e.source === ctNodeId && e.sourceHandle === `content_${matched}`);
        if (edge) nextNode = nodes.find(n => n.id === edge.target);
      }
      if (!nextNode) nextNode = getNextNode(ctNodeId);
      if (nextNode) safeSetTimeout(() => { setCurrentNodeId(nextNode.id); executeNode(nextNode); }, 400);
      return;
    }





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

  const handleButtonClick = (button: { text: string; value: string; buttonId?: string; keywords?: string[]; action?: { type: "url" | "copy" | "call" | "pix"; payload: string } }, nodeId?: string) => {
    console.log("🔘 Button clicked:", { button, nodeId, pendingVariable, currentBlockType });

    // === Ação nativa (URL / Copiar / Ligar / Pix) ===
    if (button.action) {
      const { type, payload } = button.action;
      try {
        if (type === "url") {
          let url = String(payload || "").trim();
          if (url && !/^[a-z][a-z0-9+.-]*:\/\//i.test(url) && !url.startsWith("tel:") && !url.startsWith("mailto:") && !url.startsWith("whatsapp:")) {
            url = `https://${url}`;
          }
          if (url) {
            const opened = window.open(url, "_blank", "noopener,noreferrer");
            if (!opened) window.location.href = url;
            addSystemMessage(`🔗 Abrindo: ${url}`);
          }
        } else if (type === "call") {
          const digits = String(payload || "").replace(/[^\d+]/g, "");
          if (digits) { window.location.href = `tel:${digits}`; addSystemMessage(`📞 Ligando para ${digits}`); }
        } else if (type === "copy") {
          navigator.clipboard?.writeText(String(payload || ""));
          toast.success("Código copiado!");
          addSystemMessage(`📋 Copiado: ${payload}`);
        } else if (type === "pix") {
          navigator.clipboard?.writeText(String(payload || ""));
          toast.success("Chave Pix copiada!");
          addSystemMessage(`💠 Chave Pix copiada: ${payload}`);
        }
      } catch (err) {
        console.error("Action button error:", err);
      }
      // Não interrompe o fluxo — apenas executa a ação e segue para o handler normal abaixo (se aplicável)
      // Para botões de ação puros (sem pendingVariable e sem block aguardando) o fluxo já auto-avançou
      return;
    }

    // === Reiniciar conversa (botão Recomeçar do bloco Despedida) ===
    if (button.value === "__restart__") {
      addUserMessage(button.text || "Recomeçar");
      setTimeout(() => handleReset(), 300);
      return;
    }

    // === Saída universal: encerra o atendimento ===
    if (button.value === "__exit__") {
      addUserMessage(button.text || "Sair");
      addSystemMessage("👋 Atendimento encerrado. Até logo!");
      setIsWaitingInput(false);
      setCurrentBlockType(null);
      setPendingVariable(null);
      setCurrentNodeId(null);
      return;
    }



    // === publish_social_done: Finalizar ou Gerar novo ===
    if (currentBlockType === "publish_social_done" && currentNodeId) {
      addUserMessage(button.text);
      setIsWaitingInput(false);
      setCurrentBlockType(null);
      if (button.value === "finalizar") {
        addSuccessMessage("🎉 Roteiro finalizado com sucesso!");
        const nextNode = getNextNode(currentNodeId);
        if (nextNode) {
          safeSetTimeout(() => { setCurrentNodeId(nextNode.id); executeNode(nextNode); }, 400);
        }
      } else if (button.value === "regenerar") {
        // Procura o generate_ai_media mais próximo a montante e re-executa o fluxo a partir dele
        const findUpstreamGenerate = (nid: string, visited = new Set<string>()): string | null => {
          if (visited.has(nid)) return null;
          visited.add(nid);
          const incoming = edges.filter((e) => e.target === nid);
          for (const e of incoming) {
            const src = nodes.find((n) => n.id === e.source);
            if (!src) continue;
            if ((src.data as any)?.type === "generate_ai_media") return src.id;
            const found = findUpstreamGenerate(src.id, visited);
            if (found) return found;
          }
          return null;
        };
        const targetId = findUpstreamGenerate(currentNodeId);
        if (targetId) {
          const target = nodes.find((n) => n.id === targetId);
          if (target) {
            addSystemMessage("🔁 Gerando nova peça...");
            safeSetTimeout(() => { setCurrentNodeId(target.id); executeNode(target); }, 400);
          }
        } else {
          addSystemMessage("⚠️ Nenhum bloco 'Gerar Mídia IA' encontrado a montante para gerar novamente.");
        }
      }
      return;
    }


    // === ai_media_select: Pick / Regen / Cancel via botões ===
    if (currentBlockType === "ai_media_select" && currentNodeId) {
      addUserMessage(button.text);
      const node = nodes.find((n) => n.id === currentNodeId);
      const state = simNodeStateRef.current[currentNodeId] || {};
      if (button.value === "cancel") {
        addSystemMessage("❌ Geração cancelada pelo usuário.");
        delete simNodeStateRef.current[currentNodeId];
        setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
        return;
      }
      if (button.value === "regen") {
        delete simNodeStateRef.current[currentNodeId];
        setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
        addSystemMessage("🔄 Gerando novas opções...");
        if (node) safeSetTimeout(() => { setCurrentNodeId(node.id); executeNode(node); }, 300);
        return;
      }
      if (button.value.startsWith("pick_")) {
        const idx = parseInt(button.value.split("_")[1]) - 1;
        const sel = (state.items || [])[idx];
        if (!sel || !node) { addSystemMessage("⚠️ Seleção inválida."); return; }
        const cfg = (node.data as any).config || {};
        const outVar = normalizeVarName(cfg.outputVariable || "midia_selecionada");
        const newCtx = { ...contextRef.current, [outVar]: sel.url };
        contextRef.current = newCtx; setContext(newCtx); onContextChange?.(newCtx);
        addSuccessMessage(`✅ Mídia ${sel.index} selecionada`);
        delete simNodeStateRef.current[currentNodeId];
        setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
        const nextNode = getNextNode(currentNodeId);
        if (nextNode) safeSetTimeout(() => { setCurrentNodeId(nextNode.id); executeNode(nextNode); }, 400);
        return;
      }
    }

    // === publish_social_ask: escolha de redes no momento da execução ===
    if (currentBlockType === "publish_social_ask" && currentNodeId) {
      addUserMessage(button.text);
      const node = nodes.find((n) => n.id === currentNodeId);
      if (!node) return;
      const state = simNodeStateRef.current[currentNodeId] || {};
      const available: string[] = state.askPlatforms || [];
      if (button.value === "cancel") {
        addSystemMessage("❌ Publicação cancelada.");
        setIsWaitingInput(false); setCurrentBlockType(null);
        return;
      }
      let chosen: string[] = [];
      if (button.value === "all") {
        chosen = available;
      } else if (button.value.startsWith("plat_")) {
        chosen = [button.value.replace("plat_", "")];
      }
      if (chosen.length === 0) return;
      setIsWaitingInput(false); setCurrentBlockType(null);
      delete simNodeStateRef.current[currentNodeId];
      runPublishSocial(node, chosen);
      return;
    }


    if (currentBlockType === "ask_influencer_choice" && currentNodeId) {
      addUserMessage(button.text);
      const node = nodes.find((n) => n.id === currentNodeId);
      const cfg = (node?.data as any)?.config || {};
      if (button.value === "sim") {
        const mode = cfg.influencerMode === "selection" ? "selection" : "fixed";
        const fixedId = cfg.fixedInfluencerId || "";
        const fixedUrl = cfg.fixedInfluencerUrl || "";
        if (mode === "fixed" && fixedId && fixedUrl) {
          // Influencer fixo configurado no bloco — usa direto sem perguntar
          simNodeStateRef.current[currentNodeId] = {
            ...(simNodeStateRef.current[currentNodeId] || {}),
            influencerImageUrl: fixedUrl,
          };
          const v = normalizeVarName(cfg.outputVariable || "influencer_image_url");
          const newCtx = { ...contextRef.current, [v]: fixedUrl };
          contextRef.current = newCtx; setContext(newCtx); onContextChange?.(newCtx);
          addBotMediaMessage(fixedUrl, "image", "Influencer selecionado", currentNodeId);
          addSuccessMessage("✅ Influencer fixo registrado automaticamente.");
          setIsWaitingInput(false); setCurrentBlockType(null);
          const next = getNextNode(currentNodeId);
          if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
          return;
        }
        // Modo seleção (ou fixo sem fixo definido) — mostra galeria filtrada
        const allowedIds: string[] = Array.isArray(cfg.allowedInfluencerIds) ? cfg.allowedInfluencerIds : [];
        (async () => {
          const estId = await getEstabelecimentoId();
          let q = supabase.from("studio_gallery_images").select("id,nome,image_url,pasta").eq("categoria", "influencer").order("created_at", { ascending: false }).limit(100);
          if (estId) q = q.eq("estabelecimento_id", estId);
          const { data, error } = await q;
          let list: any[] = data || [];
          if (mode === "selection" && allowedIds.length > 0) {
            list = list.filter((it: any) => allowedIds.includes(it.id));
          }
          if (error || list.length === 0) {
            addSystemMessage("⚠️ Nenhum influencer disponível. Verifique a configuração do bloco ou cadastre influencers na galeria.");
            setIsWaitingInput(false); setCurrentBlockType(null);
            const next = getNextNode(currentNodeId);
            if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
            return;
          }
          simNodeStateRef.current[currentNodeId!] = { ...(simNodeStateRef.current[currentNodeId!] || {}), influencerGallery: list };
          addBotMessage(`Encontrei ${list.length} influencer(s). Veja as opções abaixo:`, currentNodeId!);
          list.forEach((it: any, idx: number) => {
            addBotMediaMessage(it.image_url, "image", it.nome || `Influencer ${idx + 1}`, currentNodeId!);
          });
          setMessages((prev) => [...prev, {
            id: uid(), sender: "bot", text: "Selecione um influencer:", timestamp: new Date(), nodeId: currentNodeId!,
            buttons: list.slice(0, 24).map((it: any, idx: number) => ({
              text: `👤 ${it.nome || `Influencer ${idx + 1}`}`,
              value: String(idx),
              buttonId: `infl_gal_${idx}`,
            })),
          }]);
          setCurrentBlockType("ask_influencer_gallery_select");
          setIsWaitingInput(true);
        })();
        return;
      }
      setIsWaitingInput(false); setCurrentBlockType(null);
      const next = getNextNode(currentNodeId);
      if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
      return;
    }

    // === ask_influencer: seleção de item da galeria ===
    if (currentBlockType === "ask_influencer_gallery_select" && currentNodeId) {
      addUserMessage(button.text);
      const node = nodes.find((n) => n.id === currentNodeId);
      const cfg = (node?.data as any)?.config || {};
      const state = simNodeStateRef.current[currentNodeId] || {};
      const list: any[] = state.influencerGallery || [];
      const item = list[Number(button.value)];
      if (!item) {
        addSystemMessage("⚠️ Seleção inválida.");
        return;
      }
      const url = item.image_url;
      simNodeStateRef.current[currentNodeId] = { ...state, influencerImageUrl: url };
      const v = normalizeVarName(cfg.outputVariable || "influencer_image_url");
      const newCtx = { ...contextRef.current, [v]: url };
      contextRef.current = newCtx; setContext(newCtx); onContextChange?.(newCtx);
      addBotMediaMessage(url, "image", item.nome || "Influencer", currentNodeId);
      addSuccessMessage(`✅ Influencer "${item.nome || "selecionado"}" registrado.`);
      setIsWaitingInput(false); setCurrentBlockType(null);
      const next = getNextNode(currentNodeId);
      if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
      return;
    }

    // === ask_product_image: yes/no + escolha de método ===
    if (currentBlockType === "ask_product_image_choice" && currentNodeId) {
      addUserMessage(button.text);
      const node = nodes.find((n) => n.id === currentNodeId);
      const cfg = (node?.data as any)?.config || {};
      if (button.value === "sim") {
        setMessages((prev) => [...prev, {
          id: uid(), sender: "bot", text: "Como você quer fornecer a imagem do produto?", timestamp: new Date(), nodeId: currentNodeId,
          buttons: [
            { text: "🔢 Digitar código do produto", value: "code", buttonId: "pim_code" },
            { text: "📷 Enviar foto (URL/arquivo)", value: "photo", buttonId: "pim_photo" },
            { text: "✍️ Descrever em texto", value: "text", buttonId: "pim_text" },
          ],
        }]);
        setCurrentBlockType("ask_product_image_method");
        setIsWaitingInput(true);
        return;
      }
      setIsWaitingInput(false); setCurrentBlockType(null);
      const next = getNextNode(currentNodeId);
      if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
      return;
    }
    if (currentBlockType === "ask_product_image_method" && currentNodeId) {
      addUserMessage(button.text);
      const node = nodes.find((n) => n.id === currentNodeId);
      const cfg = (node?.data as any)?.config || {};
      const method = button.value;
      const prompts: Record<string, string> = {
        code: cfg.codePrompt || "Digite o código (ou nome) do produto:",
        photo: cfg.photoPrompt || "Envie a URL da foto do produto:",
        text: cfg.textPrompt || "Descreva o produto em texto:",
      };
      addBotMessage(interpolateVariables(prompts[method] || prompts.text, contextRef.current), currentNodeId);
      simNodeStateRef.current[currentNodeId] = { ...(simNodeStateRef.current[currentNodeId] || {}), pimMethod: method };
      setCurrentBlockType("ask_product_image_input");
      setIsWaitingInput(true);
      return;
    }
    // === confirmação de imagem do produto ===
    if (currentBlockType === "ask_product_image_confirm" && currentNodeId) {
      addUserMessage(button.text);
      const node = nodes.find((n) => n.id === currentNodeId);
      const cfg = (node?.data as any)?.config || {};
      const state = simNodeStateRef.current[currentNodeId] || {};
      if (button.value === "refazer") {
        addSystemMessage("🔄 Vamos refazer.");
        executeNode(node!);
        return;
      }
      const imgVar = normalizeVarName(cfg.outputImageVariable || "produto_imagem_url");
      const descVar = normalizeVarName(cfg.outputDescVariable || "produto_descricao");
      const newCtx = { ...contextRef.current };
      if (state.productImageUrl) newCtx[imgVar] = state.productImageUrl;
      if (state.productDescription) newCtx[descVar] = state.productDescription;
      contextRef.current = newCtx; setContext(newCtx); onContextChange?.(newCtx);
      addSuccessMessage("✅ Produto confirmado.");
      setIsWaitingInput(false); setCurrentBlockType(null);
      const next = getNextNode(currentNodeId);
      if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
      return;
    }
    // === ask_product_image (texto): escolha de amostra IA / regenerar / cancelar ===
    if (currentBlockType === "ask_product_image_text_pick" && currentNodeId) {
      addUserMessage(button.text);
      const node = nodes.find((n) => n.id === currentNodeId);
      const cfg = (node?.data as any)?.config || {};
      const st = simNodeStateRef.current[currentNodeId] || {};

      if (button.value === "cancel") {
        addSystemMessage("❌ Geração cancelada.");
        setIsWaitingInput(false); setCurrentBlockType(null);
        return;
      }
      if (button.value === "regen") {
        const desc = st.productDescription || "";
        if (!desc) {
          addSystemMessage("⚠️ Sem descrição para regenerar.");
          return;
        }
        generateProductSamples(currentNodeId, desc);
        return;
      }
      if (typeof button.value === "string" && button.value.startsWith("pick_")) {
        const idx = Number(button.value.split("_")[1]);
        const url = (st.productSamples || [])[idx];
        if (!url) { addSystemMessage("⚠️ Opção inválida."); return; }
        const imgVar = normalizeVarName(cfg.outputImageVariable || "produto_imagem_url");
        const descVar = normalizeVarName(cfg.outputDescVariable || "produto_descricao");
        const newCtx = { ...contextRef.current, [imgVar]: url };
        if (st.productDescription) newCtx[descVar] = st.productDescription;
        contextRef.current = newCtx; setContext(newCtx); onContextChange?.(newCtx);
        st.productImageUrl = url;
        simNodeStateRef.current[currentNodeId] = st;
        addSuccessMessage(`✅ Opção ${idx + 1} selecionada.`);
        setIsWaitingInput(false); setCurrentBlockType(null);
        const next = getNextNode(currentNodeId);
        if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
        return;
      }
      return;
    }


    if (currentBlockType === "text_content_options_pick" && currentNodeId) {
      addUserMessage(button.text);
      const st = simNodeStateRef.current[currentNodeId] || {};
      const opts: any[] = st.textContentOptions || [];
      const idx = typeof button.value === "string" && button.value.startsWith("tco_")
        ? Number(button.value.split("_")[1])
        : -1;
      const pick = opts[idx];
      if (!pick) { addSystemMessage("⚠️ Opção inválida."); return; }
      st.resolvedTextContent = {
        title: pick.title || "",
        subtitle: pick.subtitle || "",
        body: pick.body || "",
      };
      simNodeStateRef.current[currentNodeId] = st;
      addSuccessMessage(`✅ "${pick.label || `Opção ${idx + 1}`}" selecionada.`);
      setIsWaitingInput(false); setCurrentBlockType(null);
      const next = getNextNode(currentNodeId);
      if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
      return;
    }

    // === text_content (novo): Sim/Não inicial ===
    if (currentBlockType === "text_content_yesno" && currentNodeId) {
      addUserMessage(button.text);
      if (button.value === "nao") {
        simNodeStateRef.current[currentNodeId] = {
          ...(simNodeStateRef.current[currentNodeId] || {}),
          resolvedTextContent: { title: "", subtitle: "", body: "" },
        };
        addSuccessMessage("✅ Seguindo sem textos na imagem.");
        setIsWaitingInput(false); setCurrentBlockType(null);
        const next = getNextNode(currentNodeId);
        if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
        return;
      }
      // Sim → escolha do método
      setMessages((prev) => [...prev, {
        id: uid(), sender: "bot", text: "Quer que a IA crie sugestões automaticamente ou prefere digitar?", timestamp: new Date(), nodeId: currentNodeId,
        buttons: [
          { text: "✨ IA sugere para mim", value: "ai", buttonId: "tc_m_ai" },
          { text: "✍️ Eu digito", value: "type", buttonId: "tc_m_type" },
        ],
      }]);
      setCurrentBlockType("text_content_method");
      setIsWaitingInput(true);
      return;
    }


    // === text_content (novo): escolha entre digitar ou IA ===
    if (currentBlockType === "text_content_method" && currentNodeId) {
      addUserMessage(button.text);
      if (button.value === "type") {
        const askQueue = [
          { field: "title" as const, prompt: "Qual o título que devo colocar na imagem?" },
          { field: "subtitle" as const, prompt: "Qual o subtítulo? (digite '-' para deixar em branco)" },
        ];
        simNodeStateRef.current[currentNodeId] = {
          ...(simNodeStateRef.current[currentNodeId] || {}),
          resolvedTextContent: { title: "", subtitle: "", body: "" },
          textContentAskQueue: askQueue,
          textContentAskIndex: 0,
        };
        addBotMessage(askQueue[0].prompt, currentNodeId);
        setCurrentBlockType("text_content_ask");
        setPendingVariable(`__tc_${currentNodeId}`);
        setIsWaitingInput(true);
        return;
      }
      // ai
      addBotMessage("Que tipo de informação você quer transmitir na imagem? (ex.: oferta de Black Friday em smartphones, convite para evento de lançamento, divulgação de novo serviço...)", currentNodeId);
      setCurrentBlockType("text_content_ai_brief");
      setIsWaitingInput(true);
      return;
    }


    // === text_content (novo): escolha de sugestão da IA / loop ===
    if (currentBlockType === "text_content_ai_pick" && currentNodeId) {
      addUserMessage(button.text);
      const st = simNodeStateRef.current[currentNodeId] || {};
      if (button.value === "cancel") {
        st.resolvedTextContent = { title: "", subtitle: "", body: "" };
        simNodeStateRef.current[currentNodeId] = st;
        addSystemMessage("❌ Sugestões canceladas. Seguindo sem textos.");
        setIsWaitingInput(false); setCurrentBlockType(null);
        const next = getNextNode(currentNodeId);
        if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
        return;
      }
      if (button.value === "regen") {
        const brief = st.aiBrief || "";
        if (!brief) {
          addBotMessage("Por favor, me conte novamente o briefing:", currentNodeId);
          setCurrentBlockType("text_content_ai_brief");
          setIsWaitingInput(true);
          return;
        }
        generateTextContentSuggestions(currentNodeId, brief);
        return;
      }
      if (typeof button.value === "string" && button.value.startsWith("pick_")) {
        const idx = Number(button.value.split("_")[1]);
        const pick = (st.aiSuggestions || [])[idx];
        if (!pick) { addSystemMessage("⚠️ Opção inválida."); return; }
        st.resolvedTextContent = {
          title: pick.title || "",
          subtitle: pick.subtitle || "",
          body: "",
        };
        simNodeStateRef.current[currentNodeId] = st;
        addSuccessMessage(`✅ Opção ${idx + 1} selecionada.`);
        setIsWaitingInput(false); setCurrentBlockType(null);
        const next = getNextNode(currentNodeId);
        if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
        return;
      }
      return;
    }

    // === confirmação dos textos coletados (modo "Eu digito") ===
    if (currentBlockType === "text_content_confirm" && currentNodeId) {
      addUserMessage(button.text);
      const node = nodes.find((n) => n.id === currentNodeId);
      if (button.value === "editar") {
        addSystemMessage("✏️ Vamos refazer os textos.");
        executeNode(node!);
        return;
      }
      setIsWaitingInput(false); setCurrentBlockType(null);
      const next = getNextNode(currentNodeId);
      if (next) safeSetTimeout(() => { setCurrentNodeId(next.id); executeNode(next); }, 300);
      return;
    }

    // === content_type: clique em opção pré-definida ===
    if (currentBlockType === "content_type_ask" && currentNodeId) {
      addUserMessage(button.text);
      const matched = button.value;
      simNodeStateRef.current[currentNodeId] = {
        ...(simNodeStateRef.current[currentNodeId] || {}),
        resolvedContentType: { contentType: matched },
      };
      const meta = CONTENT_TYPE_DIRECTIVES[matched];
      addSystemMessage(`🎯 Tipo de Conteúdo definido: ${meta?.label || matched}.`);
      const ctNodeId = currentNodeId;
      setIsWaitingInput(false); setCurrentBlockType(null); setPendingVariable(null);
      const ctNodeData: any = nodes.find(n => n.id === ctNodeId)?.data || {};
      const ctCfg = ctNodeData.config || {};
      let nextNode: any = null;
      if (ctCfg.splitOutputs) {
        const edge = edges.find(e => e.source === ctNodeId && e.sourceHandle === `content_${matched}`);
        if (edge) nextNode = nodes.find(n => n.id === edge.target);
      }
      if (!nextNode) nextNode = getNextNode(ctNodeId);
      if (nextNode) safeSetTimeout(() => { setCurrentNodeId(nextNode.id); executeNode(nextNode); }, 400);
      return;
    }

    
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
    // Auto-detecta tipo pela extensão da URL — garante que imagens/vídeos sempre apareçam abertos
    let resolvedType: "image" | "video" | "audio" | "file" = mediaType || "file";
    const _u = safeMediaUrl.toLowerCase().split("?")[0];
    if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|heic|avif)$/.test(_u)) resolvedType = "image";
    else if (/\.(mp4|webm|mov|m4v|3gp|mkv)$/.test(_u)) resolvedType = "video";
    else if (/\.(mp3|wav|ogg|m4a|aac|opus)$/.test(_u)) resolvedType = "audio";
    const msg: Message = {
      id: uid(),
      sender: "bot",
      text: caption || "",
      timestamp: new Date(),
      nodeId,
      mediaUrl: safeMediaUrl,
      mediaType: resolvedType,
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

  const handleCancelFlow = () => {
    timeoutsRef.current.forEach((t) => clearTimeout(t));
    timeoutsRef.current = [];
    setIsWaitingInput(false);
    setCurrentBlockType(null);
    setPendingVariable(null);
    setInput("");
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    addSystemMessage("❌ Roteiro cancelado. Clique em 'Voltar ao início' para reiniciar.");
  };

  const handleReset = () => {
    // Limpar todos os timeouts pendentes
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current = [];
    
    // Reativar o simulador
    setIsActive(true);
    
    setMessages([]);
    const emptyContext = {};
    contextRef.current = emptyContext;
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
      <CardHeader className={`flex-shrink-0 border-b ${channelStyle.headerBg} py-2 px-2 sm:px-3`}>
        <div className="flex items-center justify-between gap-2 pl-9 lg:pl-0 flex-wrap">
          <CardTitle className={`text-sm flex items-center gap-2 min-w-0 ${channelStyle.headerText}`}>
            <span className="shrink-0">{channelStyle.icon}</span>
            <span className="truncate">Simulador - {channelStyle.name}</span>
          </CardTitle>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {channel === "whatsapp" && onProviderChange && (
              <div className="inline-flex items-center rounded-full border border-primary-foreground/20 bg-background/15 p-0.5" title="Provedor para simulação">
                <button
                  type="button"
                  onClick={() => onProviderChange("evolution")}
                  className={`h-6 px-2 text-[11px] font-medium rounded-full transition-colors ${provider === "evolution" ? "bg-primary text-primary-foreground shadow-sm" : "text-primary-foreground/80 hover:text-primary-foreground"}`}
                >
                  Evolution
                </button>
                <button
                  type="button"
                  onClick={() => onProviderChange("whatsapp_oficial")}
                  className={`h-6 px-2 text-[11px] font-medium rounded-full transition-colors ${provider === "whatsapp_oficial" ? "bg-primary text-primary-foreground shadow-sm" : "text-primary-foreground/80 hover:text-primary-foreground"}`}
                >
                  Oficial
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setRealMode((v) => {
                  const nv = !v;
                  toast[nv ? "warning" : "info"](nv ? "Modo Real ativado: webhooks e ações vão disparar de verdade" : "Modo Real desativado");
                  return nv;
                });
              }}
              title={realMode ? "Modo Real ativo — clicar desativa" : "Ativar Modo Real (dispara webhooks/ações de verdade)"}
              className={`inline-flex items-center gap-1 h-7 px-2 rounded-full text-[11px] font-semibold border transition-colors shrink-0 ${realMode ? "bg-red-500 text-white border-red-600 hover:bg-red-600" : "bg-white/10 text-white border-white/20 hover:bg-white/20"}`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span className="hidden md:inline">{realMode ? "Real" : "Sim"}</span>
            </button>
            <Button size="sm" variant="outline" onClick={handleReset} className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-full shrink-0 h-7 w-7 p-0" title="Reiniciar simulação">
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
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
                    className={`relative max-w-[80%] overflow-hidden shadow-sm ${
                      channel === 'whatsapp'
                        ? msg.sender === 'user'
                          ? 'rounded-lg rounded-tr-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] wa-bubble wa-bubble-user'
                          : 'rounded-lg rounded-tl-none shadow-[0_1px_0.5px_rgba(11,20,26,0.13)] wa-bubble wa-bubble-bot'
                        : 'rounded-2xl'
                    } ${
                      msg.sender === "user"
                        ? `${channelStyle.userBubble} ${channel === 'facebook' || channel === 'telegram' || channel === 'instagram' ? 'text-white' : 'text-foreground'}`
                        : `${channelStyle.botBubble} ${channel === 'telegram' ? 'text-white' : 'text-foreground'}`
                    }`}
                  >
                    {msg.mediaUrl && (
                      <div className={`w-full ${channel === 'whatsapp' ? 'p-[3px]' : ''}`}>
                        {msg.mediaType === "image" && (
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(msg.mediaUrl!)}
                            className={`block w-full ${channel === 'whatsapp' ? 'rounded-md overflow-hidden' : ''}`}
                            aria-label="Ampliar imagem"
                          >
                            <img 
                              src={msg.mediaUrl} 
                              alt={msg.text || "Mídia"} 
                              className="w-72 max-w-full aspect-square object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
                              loading="lazy"
                              onError={(e) => {
                                console.error("Image failed to load:", msg.mediaUrl);
                                e.currentTarget.alt = "Imagem indisponível";
                              }}
                            />
                          </button>
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
                    <div className={`flex items-start gap-2 ${msg.mediaUrl ? (channel === 'whatsapp' ? 'px-2 py-1.5' : 'px-4 py-2') : 'px-3 py-1.5'}`}>
                      {channel !== 'whatsapp' && msg.sender === "bot" && <Bot className="w-4 h-4 mt-0.5" />}
                      {channel !== 'whatsapp' && msg.sender === "user" && <User className="w-4 h-4 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        {msg.text && <p className={`${channel === 'whatsapp' ? 'text-[14.5px] leading-[19px] text-[#111B21]' : 'text-sm'} whitespace-pre-wrap break-words`}>{formatText(msg.text)}</p>}

                        {msg.socialLinks && msg.socialLinks.length > 0 && (
                          <div className="mt-3 grid grid-cols-1 gap-2">
                            {msg.socialLinks.map((sl, i) => {
                              const iconMap: Record<string, any> = {
                                instagram: Instagram,
                                facebook: Facebook,
                                tiktok: Music2,
                                linkedin: Linkedin,
                                twitter: Twitter,
                                youtube: Youtube,
                              };
                              const colorMap: Record<string, string> = {
                                instagram: "from-pink-500 to-purple-500",
                                facebook: "from-blue-600 to-blue-500",
                                tiktok: "from-foreground to-foreground/80",
                                linkedin: "from-blue-700 to-blue-600",
                                twitter: "from-foreground to-foreground/80",
                                youtube: "from-red-600 to-red-500",
                              };
                              const Icon = iconMap[sl.platform] || ExternalLink;
                              const grad = colorMap[sl.platform] || "from-primary to-primary/80";
                              return (
                                <a
                                  key={`${sl.platform}_${i}`}
                                  href={sl.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border bg-background hover:bg-muted/50 transition-all group"
                                >
                                  <div className={`h-9 w-9 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center text-white shadow-sm flex-shrink-0`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-semibold text-foreground">{sl.label || sl.platform}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">{sl.url}</p>
                                  </div>
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                                </a>
                              );
                            })}
                          </div>
                        )}


                        
                        {msg.isListButton && msg.listSections && (
                          <div className={channel === 'whatsapp' ? '-mx-4 -mb-2 mt-2' : 'mt-3'}>
                            {expandedListId === msg.id ? (
                              channel === 'whatsapp' ? (
                                <div className="border-t border-[#E9EDEF] bg-white">
                                  <div className="px-4 py-3 flex items-center justify-between border-b border-[#E9EDEF]">
                                    <span className="text-[15px] font-medium text-[#111B21]">{msg.listButtonText || 'Selecione uma opção'}</span>
                                    <button
                                      onClick={() => setExpandedListId(null)}
                                      className="text-[#54656F] hover:text-[#111B21]"
                                      aria-label="Fechar"
                                    >
                                      <XIcon className="w-4 h-4" />
                                    </button>
                                  </div>
                                  <ScrollArea className="max-h-[320px]">
                                    {msg.listSections.map((section, secIdx) => (
                                      <div key={secIdx}>
                                        {section.title && (
                                          <div className="px-4 pt-3 pb-1 text-[13px] font-semibold text-[#00A884]">
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
                                            className="w-full px-4 py-3 text-left hover:bg-[#F5F6F6] border-b border-[#E9EDEF] last:border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                          >
                                            <div className="text-[15px] text-[#111B21]">{item.label}</div>
                                            {item.description && (
                                              <div className="text-[13px] mt-0.5 text-[#667781]">{item.description}</div>
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                    ))}
                                  </ScrollArea>
                                </div>
                              ) : (
                                <div className="border border-border rounded-lg overflow-hidden bg-background">
                                  <div className="p-3 bg-muted border-b border-border flex items-center justify-between">
                                    <span className="text-sm font-medium">Selecione uma opção</span>
                                    <Button variant="ghost" size="sm" onClick={() => setExpandedListId(null)} className="h-6 px-2">✕</Button>
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
                                              handleButtonClick({ text: item.label, value: item.value || item.label, buttonId: `section_${secIdx}_item_${itemIdx}` }, msg.nodeId);
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
                              )
                            ) : (
                              channel === 'whatsapp' ? (
                                <button
                                  onClick={() => setExpandedListId(msg.id)}
                                  disabled={!isWaitingInput || msg.id !== activeListId}
                                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-t border-[#E9EDEF] text-[#00A884] font-medium text-[14px] hover:bg-[#F5F6F6] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <ListIcon className="w-4 h-4" />
                                  <span>{msg.listButtonText || 'Ver opções'}</span>
                                </button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setExpandedListId(msg.id)}
                                  disabled={!isWaitingInput || msg.id !== activeListId}
                                  className={`w-full justify-between ${channel === 'telegram' ? 'bg-[#3390EC] hover:bg-[#2B7FD9] text-white border-transparent' : ''}`}
                                >
                                  <span>{msg.listButtonText || 'Ver opções'}</span>
                                  <span className="ml-2">▼</span>
                                </Button>
                              )
                            )}
                          </div>
                        )}
                        
                        {msg.buttons && msg.buttons.length > 0 && !msg.isListButton && (
                          channel === 'whatsapp' ? (
                            <div className="-mx-4 -mb-2 mt-2 flex flex-col">
                              {msg.buttons.map((button, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleButtonClick(button, msg.nodeId)}
                                  disabled={!isWaitingInput && !button.action}
                                  className="w-full px-4 py-2.5 border-t border-[#E9EDEF] text-[#00A884] font-medium text-[14px] hover:bg-[#F5F6F6] disabled:opacity-50 disabled:cursor-not-allowed text-center"
                                >
                                  {button.text}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {msg.buttons.map((button, idx) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  className={`w-full justify-start ${channel === 'telegram' ? 'bg-[#3390EC] hover:bg-[#2B7FD9] text-white border-transparent' : ''}`}
                                  onClick={() => handleButtonClick(button, msg.nodeId)}
                                  disabled={!isWaitingInput && !button.action}
                                >
                                  {button.text}
                                </Button>
                              ))}
                            </div>
                          )
                        )}
                        
                        <div className={`flex items-center gap-1 mt-1 ${channel === 'whatsapp' ? 'justify-end' : ''}`}>
                          <span className={`text-[11px] ${channel === 'whatsapp' ? 'text-[#667781]' : 'opacity-70'}`}>
                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {channel === 'whatsapp' && msg.sender === 'user' && (
                            <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />
                          )}
                        </div>
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

          {/* Controles globais disponíveis em qualquer bloco */}
          <div className="flex gap-2 mb-2 justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancelFlow}
              className={`text-xs h-7 px-3 ${channel === 'telegram' ? 'text-gray-300 hover:text-white hover:bg-[#2B5278]' : 'text-muted-foreground hover:text-destructive'}`}
              title="Cancelar roteiro atual"
            >
              ❌ Cancelar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleReset}
              className={`text-xs h-7 px-3 ${channel === 'telegram' ? 'text-gray-300 hover:text-white hover:bg-[#2B5278]' : 'text-muted-foreground hover:text-primary'}`}
              title="Reiniciar do começo"
            >
              🔁 Voltar ao início
            </Button>
          </div>


          
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

      {/* Lightbox para ampliar imagens (estilo WhatsApp) */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setLightboxUrl(null); }}
            className="absolute top-4 right-4 h-10 w-10 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
            aria-label="Fechar imagem"
          >
            <XIcon className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Imagem ampliada"
            className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <a
            href={lightboxUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-4 right-4 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Abrir original
          </a>
        </div>
      )}

      {/* Caudas das bolhas estilo WhatsApp */}
      <style>{`
        .wa-bubble { position: relative; }
        .wa-bubble-bot::before {
          content: "";
          position: absolute; top: 0; left: -8px;
          width: 8px; height: 13px;
          background: inherit;
          clip-path: polygon(100% 0, 0 0, 100% 100%);
        }
        .wa-bubble-user::before {
          content: "";
          position: absolute; top: 0; right: -8px;
          width: 8px; height: 13px;
          background: inherit;
          clip-path: polygon(0 0, 100% 0, 0 100%);
        }
      `}</style>
    </div>
  );
};
