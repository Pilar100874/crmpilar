import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package, Info, Image } from "lucide-react";

interface Props {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const AskProductImageConfig = ({ config, handleConfigChange }: Props) => {
  return (
    <div className="space-y-4">
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-xs">
          Pergunta se a peça terá imagem do produto. Se sim, oferece 3 opções:
          <br />• <strong>Código do produto</strong> (busca no catálogo)
          <br />• <strong>Tirar/enviar foto</strong>
          <br />• <strong>Descrever em texto</strong>
          <br />Em seguida o usuário <strong>confirma</strong> ou <strong>refaz</strong>.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-amber-600" />
          Pergunta inicial
        </Label>
        <Input
          value={config.askQuestion || ""}
          onChange={(e) => handleConfigChange("askQuestion", e.target.value)}
          placeholder="A peça terá imagem do produto?"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Pergunta — código do produto</Label>
        <Input
          value={config.codePrompt || ""}
          onChange={(e) => handleConfigChange("codePrompt", e.target.value)}
          placeholder="Digite o código (ou nome) do produto:"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Pergunta — foto do produto</Label>
        <Input
          value={config.photoPrompt || ""}
          onChange={(e) => handleConfigChange("photoPrompt", e.target.value)}
          placeholder="Envie a foto do produto (URL ou arquivo)."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Pergunta — descrição em texto</Label>
        <Input
          value={config.textPrompt || ""}
          onChange={(e) => handleConfigChange("textPrompt", e.target.value)}
          placeholder="Descreva o produto em texto:"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="text-xs">Variável URL da imagem</Label>
          <Input
            value={config.outputImageVariable || ""}
            onChange={(e) => handleConfigChange("outputImageVariable", e.target.value)}
            placeholder="produto_imagem_url"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Variável descrição</Label>
          <Input
            value={config.outputDescVariable || ""}
            onChange={(e) => handleConfigChange("outputDescVariable", e.target.value)}
            placeholder="produto_descricao"
          />
        </div>
      </div>
    </div>
  );
};
