import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";
import { ConfigSection, ConfigInfo } from "./ConfigField";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const GlobalKeywordsConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const keywords = config.keywords || [];

  const addKeyword = () => {
    handleConfigChange("keywords", [
      ...keywords,
      { id: Date.now(), text: "" }
    ]);
  };

  return (
    <div className="space-y-4">
      <ConfigSection title="Palavras-Chave Globais">
        <div className="space-y-3">
          <Label className="text-white text-sm font-semibold flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
            Adicionar palavras-chave globais
          </Label>
          
          <Button 
            variant="default" 
            size="lg" 
            onClick={addKeyword}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-auto py-4 shadow-md"
          >
            <Plus className="w-5 h-5 mr-2" />
            Adicionar Botão
          </Button>
        </div>
      </ConfigSection>

      <ConfigInfo variant="warning">
        <div className="space-y-2">
          <p className="font-semibold">⚠️ Importante ao criar palavras-chave:</p>
          <ul className="space-y-1 text-xs">
            <li>• Não podem conter espaços</li>
            <li>• Podem conter caracteres especiais</li>
            <li>• São sensíveis a maiúsculas/minúsculas (case sensitive)</li>
          </ul>
        </div>
      </ConfigInfo>

      <ConfigInfo variant="info">
        <p className="font-semibold mb-1">ℹ️ O que são palavras-chave globais?</p>
        <p className="text-xs">Palavras-chave globais funcionam em qualquer momento da conversa, permitindo que o usuário acesse funcionalidades específicas digitando comandos como "menu", "ajuda", "cancelar", etc.</p>
      </ConfigInfo>
    </div>
  );
};
