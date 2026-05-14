import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Package } from "lucide-react";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const ProductSearchSelectConfig = ({ config, handleConfigChange }: ConfigProps) => {
  return (
    <div className="space-y-4">
      <Alert>
        <Package className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Pergunta o nome do produto, busca no catálogo e envia as <strong>{config.limit || 5}</strong> primeiras opções (imagem + nome).
          O usuário escolhe pelo número e a imagem do produto fica salva em <code>{`{{${config.imageUrlVariable || "produto_imagem_url"}}}`}</code>
          {" "}para usar no bloco <strong>Gerar Mídia IA</strong> como referência.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Pergunta exibida ao usuário</Label>
        <Textarea
          value={config.askText || ""}
          onChange={(e) => handleConfigChange("askText", e.target.value)}
          placeholder="Qual produto você está procurando?"
          rows={2}
        />
        <p className="text-[11px] text-muted-foreground">
          Deixe em branco se preferir usar uma variável já preenchida (campo abaixo).
        </p>
      </div>

      <div className="space-y-2">
        <Label>Variável já existente (opcional)</Label>
        <Input
          value={config.sourceVariable || ""}
          onChange={(e) => handleConfigChange("sourceVariable", e.target.value)}
          placeholder="Ex: nome_produto_busca"
        />
        <p className="text-[11px] text-muted-foreground">
          Se informado, o bloco usa essa variável como termo de busca e <strong>não</strong> faz a pergunta.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Quantidade de resultados</Label>
        <Input
          type="number"
          min={1}
          max={10}
          value={config.limit ?? 5}
          onChange={(e) => handleConfigChange("limit", parseInt(e.target.value) || 5)}
        />
      </div>

      <div className="space-y-2">
        <Label>Mensagem para escolher</Label>
        <Input
          value={config.selectionPrompt || ""}
          onChange={(e) => handleConfigChange("selectionPrompt", e.target.value)}
          placeholder="Responda com o número do produto desejado:"
        />
      </div>

      <div className="space-y-2">
        <Label>Mensagem quando não encontrar</Label>
        <Input
          value={config.notFoundMessage || ""}
          onChange={(e) => handleConfigChange("notFoundMessage", e.target.value)}
          placeholder="Nenhum produto encontrado com esse nome."
        />
      </div>

      <div className="space-y-2">
        <Label>Variável de saída (produto completo)</Label>
        <Input
          value={config.outputVariable || ""}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
          placeholder="produto_selecionado"
        />
        <p className="text-[11px] text-muted-foreground">
          Salva objeto: <code>{`{ id, nome, codigo, foto_url }`}</code>.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Variável da imagem (referência IA)</Label>
        <Input
          value={config.imageUrlVariable || ""}
          onChange={(e) => handleConfigChange("imageUrlVariable", e.target.value)}
          placeholder="produto_imagem_url"
        />
        <p className="text-[11px] text-muted-foreground">
          Use <code>{`{{${config.imageUrlVariable || "produto_imagem_url"}}}`}</code> no bloco "Gerar Mídia IA".
        </p>
      </div>
    </div>
  );
};
