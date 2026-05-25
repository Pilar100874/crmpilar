import { useEffect, useMemo, useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Image as ImageIcon, Video, Cpu, AlertCircle, Music2, Images, Search, Check, X as XIcon, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROMPT_PRESETS, ALL_REF_BLOCKS, type PromptPreset } from "@/components/marketing/ai-studio/PromptPresets";

// Mapeia o bloco de referência exigido pelo preset → categoria da galeria do AI Studio
const REF_BLOCK_TO_GALLERY: Record<string, { categoria: string; label: string }> = {
  productImageSelect: { categoria: "salvas", label: "Produtos / Salvas" },
  galleryInfluencer: { categoria: "influencer", label: "Influencers" },
  galleryLogo: { categoria: "logo", label: "Logos" },
  galleryRoupa: { categoria: "roupa", label: "Roupas" },
  galleryPose: { categoria: "pose", label: "Poses" },
  galleryAmbiente: { categoria: "ambiente", label: "Ambientes" },
  galleryEstilo: { categoria: "estilo", label: "Estilos" },
  galleryPaleta: { categoria: "paleta", label: "Paletas" },
  galleryTextura: { categoria: "textura", label: "Texturas" },
};

// Picker inline reutilizando a mesma galeria do AI Generator Studio
const GalleryRefPicker = ({
  categoria,
  value,
  onSelect,
  onClear,
}: {
  categoria: string;
  value?: { url?: string; name?: string };
  onSelect: (item: { id: string; url: string; name: string }) => void;
  onClear: () => void;
}) => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    const estabId = localStorage.getItem("estabelecimentoId");
    if (!estabId) return;
    setLoading(true);
    if (categoria === "salvas") {
      const { data } = await supabase
        .from("media_gallery")
        .select("id, nome, public_url")
        .eq("estabelecimento_id", estabId)
        .in("tipo", ["imagem", "image", "gif"])
        .order("created_at", { ascending: false })
        .limit(120);
      setItems((data || []).map((it: any) => ({ id: it.id, nome: it.nome, image_url: it.public_url })));
    } else {
      const { data } = await supabase
        .from("studio_gallery_images")
        .select("id, nome, image_url")
        .eq("estabelecimento_id", estabId)
        .eq("categoria", categoria)
        .order("created_at", { ascending: false })
        .limit(120);
      setItems(data || []);
    }
    setLoading(false);
  }, [categoria]);

  useEffect(() => { if (open && items.length === 0) fetchItems(); }, [open, items.length, fetchItems]);

  const filtered = items.filter((i) => !search || i.nome?.toLowerCase().includes(search.toLowerCase()));

  if (value?.url) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border group">
        <img src={value.url} alt={value.name || ""} className="w-full h-24 object-cover bg-muted/30" />
        <button
          type="button"
          onClick={onClear}
          className="absolute top-1 right-1 p-1 rounded-full bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition"
        >
          <XIcon className="h-3 w-3" />
        </button>
        <p className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] bg-background/80 backdrop-blur truncate">
          {value.name}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex flex-col items-center gap-1 py-3 border border-dashed border-border rounded-lg hover:bg-muted/30 transition"
      >
        <FolderOpen className="h-4 w-4 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Escolher da galeria "{REF_BLOCK_TO_GALLERY[Object.keys(REF_BLOCK_TO_GALLERY).find(k => REF_BLOCK_TO_GALLERY[k].categoria === categoria) || ""]?.label || categoria}"</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar..."
          className="w-full h-7 pl-7 pr-2 text-[11px] rounded-md bg-muted/50 border border-border focus:outline-none"
        />
      </div>
      <div className="max-h-[180px] overflow-y-auto">
        {loading && <p className="text-[10px] text-muted-foreground text-center py-3">Carregando...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-3">
            Nenhuma imagem nessa galeria. Adicione no AI Studio → Galeria.
          </p>
        )}
        <div className="grid grid-cols-3 gap-1">
          {filtered.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => {
                onSelect({ id: img.id, url: img.image_url, name: img.nome || "" });
                setOpen(false);
              }}
              className="aspect-square rounded-md overflow-hidden border border-border hover:border-primary transition"
            >
              <img src={img.image_url} alt={img.nome || ""} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-[10px] text-muted-foreground hover:text-foreground w-full text-center py-1"
      >
        Cancelar
      </button>
    </div>
  );
};

