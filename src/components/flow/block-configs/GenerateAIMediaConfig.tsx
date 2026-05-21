import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Image as ImageIcon, Video, Cpu, AlertCircle, Music2, Images } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PROMPT_PRESETS, ALL_REF_BLOCKS, type PromptPreset } from "@/components/marketing/ai-studio/PromptPresets";


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


interface PresetDef {
  id: string;
  label: string;
  mediaType: "image" | "video";
  suggestedModel: string;
  negativePrompt: string;
}

const PRESETS: PresetDef[] = [
  {
    id: "produto_branco", label: "Produto fundo branco", mediaType: "image",
    suggestedModel: "google/gemini-3-pro-image-preview",
    negativePrompt: "sem texto, sem logos, sem marca d'água, sem pessoas, sem sombras duras, sem elementos extras",
  },
  {
    id: "produto_lifestyle", label: "Produto lifestyle", mediaType: "image",
    suggestedModel: "flux/1.1-pro",
    negativePrompt: "sem texto, sem deformações, sem objetos competindo com o produto, sem watermark",
  },
  {
    id: "influencer_ugc", label: "Influencer / UGC", mediaType: "image",
    suggestedModel: "google/gemini-3.1-flash-image-preview",
    negativePrompt: "sem texto, sem rosto deformado, sem mãos extras, sem watermark, sem conteúdo erótico",
  },
  {
    id: "post_promocional", label: "Post promocional", mediaType: "image",
    suggestedModel: "ideogram/v3",
    negativePrompt: "sem erros de tipografia, sem texto cortado, sem elementos fora do enquadramento",
  },
  {
    id: "story_vertical", label: "Story vertical 9:16", mediaType: "image",
    suggestedModel: "google/gemini-3-pro-image-preview",
    negativePrompt: "sem barras laterais, sem texto sobreposto não solicitado, sem logos de terceiros",
  },
  {
    id: "cinematic", label: "Cinematic / Reels", mediaType: "video",
    suggestedModel: "google/veo-3",
    negativePrompt: "sem texto, sem cortes abruptos, sem distorção facial, sem watermark",
  },
];

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

  const handlePresetChange = (presetId: string) => {
    handleConfigChange("preset", presetId);
    const p = PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    // Aplica modelo sugerido e prompt negativo automaticamente (não sobrescreve se usuário já mexeu)
    if (!config.modelOverridden) {
      handleConfigChange("model", p.suggestedModel);
    }
    if (!config.negativePromptOverridden) {
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
          onValueChange={(v) => handleConfigChange("styleSource", v)}
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
          <select
            value={config.preset || ""}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione um preset...</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
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
