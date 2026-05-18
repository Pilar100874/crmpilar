import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Image as ImageIcon, Video } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

const PRESETS = [
  { id: "produto_branco", label: "Produto fundo branco" },
  { id: "produto_lifestyle", label: "Produto lifestyle" },
  { id: "influencer_ugc", label: "Influencer / UGC" },
  { id: "post_promocional", label: "Post promocional" },
  { id: "story_vertical", label: "Story vertical 9:16" },
  { id: "cinematic", label: "Cinematic / Reels" },
];

export const GenerateAIMediaConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const mediaType = config.mediaType || "image";
  const styleSource = config.styleSource || "visual_identity";
  const acceptText = config.acceptText ?? true;
  const acceptImageRef = config.acceptImageRef ?? false;

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
          onValueChange={(v) => handleConfigChange("mediaType", v)}
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
            onChange={(e) => handleConfigChange("preset", e.target.value)}
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Selecione um preset...</option>
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        )}
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