// Picker inline para selecionar produto do CATÁLOGO (mesma fonte do AI Creative Studio)
const ProductCatalogPicker = ({
  value,
  onSelect,
  onClear,
}: {
  value?: { url?: string; name?: string };
  onSelect: (item: { id: string; url: string; name: string }) => void;
  onClear: () => void;
}) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const fetchProducts = useCallback(async () => {
    const estabId = localStorage.getItem("estabelecimentoId");
    if (!estabId) return;
    setLoading(true);
    const { data } = await supabase
      .from("produtos")
      .select("id, nome, codigo, foto_url")
      .eq("estabelecimento_id", estabId)
      .eq("ativo", true)
      .order("nome", { ascending: true })
      .limit(200);
    setProducts((data || []).filter((p: any) => p.foto_url));
    setLoading(false);
  }, []);

  useEffect(() => { if (open && products.length === 0) fetchProducts(); }, [open, products.length, fetchProducts]);

  const filtered = products.filter((p) =>
    !search ||
    p.nome?.toLowerCase().includes(search.toLowerCase()) ||
    p.codigo?.toLowerCase().includes(search.toLowerCase())
  );

  if (value?.url) {
    return (
      <div className="relative rounded-lg overflow-hidden border border-border group">
        <img src={value.url} alt={value.name || ""} className="w-full h-24 object-contain bg-muted/30" />
        <button
          type="button"
          onClick={onClear}
          className="absolute top-1 right-1 p-1 rounded-full bg-background/80 backdrop-blur opacity-0 group-hover:opacity-100 transition"
        >
          <XIcon className="h-3 w-3" />
        </button>
        <p className="absolute bottom-0 left-0 right-0 px-2 py-1 text-[10px] bg-background/80 backdrop-blur truncate">
          📦 {value.name}
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex flex-col items-center gap-1 py-3 border border-dashed border-emerald-500/40 rounded-lg hover:bg-emerald-500/5 transition"
      >
        <FolderOpen className="h-4 w-4 text-emerald-500/70" />
        <span className="text-[10px] text-muted-foreground">Escolher do catálogo de produtos</span>
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar produto..."
          className="w-full h-7 pl-7 pr-2 text-[11px] rounded-md bg-muted/50 border border-border focus:outline-none"
        />
      </div>
      <div className="max-h-[200px] overflow-y-auto space-y-1">
        {loading && <p className="text-[10px] text-muted-foreground text-center py-3">Carregando...</p>}
        {!loading && filtered.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-3">Nenhum produto com imagem cadastrada</p>
        )}
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              onSelect({ id: p.id, url: p.foto_url, name: p.nome });
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 p-1.5 rounded-md hover:bg-emerald-500/10 transition text-left"
          >
            <img src={p.foto_url} alt={p.nome} className="w-8 h-8 rounded object-cover border border-border shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium truncate">{p.nome}</p>
              {p.codigo && <p className="text-[9px] text-muted-foreground truncate">{p.codigo}</p>}
            </div>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="text-[10px] text-muted-foreground hover:text-foreground w-full text-center py-1"
      >
        Cancelar
      </button>
    </div>
  );
};





interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

// Catálogo de modelos disponíveis (alinhado com Visual Identity), agrupado por tipo de mídia
const IMAGE_MODELS = [
  { value: "", label: "Padrão (auto)" },
  { value: "google/gemini-2.5-flash-image", label: "🖼️ Gemini 2.5 Flash Image (Nano Banana)" },
  { value: "google/gemini-3-pro-image-preview", label: "🖼️ Gemini 3 Pro Image" },
  { value: "google/gemini-3.1-flash-image-preview", label: "🖼️ Gemini 3.1 Flash Image (Nano Banana 2)" },
  { value: "openai/dall-e-3", label: "🖼️ DALL·E 3" },
  { value: "stability/sd3.5-turbo", label: "🖼️ Stable Diffusion 3.5" },
  { value: "flux/1.1-pro", label: "🖼️ Flux 1.1 Pro" },
  { value: "ideogram/v3", label: "🖼️ Ideogram v3" },
];

