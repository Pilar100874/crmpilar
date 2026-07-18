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
import { MessageSquareText, Sparkles, Image as ImageIcon, Video, Info } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

interface Props {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

const PRESETS = [
  { value: "", label: "Nenhum" },
  { value: "produto_branco", label: "Produto fundo branco" },
  { value: "produto_lifestyle", label: "Produto lifestyle" },
  { value: "influencer_ugc", label: "Influencer UGC" },
  { value: "post_promocional", label: "Post promocional" },
  { value: "story_vertical", label: "Story vertical 9:16" },
  { value: "cinematic", label: "Cinematográfico" },
];

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
          <div className="flex items-center gap-2"><RadioGroupItem value="midia" id="ap_m" /><label htmlFor="ap_m" className="text-xs flex items-center gap-1"><Sparkles className="h-3 w-3" /> Gerar imagem/vídeo com a frase</label></div>
        </RadioGroup>
      </div>

      {apresentacao === "midia" && (
        <div className="space-y-3 rounded-md border border-dashed p-3 bg-muted/20">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Tipo de mídia</Label>
              <Select value={config.mediaType || "image"} onValueChange={(v) => handleConfigChange("mediaType", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="image" className="text-xs"><ImageIcon className="h-3 w-3 inline mr-1" /> Imagem</SelectItem>
                  <SelectItem value="video" className="text-xs"><Video className="h-3 w-3 inline mr-1" /> Vídeo</SelectItem>
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

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Estilo</Label>
              <Select value={config.styleSource || "visual_identity"} onValueChange={(v) => handleConfigChange("styleSource", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="visual_identity" className="text-xs">Identidade Visual</SelectItem>
                  <SelectItem value="preset" className="text-xs">Preset pronto</SelectItem>
                  <SelectItem value="none" className="text-xs">Nenhum</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>

          {config.styleSource === "preset" && (
            <div className="space-y-1">
              <Label className="text-xs">Preset</Label>
              <Select value={config.preset || ""} onValueChange={(v) => handleConfigChange("preset", v)}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

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

      <div className="space-y-1 border-t pt-3">
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
