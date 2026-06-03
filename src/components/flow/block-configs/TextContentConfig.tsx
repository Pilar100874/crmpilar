import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Type, Info, Sparkles, MessageCircleQuestion, Lock, ListChecks, Plus, Trash2, Hash } from "lucide-react";

interface TextContentConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

type FieldKey = "title" | "subtitle" | "body";
type FieldMode = "fixed" | "ask" | "ai";

const FIELD_LABELS: Record<FieldKey, { label: string; placeholder: string; askDefault: string }> = {
  title: {
    label: "Título",
    placeholder: "Ex: PROMOÇÃO IMPERDÍVEL",
    askDefault: "Qual o título que devo colocar na imagem?",
  },
  subtitle: {
    label: "Subtítulo",
    placeholder: "Ex: Até 50% OFF em toda a loja",
    askDefault: "Qual o subtítulo que devo colocar na imagem?",
  },
  body: {
    label: "Texto (opcional)",
    placeholder: "Texto adicional (descrição, call-to-action...).",
    askDefault: "Quer adicionar um texto extra na imagem? (digite ou responda 'não')",
  },
};

const uid = () => Math.random().toString(36).slice(2, 9);

const FieldBlock = ({
  fieldKey,
  config,
  handleConfigChange,
  isTextarea,
  allowDisable,
}: {
  fieldKey: FieldKey;
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  isTextarea?: boolean;
  allowDisable?: boolean;
}) => {
  const meta = FIELD_LABELS[fieldKey];
  const rawMode = config[`${fieldKey}Mode`];
  const mode: FieldMode = rawMode === "ai" ? "ai" : rawMode === "ask" ? "ask" : "fixed";
  const enabled = config[`${fieldKey}Enabled`] !== false;

  return (
    <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/20">
      <div className="flex items-center justify-between gap-2">
        <Label className="flex items-center gap-2 m-0">
          <Type className="h-3.5 w-3.5 text-violet-600" />
          {meta.label}
        </Label>
        {allowDisable && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Usar este campo</span>
            <Switch
              checked={enabled}
              onCheckedChange={(v) => handleConfigChange(`${fieldKey}Enabled`, v)}
            />
          </div>
        )}
      </div>

      {(!allowDisable || enabled) && (
        <>
          <div className="space-y-1 pt-1">
            <Label className="text-[11px] text-muted-foreground">Origem do texto</Label>
            <Select
              value={mode}
              onValueChange={(v) => handleConfigChange(`${fieldKey}Mode`, v)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">
                  <span className="flex items-center gap-2 text-xs">
                    <Lock className="h-3 w-3" /> Dado fixo (definido agora)
                  </span>
                </SelectItem>
                <SelectItem value="ask">
                  <span className="flex items-center gap-2 text-xs">
                    <MessageCircleQuestion className="h-3 w-3" /> Pedir ao usuário
                  </span>
                </SelectItem>
                <SelectItem value="ai">
                  <span className="flex items-center gap-2 text-xs">
                    <Sparkles className="h-3 w-3" /> Gerar por IA automaticamente
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "fixed" && (
            isTextarea ? (
              <Textarea
                value={config[fieldKey] || ""}
                onChange={(e) => handleConfigChange(fieldKey, e.target.value)}
                placeholder={meta.placeholder}
                rows={3}
              />
            ) : (
              <Input
                value={config[fieldKey] || ""}
                onChange={(e) => handleConfigChange(fieldKey, e.target.value)}
                placeholder={meta.placeholder}
              />
            )
          )}

          {mode === "ask" && (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Pergunta enviada ao usuário</Label>
              <Input
                value={config[`${fieldKey}AskPrompt`] || ""}
                onChange={(e) => handleConfigChange(`${fieldKey}AskPrompt`, e.target.value)}
                placeholder={meta.askDefault}
              />
            </div>
          )}

          {mode === "ai" && (
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">
                Briefing/contexto para a IA (opcional)
              </Label>
              <Input
                value={config[`${fieldKey}AIHint`] || ""}
                onChange={(e) => handleConfigChange(`${fieldKey}AIHint`, e.target.value)}
                placeholder="Ex: tom de urgência, foco em desconto..."
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

const OptionsEditor = ({
  config,
  handleConfigChange,
}: {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}) => {
  const options: any[] = Array.isArray(config.options) ? config.options : [];

  const updateOption = (idx: number, patch: any) => {
    const next = options.map((o, i) => (i === idx ? { ...o, ...patch } : o));
    handleConfigChange("options", next);
  };
  const addOption = () => {
    handleConfigChange("options", [
      ...options,
      { id: uid(), label: `Opção ${options.length + 1}`, title: "", subtitle: "", body: "" },
    ]);
  };
  const removeOption = (idx: number) => {
    handleConfigChange("options", options.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-[11px] text-muted-foreground">Pergunta exibida ao usuário</Label>
        <Input
          value={config.optionsPrompt || ""}
          onChange={(e) => handleConfigChange("optionsPrompt", e.target.value)}
          placeholder="Escolha um dos textos abaixo:"
        />
      </div>

      {options.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Nenhuma opção criada. Clique em "Adicionar opção" para começar.
        </p>
      )}

      {options.map((opt, idx) => (
        <div key={opt.id || idx} className="p-3 rounded-lg border border-border bg-muted/20 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5 text-violet-600" />
              Opção {idx + 1}
            </Label>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-destructive hover:text-destructive"
              onClick={() => removeOption(idx)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Rótulo do botão</Label>
            <Input
              value={opt.label || ""}
              onChange={(e) => updateOption(idx, { label: e.target.value })}
              placeholder={`Opção ${idx + 1}`}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Título</Label>
            <Input
              value={opt.title || ""}
              onChange={(e) => updateOption(idx, { title: e.target.value })}
              placeholder="Ex: PROMOÇÃO IMPERDÍVEL"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Subtítulo</Label>
            <Input
              value={opt.subtitle || ""}
              onChange={(e) => updateOption(idx, { subtitle: e.target.value })}
              placeholder="Ex: Até 50% OFF"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Texto (opcional)</Label>
            <Textarea
              value={opt.body || ""}
              onChange={(e) => updateOption(idx, { body: e.target.value })}
              placeholder="Texto adicional / CTA"
              rows={2}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="w-full"
        onClick={addOption}
      >
        <Plus className="h-3.5 w-3.5 mr-2" /> Adicionar opção
      </Button>
    </div>
  );
};

export const TextContentConfig = ({ config, handleConfigChange }: TextContentConfigProps) => {
  const blockMode: "advanced" | "fixed" | "options" =
    config.blockMode === "fixed" || config.blockMode === "options" ? config.blockMode : "advanced";

  return (
    <div className="space-y-4">
      <Alert className="border-violet-500/30 bg-violet-500/5">
        <Info className="h-4 w-4 text-violet-600" />
        <AlertDescription className="text-xs">
          Conecte este bloco <strong>antes</strong> de um bloco "Gerar Mídia IA". Escolha como
          os textos serão definidos no modo do bloco abaixo.
        </AlertDescription>
      </Alert>

      <div className="space-y-1">
        <Label className="text-xs">Modo do bloco</Label>
        <Select
          value={blockMode}
          onValueChange={(v) => handleConfigChange("blockMode", v)}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">
              <span className="flex items-center gap-2 text-xs">
                <Lock className="h-3.5 w-3.5" /> Texto fixo no bloco (sem perguntar)
              </span>
            </SelectItem>
            <SelectItem value="options">
              <span className="flex items-center gap-2 text-xs">
                <ListChecks className="h-3.5 w-3.5" /> Perguntar e escolher uma das opções
              </span>
            </SelectItem>
            <SelectItem value="advanced">
              <span className="flex items-center gap-2 text-xs">
                <Sparkles className="h-3.5 w-3.5" /> Avançado (digitar ou IA por campo)
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {blockMode === "fixed" && (
        <>
          <p className="text-[11px] text-muted-foreground">
            Os textos abaixo serão aplicados diretamente, sem perguntar nada ao usuário.
          </p>
          <FieldBlock fieldKey="title" config={{ ...config, titleMode: "fixed" }} handleConfigChange={handleConfigChange} />
          <FieldBlock fieldKey="subtitle" config={{ ...config, subtitleMode: "fixed" }} handleConfigChange={handleConfigChange} />
          <FieldBlock
            fieldKey="body"
            config={{ ...config, bodyMode: "fixed" }}
            handleConfigChange={handleConfigChange}
            isTextarea
            allowDisable
          />
        </>
      )}

      {blockMode === "options" && (
        <OptionsEditor config={config} handleConfigChange={handleConfigChange} />
      )}

      {blockMode === "advanced" && (
        <>
          <FieldBlock fieldKey="title" config={config} handleConfigChange={handleConfigChange} />
          <FieldBlock fieldKey="subtitle" config={config} handleConfigChange={handleConfigChange} />
          <FieldBlock
            fieldKey="body"
            config={config}
            handleConfigChange={handleConfigChange}
            isTextarea
            allowDisable
          />
        </>
      )}

      <p className="text-[11px] text-muted-foreground">
        Dica: para textos fixos, use poucas palavras — modelos de imagem renderizam melhor frases
        curtas e diretas.
      </p>
    </div>
  );
};