const VIDEO_MODELS = [
  { value: "", label: "Padrão (auto)" },
  { value: "google/veo-3", label: "🎬 Google Veo 3" },
  { value: "google/veo-2.0", label: "🎬 Google Veo 2.0" },
  { value: "kling/3.0", label: "🎬 Kling 3.0" },
  { value: "runway/gen-3", label: "🎬 Runway Gen-3" },
  { value: "luma/dream-machine", label: "🎬 Luma Dream Machine" },
];

// Modelos sugeridos legíveis → mapeamento para o catálogo nativo
const SUGGESTED_MODEL_NATIVE_FALLBACK = (label: string, mediaType: "image" | "video"): string => {
  const l = (label || "").toLowerCase();
  if (mediaType === "video") {
    if (l.includes("veo 2")) return "google/veo-2.0";
    return "google/veo-3";
  }
  if (l.includes("nano banana pro") || l.includes("gemini 3 pro")) return "google/gemini-3-pro-image-preview";
  if (l.includes("nano banana 2") || l.includes("gemini 3.1 flash")) return "google/gemini-3.1-flash-image-preview";
  if (l.includes("flux")) return "flux/1.1-pro";
  if (l.includes("ideogram")) return "ideogram/v3";
  if (l.includes("dall")) return "openai/dall-e-3";
  if (l.includes("stable")) return "stability/sd3.5-turbo";
  return "google/gemini-2.5-flash-image";
};

// Carrega presets customizados criados no Studio (mesma chave usada lá)
const CUSTOM_PRESETS_KEY = "ai-studio-custom-prompt-presets";
const loadAllSystemPresets = (): PromptPreset[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const saved: PromptPreset[] = raw ? JSON.parse(raw) : [];
    if (saved.length > 0) return saved;
  } catch {}
  return [...PROMPT_PRESETS];
};


// Estilos de som ambiente para vídeo
const AMBIENT_SOUND_STYLES = [
  { value: "", label: "Nenhum" },
  { value: "cinematic_score", label: "🎬 Trilha cinematográfica" },
  { value: "upbeat_pop", label: "🎉 Pop animado" },
  { value: "lofi_chill", label: "🎧 Lo-fi chill" },
  { value: "corporate_inspirational", label: "💼 Corporativo inspirador" },
  { value: "epic_trailer", label: "🔥 Épico (trailer)" },
  { value: "ambient_nature", label: "🌿 Ambiente natural" },
  { value: "electronic_modern", label: "⚡ Eletrônico moderno" },
  { value: "acoustic_warm", label: "🎸 Acústico aconchegante" },
  { value: "luxury_elegant", label: "✨ Luxo elegante" },
  { value: "silence", label: "🔇 Sem música (silêncio)" },
];

