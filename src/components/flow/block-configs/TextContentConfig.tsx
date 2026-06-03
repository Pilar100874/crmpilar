import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Type, Info, Sparkles, MessageCircleQuestion, Lock } from "lucide-react";

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
              <p className="text-[10px] text-muted-foreground">
                A resposta do usuário será usada exatamente como digitada na imagem gerada.
              </p>
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
              <p className="text-[10px] text-muted-foreground">
                A IA criará este texto automaticamente usando o tipo de conteúdo, produto e
                contexto do fluxo.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const TextContentConfig = ({ config, handleConfigChange }: TextContentConfigProps) => {
  return (
    <div className="space-y-4">
      <Alert className="border-violet-500/30 bg-violet-500/5">
        <Info className="h-4 w-4 text-violet-600" />
        <AlertDescription className="text-xs">
          Conecte este bloco <strong>antes</strong> de um bloco "Gerar Mídia IA".
          Cada campo pode ser <strong>fixo</strong>, <strong>pedido ao usuário</strong> ou
          <strong> gerado pela IA</strong> automaticamente. Quando o usuário digitar, ele
          confirma os textos antes de seguir.
        </AlertDescription>
      </Alert>

      <FieldBlock fieldKey="title" config={config} handleConfigChange={handleConfigChange} />
      <FieldBlock fieldKey="subtitle" config={config} handleConfigChange={handleConfigChange} />
      <FieldBlock
        fieldKey="body"
        config={config}
        handleConfigChange={handleConfigChange}
        isTextarea
        allowDisable
      />

      <p className="text-[11px] text-muted-foreground">
        Dica: para textos fixos ou digitados pelo usuário, use poucas palavras — modelos de
        imagem renderizam melhor frases curtas e diretas.
      </p>
    </div>
  );
};
