import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquareText, Sparkles, Image as ImageIcon, Video, Info, Check } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { PROMPT_PRESETS, type PromptPreset } from "@/components/marketing/ai-studio/PromptPresets";

interface Props {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

const CUSTOM_PRESETS_KEY = "ai-studio-custom-prompt-presets";
const loadAllSystemPresets = (): PromptPreset[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    const saved: PromptPreset[] = raw ? JSON.parse(raw) : [];
    const savedIds = new Set(saved.map((p) => p.id));
    const merged = [...PROMPT_PRESETS.filter((p) => !savedIds.has(p.id)), ...saved];
    return merged;
  } catch {
    return [...PROMPT_PRESETS];
  }
};

export const MensagemPreDefinidaConfig = ({ config, handleConfigChange }: Props) => {
  const [grupos, setGrupos] = useState<Array<{ id: string; nome: string }>>([]);
  const [temas, setTemas] = useState<string[]>([]);
  const [frases, setFrases] = useState<Array<{ id: string; frase: string; tema: string; grupo_id: string | null }>>([]);
  const [estabId, setEstabId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const eid = await getEstabelecimentoId();
      if (!eid) return;
      setEstabId(eid);
      const { data } = await supabase
        .from("produto_grupos")
        .select("id, nome")
        .eq("estabelecimento_id", eid)
        .order("nome");
      setGrupos(data || []);
    })();
  }, []);

  const escopo = config.escopo || "qualquer";
  const grupoId = config.grupoId || "";
  const tema = config.tema || "";
  const modoSelecao = config.modoSelecao || "rotacao";
  const apresentacao = config.apresentacao || "texto";
  const mediaType = (config.mediaType as "image" | "video") || "image";
  const styleSource = config.styleSource || "visual_identity";

  const allSystemPresets = useMemo(() => loadAllSystemPresets(), []);
  const presetsForType = useMemo(
    () => allSystemPresets.filter((p) => p.mediaType === mediaType),
    [allSystemPresets, mediaType],
  );
  const selectedPreset = useMemo(
    () => allSystemPresets.find((p) => p.id === config.preset),
    [allSystemPresets, config.preset],
  );

  const handlePresetChange = (presetId: string) => {
    handleConfigChange("preset", presetId);
    const p = allSystemPresets.find((x) => x.id === presetId);
    if (p) handleConfigChange("presetName", p.name);
  };

  // Carrega frases (para popular temas e a lista fixa)
  useEffect(() => {
    if (!estabId) return;
    (async () => {
      let q = supabase
        .from("mensagens_grupo_produto")
        .select("id, frase, tema, grupo_id")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .order("tema")
        .order("ordem");
      if (escopo === "geral") q = q.is("grupo_id", null);
      else if (escopo === "grupo" && grupoId) q = q.eq("grupo_id", grupoId);
      const { data } = await q;
      const list = (data || []) as any[];
      setFrases(list);
      const uniq = Array.from(new Set(list.map((f) => f.tema))).sort();
      setTemas(uniq);
    })();
  }, [estabId, escopo, grupoId]);

  const frasesFiltradasParaFixa = useMemo(() => {
    return tema ? frases.filter((f) => f.tema === tema) : frases;
  }, [frases, tema]);

  return (
    <div className="space-y-4">
      <Alert>
        <MessageSquareText className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Pega uma frase do cadastro <b>Marketing → Mensagens pré definidas</b> e envia como
          texto ou como imagem/vídeo gerado por IA.
        </AlertDescription>
      </Alert>

      {/* Escopo */}
      <div className="space-y-2">
        <Label className="text-xs">De onde pegar a frase</Label>
        <RadioGroup value={escopo} onValueChange={(v) => handleConfigChange("escopo", v)}>
          <div className="flex items-center gap-2"><RadioGroupItem value="qualquer" id="esc_q" /><label htmlFor="esc_q" className="text-xs">Qualquer frase cadastrada</label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="geral" id="esc_g" /><label htmlFor="esc_g" className="text-xs">Somente escopo Geral (sem grupo)</label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="grupo" id="esc_gp" /><label htmlFor="esc_gp" className="text-xs">Grupo específico</label></div>
        </RadioGroup>
      </div>

      {escopo === "grupo" && (
        <div className="space-y-1">
          <Label className="text-xs">Grupo de produtos</Label>
          <Select value={grupoId} onValueChange={(v) => handleConfigChange("grupoId", v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
            <SelectContent>
              {grupos.map((g) => <SelectItem key={g.id} value={g.id} className="text-xs">{g.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {escopo !== "qualquer" && (
        <div className="space-y-1">
          <Label className="text-xs">Tema (opcional)</Label>
          <Select value={tema || "__all__"} onValueChange={(v) => handleConfigChange("tema", v === "__all__" ? "" : v)}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">Todos os temas</SelectItem>
              {temas.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Modo de seleção */}
      <div className="space-y-2">
        <Label className="text-xs">Como escolher a frase</Label>
        <RadioGroup value={modoSelecao} onValueChange={(v) => handleConfigChange("modoSelecao", v)}>
          <div className="flex items-center gap-2"><RadioGroupItem value="rotacao" id="sel_r" /><label htmlFor="sel_r" className="text-xs">Rotação — nunca repete até usar todas</label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="aleatoria" id="sel_a" /><label htmlFor="sel_a" className="text-xs">Aleatória a cada execução</label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="fixa" id="sel_f" /><label htmlFor="sel_f" className="text-xs">Frase fixa (sempre a mesma)</label></div>
        </RadioGroup>
      </div>

      {modoSelecao === "fixa" && (
        <div className="space-y-1">
          <Label className="text-xs">Frase</Label>
          <Select value={config.fraseId || ""} onValueChange={(v) => handleConfigChange("fraseId", v)}>
            <SelectTrigger className="h-auto min-h-8 text-xs"><SelectValue placeholder="Escolha uma frase..." /></SelectTrigger>
            <SelectContent className="max-w-[380px]">
              {frasesFiltradasParaFixa.length === 0 && (
                <div className="p-2 text-[11px] text-muted-foreground">Nenhuma frase encontrada para o filtro.</div>
              )}
              {frasesFiltradasParaFixa.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-xs">
                  <span className="text-[10px] text-muted-foreground mr-1">[{f.tema}]</span>
                  {f.frase.slice(0, 90)}{f.frase.length > 90 ? "…" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Apresentação */}
      <div className="space-y-2 border-t pt-3">
        <Label className="text-xs font-semibold">Como apresentar a frase</Label>
        <RadioGroup value={apresentacao} onValueChange={(v) => handleConfigChange("apresentacao", v)}>
          <div className="flex items-center gap-2"><RadioGroupItem value="texto" id="ap_t" /><label htmlFor="ap_t" className="text-xs flex items-center gap-1"><MessageSquareText className="h-3 w-3" /> Enviar como texto</label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="midia" id="ap_m" /><label htmlFor="ap_m" className="text-xs flex items-center gap-1"><Sparkles className="h-3 w-3" /> Enviar frase + imagem/vídeo gerado por IA</label></div>
        </RadioGroup>
      </div>

      {apresentacao === "midia" && (
        <div className="space-y-4 rounded-md border border-dashed p-3 bg-muted/20">
          {/* 1. Tipo de mídia (cards) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">1. Tipo de mídia</Label>
            <RadioGroup
              value={mediaType}
              onValueChange={(v) => {
                handleConfigChange("mediaType", v);
                // limpa preset se não for do tipo escolhido
                if (config.preset) {
                  const cur = allSystemPresets.find((p) => p.id === config.preset);
                  if (!cur || cur.mediaType !== v) {
                    handleConfigChange("preset", "");
                    handleConfigChange("presetName", "");
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

          {/* 2. Estilo visual (mesmo padrão do Gerar Mídia IA) */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">2. Estilo visual</Label>
            <RadioGroup
              value={styleSource}
              onValueChange={(v) => {
                handleConfigChange("styleSource", v);
                if (v !== "preset") {
                  handleConfigChange("preset", "");
                  handleConfigChange("presetName", "");
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
              <label className={`flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer ${styleSource === "none" ? "border-primary bg-primary/10" : "border-border"}`}>
                <RadioGroupItem value="none" />
                <span className="text-xs font-medium">Nenhum estilo específico</span>
              </label>
            </RadioGroup>

            {styleSource === "preset" && (
              <>
                {presetsForType.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    Nenhum preset disponível para {mediaType === "video" ? "vídeo" : "imagem"}.
                  </p>
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
                            <img
                              src={p.image}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition"
                              loading="lazy"
                            />
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
          </div>

          {/* 3. Proporção e variações */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Proporção</Label>
              <Select value={config.aspectRatio || "1:1"} onValueChange={(v) => handleConfigChange("aspectRatio", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1:1" className="text-xs">1:1 (quadrado)</SelectItem>
                  <SelectItem value="9:16" className="text-xs">9:16 (story)</SelectItem>
                  <SelectItem value="16:9" className="text-xs">16:9 (feed horizontal)</SelectItem>
                  <SelectItem value="4:5" className="text-xs">4:5 (feed vertical)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Variações</Label>
              <Input
                type="number" min={1} max={6}
                className="h-8 text-xs"
                value={config.variations ?? 4}
                onChange={(e) => handleConfigChange("variations", Math.max(1, Math.min(6, parseInt(e.target.value) || 1)))}
              />
            </div>
          </div>

          {/* 4. Instruções extras */}
          <div className="space-y-1">
            <Label className="text-xs">Instruções extras para a IA (opcional)</Label>
            <Textarea
              className="text-xs min-h-[60px]"
              placeholder="Ex.: layout minimalista, cores da marca, produto em destaque..."
              value={config.basePrompt || ""}
              onChange={(e) => handleConfigChange("basePrompt", e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" /> A frase escolhida é usada como texto principal da peça.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2 border-t pt-3">
        <div className="flex items-start gap-2 rounded-md border p-2 bg-muted/20">
          <Checkbox
            id="ocultar_no_chat"
            checked={!!config.ocultarNoChat}
            onCheckedChange={(v) => handleConfigChange("ocultarNoChat", !!v)}
          />
          <label htmlFor="ocultar_no_chat" className="text-xs leading-tight">
            <b>Não exibir/enviar no chat</b> (silencioso) — apenas gera a frase/mídia e guarda em variáveis para o próximo bloco usar. Evita mensagem duplicada quando um Envio em massa/WhatsApp posterior for reenviar o conteúdo.
          </label>
        </div>
        <Label className="text-xs">Variável de saída</Label>
        <Input
          className="h-8 text-xs"
          value={config.outputVariable || "frase_pre_definida"}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
        />
        <p className="text-[10px] text-muted-foreground">Guarda a frase escolhida. Também salva {`{{`}last_generated_media_url{`}}`} quando gerar imagem.</p>
      </div>
    </div>
  );
};

export default MensagemPreDefinidaConfig;