export const GenerateAIMediaConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const mediaType = config.mediaType || "image";
  const styleSource = config.styleSource || "visual_identity";
  const acceptText = config.acceptText ?? true;
  const acceptImageRef = config.acceptImageRef ?? false;
  const audioMode = config.audioMode || "none";

  const [viInfo, setViInfo] = useState<{ model: string; negative: string; loaded: boolean }>({
    model: "", negative: "", loaded: false,
  });

  // Carrega Identidade Visual para mostrar modelo/negativo herdados
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const estabelecimentoId = localStorage.getItem("estabelecimentoId") || "";
      if (!estabelecimentoId) return;
      const { data } = await supabase
        .from("studio_visual_identity")
        .select("preferred_model, negative_prompt")
        .eq("estabelecimento_id", estabelecimentoId)
        .maybeSingle();
      if (cancelled) return;
      setViInfo({
        model: (data as any)?.preferred_model || "",
        negative: (data as any)?.negative_prompt || "",
        loaded: true,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  // Todos os presets do sistema (defaults + customizados criados no Studio)
  const allSystemPresets = useMemo(() => loadAllSystemPresets(), []);
  const presetsForType = useMemo(
    () => allSystemPresets.filter((p) => p.mediaType === mediaType),
    [allSystemPresets, mediaType],
  );
  const selectedPreset: PromptPreset | undefined = useMemo(
    () => allSystemPresets.find((p) => p.id === config.preset),
    [allSystemPresets, config.preset],
  );

  const handlePresetChange = (presetId: string) => {
    handleConfigChange("preset", presetId);
    const p = allSystemPresets.find((x) => x.id === presetId);
    if (!p) return;
    // Salva nome para rastreio de uso (bloqueio de exclusão no Studio)
    handleConfigChange("presetName", p.name);
    // Modelo sugerido pelo preset → mapeia para o catálogo nativo
    if (!config.modelOverridden) {
      const suggestedLabel = (p.suggestedModels && p.suggestedModels[0]) || p.fallbackModel || p.originalModel || "";
      handleConfigChange("model", SUGGESTED_MODEL_NATIVE_FALLBACK(suggestedLabel, p.mediaType));
    }
    if (!config.negativePromptOverridden && p.negativePrompt) {
      handleConfigChange("negativePrompt", p.negativePrompt);
    }
  };


  const effectiveModel =
    config.model !== undefined && config.model !== ""
      ? config.model
      : styleSource === "visual_identity"
        ? viInfo.model
        : "";

  const effectiveNegative =
    config.negativePrompt !== undefined && config.negativePrompt !== ""
      ? config.negativePrompt
      : styleSource === "visual_identity"
        ? viInfo.negative
        : "";

  return (
    <div className="space-y-4">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription className="text-xs">
          O bloco usa o texto e/ou imagem que o usuário enviar via WhatsApp para gerar variações.
          O usuário escolhe uma e o fluxo continua com a mídia selecionada.
        </AlertDescription>
      </Alert>

      {/* 1. Tipo de mídia */}
      <div className="space-y-2">
        <Label>1. O que gerar?</Label>
        <RadioGroup
          value={mediaType}
          onValueChange={(v) => {
            handleConfigChange("mediaType", v);
            // Reseta o modelo selecionado quando troca o tipo para evitar usar um modelo incompatível
            const valid = (v === "video" ? VIDEO_MODELS : IMAGE_MODELS).some((m) => m.value === config.model);
            if (!valid) {
              handleConfigChange("model", "");
              handleConfigChange("modelOverridden", false);
            }
            // Limpa preset se não pertencer ao novo tipo de mídia
            if (config.preset) {
              const currentPreset = allSystemPresets.find((p) => p.id === config.preset);
              if (!currentPreset || currentPreset.mediaType !== v) {
                handleConfigChange("preset", "");
                handleConfigChange("presetName", "");
                handleConfigChange("referenceInputs", {});
              }
            }
          }}
          className="grid grid-cols-2 gap-2"
        >

          <label className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ${mediaType === "image" ? "border-primary bg-primary/10" : "border-border"}`}>
            <RadioGroupItem value="image" />
            <ImageIcon className="h-4 w-4" />
            <span className="text-xs font-medium">Imagem</span>
          </label>
          <label className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ${mediaType === "video" ? "border-primary bg-primary/10" : "border-border"}`}>
            <RadioGroupItem value="video" />
            <Video className="h-4 w-4" />
            <span className="text-xs font-medium">Vídeo</span>
          </label>
        </RadioGroup>
      </div>

      {/* 2. Estilo: Identidade Visual ou Preset */}
      <div className="space-y-2">
        <Label>2. Estilo visual</Label>
        <RadioGroup
          value={styleSource}
          onValueChange={(v) => {
            handleConfigChange("styleSource", v);
            if (v === "visual_identity") {
              // Limpa dados do preset para não vazarem na geração
              handleConfigChange("preset", "");
              handleConfigChange("presetName", "");
              handleConfigChange("referenceInputs", {});
            }
          }}
          className="space-y-1"
        >
          <label className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ${styleSource === "visual_identity" ? "border-primary bg-primary/10" : "border-border"}`}>
            <RadioGroupItem value="visual_identity" />
            <span className="text-xs font-medium">Usar Identidade Visual da marca</span>
          </label>
          <label className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ${styleSource === "preset" ? "border-primary bg-primary/10" : "border-border"}`}>
            <RadioGroupItem value="preset" />
            <span className="text-xs font-medium">Selecionar um preset pronto</span>
          </label>
        </RadioGroup>

        {styleSource === "preset" && (
          <>
            {presetsForType.length === 0 && (
              <p className="text-[10px] text-muted-foreground">Nenhum preset disponível para {mediaType === "video" ? "vídeo" : "imagem"}.</p>
            )}
            <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
              {presetsForType.map((p) => {
                const isSelected = config.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handlePresetChange(p.id)}
                    className={`group relative rounded-lg overflow-hidden border-2 text-left transition ${
                      isSelected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="aspect-video bg-muted/40 overflow-hidden">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Sparkles className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    {p.bestSeller && (
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-amber-500/90 text-white">
                        🏆 Top
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute top-1 right-1 p-1 rounded-full bg-primary text-primary-foreground">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                    <div className="p-1.5 bg-background">
                      <p className="text-[11px] font-medium leading-tight line-clamp-1">{p.name}</p>
                      <p className="text-[9px] text-muted-foreground line-clamp-1">{p.category}</p>
                    </div>
                  </button>
                );
              })}
            </div>
            {selectedPreset && (
              <p className="text-[10px] text-muted-foreground">
                {selectedPreset.tags.slice(0, 4).map((t) => `#${t}`).join(" ")}
              </p>
            )}
          </>
        )}


        {/* Blocos de referência exigidos pelo preset */}
        {styleSource === "preset" && selectedPreset && selectedPreset.referenceBlocks?.length > 0 && (
          <div className="space-y-2 p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
            <div className="flex items-center gap-2">
              <Images className="h-4 w-4 text-primary" />
              <Label className="text-xs font-semibold">
                Imagens de referência exigidas pelo preset
              </Label>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Para cada item, escolha como a imagem chega: <strong>variável</strong> de bloco anterior, <strong>galeria do Studio</strong> (fixa) ou <strong>pedida ao usuário</strong> via WhatsApp.
            </p>
            {selectedPreset.referenceBlocks.map((blockId) => {
              const def = ALL_REF_BLOCKS.find((b) => b.id === blockId);
              if (!def) return null;
              const galleryCat = REF_BLOCK_TO_GALLERY[blockId];
              const refInputs = config.referenceInputs || {};
              const current = refInputs[blockId] || { mode: "ask" };
              const updateRef = (patch: any) => {
                handleConfigChange("referenceInputs", {
                  ...refInputs,
                  [blockId]: { ...current, ...patch },
                });
              };
              return (
                <div key={blockId} className="p-2 rounded-md border border-border bg-background/60 space-y-2">
                  <p className="text-xs font-medium">{def.emoji} {def.label}</p>
                  <RadioGroup
                    value={current.mode}
                    onValueChange={(v) => updateRef({ mode: v })}
                    className="space-y-1"
                  >
                    <label className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${current.mode === "ask" ? "border-primary bg-primary/10" : "border-border"}`}>
                      <RadioGroupItem value="ask" className="mt-0.5" />
                      <div>
                        <p className="text-[11px] font-medium">Pedir ao usuário no WhatsApp</p>
                        <p className="text-[10px] text-muted-foreground">O bot solicita que o usuário envie esta imagem na conversa</p>
                      </div>
                    </label>
                    {galleryCat && (
                      <label className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${current.mode === "gallery" ? "border-primary bg-primary/10" : "border-border"}`}>
                        <RadioGroupItem value="gallery" className="mt-0.5" />
                        <div>
                          <p className="text-[11px] font-medium">
                            {blockId === "productImageSelect"
                              ? "Selecionar do catálogo de produtos"
                              : "Selecionar da galeria do AI Studio"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {blockId === "productImageSelect"
                              ? "Mesma fonte usada no AI Creative Studio · seus produtos cadastrados"
                              : `Mesma biblioteca usada no Studio · categoria "${galleryCat.label}"`}
                          </p>
                        </div>
                      </label>
                    )}
                    <label className={`flex items-start gap-2 p-2 rounded border cursor-pointer ${current.mode === "variable" ? "border-primary bg-primary/10" : "border-border"}`}>
                      <RadioGroupItem value="variable" className="mt-0.5" />
                      <div>
                        <p className="text-[11px] font-medium">Usar variável de bloco anterior</p>
                        <p className="text-[10px] text-muted-foreground">Ex: imagem vinda do bloco Buscar Produto</p>
                      </div>
                    </label>
                  </RadioGroup>

                  {current.mode === "variable" && (
                    <Input
                      value={current.variable || ""}
                      onChange={(e) => updateRef({ variable: e.target.value })}
                      placeholder={`Variável (ex: ${blockId === "productImageSelect" ? "produto_imagem_url" : blockId === "galleryInfluencer" ? "influencer_url" : "imagem_url"})`}
                      className="h-8 text-xs"
                    />
                  )}
                  {current.mode === "ask" && (
                    <Input
                      value={current.askMessage || ""}
                      onChange={(e) => updateRef({ askMessage: e.target.value })}
                      placeholder={`Mensagem ao usuário (ex: Envie uma foto de ${def.label.toLowerCase()})`}
                      className="h-8 text-xs"
                    />
                  )}
                  {current.mode === "gallery" && galleryCat && (
                    blockId === "productImageSelect" ? (
                      <ProductCatalogPicker
                        value={{ url: current.galleryUrl, name: current.galleryName }}
                        onSelect={(it) => updateRef({ galleryId: it.id, galleryUrl: it.url, galleryName: it.name, productId: it.id })}
                        onClear={() => updateRef({ galleryId: "", galleryUrl: "", galleryName: "", productId: "" })}
                      />
                    ) : (
                      <GalleryRefPicker
                        categoria={galleryCat.categoria}
                        value={{ url: current.galleryUrl, name: current.galleryName }}
                        onSelect={(it) => updateRef({ galleryId: it.id, galleryUrl: it.url, galleryName: it.name })}
                        onClear={() => updateRef({ galleryId: "", galleryUrl: "", galleryName: "" })}
                      />
                    )
                  )}
                </div>
              );
            })}

          </div>
        )}


        {styleSource === "visual_identity" && viInfo.loaded && (
          <div className="p-2 rounded-md bg-muted/40 border border-border space-y-1">
            <p className="text-[10px] text-muted-foreground">
              <strong>Modelo da IV:</strong> {viInfo.model || "padrão"} •{" "}
              <strong>Negativo:</strong> {viInfo.negative ? `"${viInfo.negative.slice(0, 60)}${viInfo.negative.length > 60 ? "…" : ""}"` : "não definido"}
            </p>
            {!viInfo.model && !viInfo.negative && (
              <p className="text-[10px] text-amber-600 dark:text-amber-400">
                ⚠️ Defina modelo e prompt negativo em Identidade Visual para herdar aqui.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2b. Modelo de IA */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs">Modelo de IA</Label>
        </div>
        <select
          value={effectiveModel}
          onChange={(e) => {
            handleConfigChange("model", e.target.value);
            handleConfigChange("modelOverridden", true);
          }}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          {(mediaType === "video" ? VIDEO_MODELS : IMAGE_MODELS).map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
        <p className="text-[10px] text-muted-foreground">
          Lista filtrada por tipo de mídia ({mediaType === "video" ? "vídeo" : "imagem"}). Sugerido pelo preset/IV; pode trocar manualmente.
        </p>

      </div>

      {/* 2c. Prompt negativo */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <Label className="text-xs">Prompt negativo (o que NÃO pode aparecer)</Label>
        </div>
        <Textarea
          value={effectiveNegative}
          onChange={(e) => {
            handleConfigChange("negativePrompt", e.target.value);
            handleConfigChange("negativePromptOverridden", true);
          }}
          placeholder="Ex: sem texto, sem logos de concorrentes, sem watermark..."
          rows={2}
        />
      </div>

      {/* 3. Entradas do usuário */}
      <div className="space-y-2">
        <Label>3. Entradas do usuário (via WhatsApp)</Label>

        <div className="flex items-center justify-between p-2 rounded-lg border border-border">
          <div>
            <p className="text-xs font-medium">Receber texto</p>
            <p className="text-[10px] text-muted-foreground">Pede um texto/descrição ao usuário</p>
          </div>
          <Switch
            checked={acceptText}
            onCheckedChange={(v) => handleConfigChange("acceptText", v)}
          />
        </div>
        {acceptText && (
          <Input
            value={config.textPrompt || ""}
            onChange={(e) => handleConfigChange("textPrompt", e.target.value)}
            placeholder="Pergunta ao usuário (ex: Descreva a cena desejada)"
          />
        )}

        <div className="flex items-center justify-between p-2 rounded-lg border border-border">
          <div>
            <p className="text-xs font-medium">Usar imagem de referência</p>
            <p className="text-[10px] text-muted-foreground">Imagem que orienta a geração</p>
          </div>
          <Switch
            checked={acceptImageRef}
            onCheckedChange={(v) => handleConfigChange("acceptImageRef", v)}
          />
        </div>
        {acceptImageRef && (
          <div className="space-y-2 pl-2 border-l-2 border-primary/40">
            <Label className="text-xs">Origem da imagem de referência</Label>
            <RadioGroup
              value={config.imageRefSource || "user"}
              onValueChange={(v) => handleConfigChange("imageRefSource", v)}
              className="space-y-1"
            >
              <label className={`flex items-start gap-2 p-2 rounded-lg border-2 cursor-pointer ${(config.imageRefSource || "user") === "user" ? "border-primary bg-primary/10" : "border-border"}`}>
                <RadioGroupItem value="user" className="mt-0.5" />
                <div>
                  <p className="text-xs font-medium">Pedir ao usuário no WhatsApp</p>
                  <p className="text-[10px] text-muted-foreground">O bot pede uma foto durante a conversa</p>
                </div>
              </label>
              <label className={`flex items-start gap-2 p-2 rounded-lg border-2 cursor-pointer ${config.imageRefSource === "variable" ? "border-primary bg-primary/10" : "border-border"}`}>
                <RadioGroupItem value="variable" className="mt-0.5" />
                <div>
                  <p className="text-xs font-medium">Usar variável de bloco anterior</p>
                  <p className="text-[10px] text-muted-foreground">Ex: imagem do bloco Buscar Produto</p>
                </div>
              </label>
              <label className={`flex items-start gap-2 p-2 rounded-lg border-2 cursor-pointer ${config.imageRefSource === "both" ? "border-primary bg-primary/10" : "border-border"}`}>
                <RadioGroupItem value="both" className="mt-0.5" />
                <div>
                  <p className="text-xs font-medium">Variável + permitir o usuário enviar outra</p>
                  <p className="text-[10px] text-muted-foreground">Usa a variável; se o usuário mandar foto, ela substitui</p>
                </div>
              </label>
            </RadioGroup>

            {(config.imageRefSource === "variable" || config.imageRefSource === "both") && (
              <div className="space-y-1">
                <Label className="text-xs">Variável com a URL da imagem</Label>
                <Input
                  value={config.imageRefVariable || ""}
                  onChange={(e) => handleConfigChange("imageRefVariable", e.target.value)}
                  placeholder="produto_imagem_url"
                />
                <p className="text-[10px] text-muted-foreground">
                  Use <code>{`{{produto_imagem_url}}`}</code> do bloco <strong>Buscar Produto</strong> ou qualquer variável que contenha uma URL de imagem.
                </p>
              </div>
            )}

            {(config.imageRefSource === "user" || config.imageRefSource === "both") && (
              <Input
                value={config.imagePrompt || ""}
                onChange={(e) => handleConfigChange("imagePrompt", e.target.value)}
                placeholder="Pergunta ao usuário (ex: Envie uma foto de referência)"
              />
            )}
          </div>
        )}
      </div>

      {/* 4. Variações */}
      <div className="space-y-2">
        <Label>4. Quantidade de variações</Label>
        <Input
          type="number"
          min={1}
          max={6}
          value={config.variations || 4}
          onChange={(e) => handleConfigChange("variations", Number(e.target.value))}
        />
        <p className="text-[10px] text-muted-foreground">
          O usuário receberá as variações para escolher uma.
        </p>
      </div>

      {/* 5. Áudio (apenas para vídeo) */}
      {mediaType === "video" && (
        <div className="space-y-3 p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2">
            <Music2 className="h-4 w-4 text-primary" />
            <Label className="text-xs font-semibold">5. Áudio do vídeo</Label>
          </div>

          <RadioGroup
            value={audioMode}
            onValueChange={(v) => handleConfigChange("audioMode", v)}
            className="space-y-1"
          >
            <label className={`flex items-start gap-2 p-2 rounded-lg border-2 cursor-pointer ${audioMode === "none" ? "border-primary bg-primary/10" : "border-border"}`}>
              <RadioGroupItem value="none" className="mt-0.5" />
              <div>
                <p className="text-xs font-medium">Sem áudio</p>
                <p className="text-[10px] text-muted-foreground">Vídeo mudo</p>
              </div>
            </label>
            <label className={`flex items-start gap-2 p-2 rounded-lg border-2 cursor-pointer ${audioMode === "voice" ? "border-primary bg-primary/10" : "border-border"}`}>
              <RadioGroupItem value="voice" className="mt-0.5" />
              <div>
                <p className="text-xs font-medium">Narração (texto → voz)</p>
                <p className="text-[10px] text-muted-foreground">O texto abaixo será falado no vídeo</p>
              </div>
            </label>
            <label className={`flex items-start gap-2 p-2 rounded-lg border-2 cursor-pointer ${audioMode === "ambient" ? "border-primary bg-primary/10" : "border-border"}`}>
              <RadioGroupItem value="ambient" className="mt-0.5" />
              <div>
                <p className="text-xs font-medium">Som ambiente / trilha de fundo</p>
                <p className="text-[10px] text-muted-foreground">Estilo musical escolhido abaixo</p>
              </div>
            </label>
            <label className={`flex items-start gap-2 p-2 rounded-lg border-2 cursor-pointer ${audioMode === "voice_ambient" ? "border-primary bg-primary/10" : "border-border"}`}>
              <RadioGroupItem value="voice_ambient" className="mt-0.5" />
              <div>
                <p className="text-xs font-medium">Narração + trilha de fundo</p>
                <p className="text-[10px] text-muted-foreground">Combina voz e música ambiente</p>
              </div>
            </label>
          </RadioGroup>

          {(audioMode === "voice" || audioMode === "voice_ambient") && (
            <div className="space-y-1">
              <Label className="text-xs">Texto da narração</Label>
              <Textarea
                value={config.audioScript || ""}
                onChange={(e) => handleConfigChange("audioScript", e.target.value)}
                placeholder="Ex: Conheça o novo produto que vai transformar sua rotina..."
                rows={3}
              />
              <div className="flex gap-2">
                <select
                  value={config.audioVoice || "pt-BR-feminina-jovem"}
                  onChange={(e) => handleConfigChange("audioVoice", e.target.value)}
                  className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="pt-BR-feminina-jovem">🎙️ Feminina jovem (PT-BR)</option>
                  <option value="pt-BR-feminina-adulta">🎙️ Feminina adulta (PT-BR)</option>
                  <option value="pt-BR-masculina-jovem">🎙️ Masculina jovem (PT-BR)</option>
                  <option value="pt-BR-masculina-adulta">🎙️ Masculina adulta (PT-BR)</option>
                  <option value="pt-BR-narrador">🎙️ Narrador profissional</option>
                </select>
              </div>
            </div>
          )}

          {(audioMode === "ambient" || audioMode === "voice_ambient") && (
            <div className="space-y-1">
              <Label className="text-xs">Estilo do som de fundo</Label>
              <select
                value={config.ambientStyle || ""}
                onChange={(e) => handleConfigChange("ambientStyle", e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
              >
                {AMBIENT_SOUND_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Prompt base opcional */}
      <div className="space-y-2">
        <Label>Prompt base (opcional)</Label>
        <Textarea
          value={config.basePrompt || ""}
          onChange={(e) => handleConfigChange("basePrompt", e.target.value)}
          placeholder="Instruções fixas que serão somadas ao texto do usuário"
          rows={3}
        />
      </div>

      {/* Variável de saída */}
      <div className="space-y-2">
        <Label>Variável de saída</Label>
        <Input
          value={config.outputVariable || "midia_selecionada"}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
          placeholder="midia_selecionada"
        />
        <p className="text-[10px] text-muted-foreground">
          Armazena a URL da mídia escolhida pelo usuário.
        </p>
      </div>
    </div>
  );
};
