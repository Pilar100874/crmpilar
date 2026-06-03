import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Type, Info } from "lucide-react";

interface TextContentConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const TextContentConfig = ({ config, handleConfigChange }: TextContentConfigProps) => {
  return (
    <div className="space-y-4">
      <Alert className="border-violet-500/30 bg-violet-500/5">
        <Info className="h-4 w-4 text-violet-600" />
        <AlertDescription className="text-xs">
          Conecte este bloco <strong>antes</strong> de um bloco "Gerar Mídia IA".
          Os textos abaixo serão renderizados <strong>exatamente</strong> na imagem
          gerada — a IA não poderá alterar, traduzir, inventar ou substituir.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Type className="h-3.5 w-3.5 text-violet-600" />
          Título
        </Label>
        <Input
          value={config.title || ""}
          onChange={(e) => handleConfigChange("title", e.target.value)}
          placeholder="Ex: PROMOÇÃO IMPERDÍVEL"
        />
      </div>

      <div className="space-y-2">
        <Label>Subtítulo</Label>
        <Input
          value={config.subtitle || ""}
          onChange={(e) => handleConfigChange("subtitle", e.target.value)}
          placeholder="Ex: Até 50% OFF em toda a loja"
        />
      </div>

      <div className="space-y-2">
        <Label>Texto (opcional)</Label>
        <Textarea
          value={config.body || ""}
          onChange={(e) => handleConfigChange("body", e.target.value)}
          placeholder="Texto adicional (descrição, call-to-action...). Deixe em branco se não quiser."
          rows={3}
        />
      </div>

      <p className="text-[11px] text-muted-foreground">
        Dica: use poucas palavras e ortografia já revisada — modelos de imagem
        têm mais facilidade renderizando textos curtos e diretos.
      </p>
    </div>
  );
};
