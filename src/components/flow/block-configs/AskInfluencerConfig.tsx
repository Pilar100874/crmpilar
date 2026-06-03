import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UserSquare2, Info } from "lucide-react";

interface Props {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const AskInfluencerConfig = ({ config, handleConfigChange }: Props) => {
  return (
    <div className="space-y-4">
      <Alert className="border-purple-500/30 bg-purple-500/5">
        <Info className="h-4 w-4 text-purple-600" />
        <AlertDescription className="text-xs">
          Pergunta ao usuário se a peça terá um <strong>influencer</strong>. Em caso afirmativo,
          apresenta a <strong>Galeria de Influencers</strong> cadastrados para seleção direta.
          A imagem vai para o bloco <strong>Gerar Mídia IA</strong> como referência (papel INFLUENCER).
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <UserSquare2 className="h-3.5 w-3.5 text-purple-600" />
          Pergunta inicial
        </Label>
        <Input
          value={config.askQuestion || ""}
          onChange={(e) => handleConfigChange("askQuestion", e.target.value)}
          placeholder="A peça terá um influencer?"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Variável de saída (URL da foto)</Label>
        <Input
          value={config.outputVariable || ""}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
          placeholder="influencer_image_url"
        />
      </div>
    </div>
  );
};
