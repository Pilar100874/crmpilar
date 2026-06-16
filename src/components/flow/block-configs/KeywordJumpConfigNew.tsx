import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info, Plus, GripVertical, Trash2 } from "lucide-react";
import { ConfigSection, ConfigInput, ConfigInfo } from "./ConfigField";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const KeywordJumpConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const keywords = config.keywords || [];

  const addKeyword = () => {
    handleConfigChange("keywords", [
      ...keywords,
      { id: Date.now(), text: "" }
    ]);
  };

  const removeKeyword = (index: number) => {
    const newKeywords = keywords.filter((_: any, i: number) => i !== index);
    handleConfigChange("keywords", newKeywords);
  };

  const updateKeyword = (index: number, text: string) => {
    const newKeywords = [...keywords];
    newKeywords[index] = { ...newKeywords[index], text };
    handleConfigChange("keywords", newKeywords);
  };

  return (
    <div className="space-y-4">
      <ConfigSection title="Campo de Correspondência">
        <ConfigInput
          label="Campo para comparar com palavras-chave"
          value={config.field || ""}
          onChange={(v) => handleConfigChange("field", v)}
          placeholder="mensagem_usuario"
          prefix="@"
          info="O conteúdo deste campo será comparado com as palavras-chave definidas abaixo"
        />
      </ConfigSection>

      <ConfigSection title="Palavras-Chave">
        <div className="space-y-2">
          {keywords.map((keyword: any, index: number) => (
            <div key={keyword.id || index} className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/40">
              <Input
                value={keyword.text || ""}
                onChange={(e) => updateKeyword(index, e.target.value)}
                placeholder="Digite a palavra-chave"
                className="flex-1 bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
              />
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-pink-600/50 flex-shrink-0"
              >
                <GripVertical className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-white hover:bg-red-500/50 flex-shrink-0"
                onClick={() => removeKeyword(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {keywords.length === 0 && (
            <ConfigInfo variant="info">
              Nenhuma palavra-chave adicionada. Clique em "Adicionar Palavra-Chave" para começar.
            </ConfigInfo>
          )}

          <Button 
            variant="default" 
            size="lg" 
            onClick={addKeyword}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white h-auto py-3"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Palavra-Chave
          </Button>
        </div>
      </ConfigSection>

      <ConfigInfo variant="info">
        <p className="font-semibold mb-1">ℹ️ Como funciona:</p>
        <p>Quando o conteúdo do campo corresponder a uma palavra-chave, o fluxo seguirá pela conexão correspondente.</p>
      </ConfigInfo>
    </div>
  );
};
