import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfigSection, ConfigInput, ConfigInfo } from "./ConfigField";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const LeadScoringConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const ruleGroups = config.ruleGroups || [];

  const addRuleGroup = () => {
    handleConfigChange("ruleGroups", [
      ...ruleGroups,
      { id: Date.now(), field: "", conditions: [] }
    ]);
  };

  const removeRuleGroup = (index: number) => {
    const newGroups = ruleGroups.filter((_: any, i: number) => i !== index);
    handleConfigChange("ruleGroups", newGroups);
  };

  const updateRuleGroup = (index: number, field: string, value: any) => {
    const newGroups = [...ruleGroups];
    newGroups[index] = { ...newGroups[index], [field]: value };
    handleConfigChange("ruleGroups", newGroups);
  };

  return (
    <div className="space-y-4">
      <ConfigSection title="Pontuação Final">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">Salvar Pontuação Como</h4>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40">
              NUMBER
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground bg-blue-500/5 p-2 rounded border border-blue-500/20">
            Escolha o campo onde deseja salvar a pontuação final
          </p>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 font-bold">@</span>
              <Input
                value={config.scoreField || "score"}
                onChange={(e) => handleConfigChange("scoreField", e.target.value)}
                placeholder="score"
                className="pl-7 bg-foreground/90/80 border-muted-foreground/50 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium"
              />
            </div>
            <Button variant="default" size="sm" className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600">
              CRIAR
            </Button>
          </div>

          <p className="text-xs text-amber-400 flex items-center gap-1.5">
            <Info className="w-3 h-3" />
            O formato do campo deve ser NÚMERO
          </p>
        </div>
      </ConfigSection>

      <ConfigSection title="Grupos de Regras">
        <div className="space-y-3">
          {ruleGroups.map((group: any, index: number) => (
            <div key={group.id || index} className="p-3 border border-cyan-500/30 rounded-lg bg-foreground/50 space-y-3 relative">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-white">Grupo de Regras #{index + 1}</h4>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeRuleGroup(index)}
                  className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <p className="text-xs text-muted-foreground">
                Escolha um campo para criar regras de pontuação
              </p>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">IF @</span>
                <Input
                  value={group.field || ""}
                  onChange={(e) => updateRuleGroup(index, "field", e.target.value)}
                  placeholder="Digite ou selecione o campo"
                  className="pl-16 bg-foreground/90/80 border-muted-foreground/50 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium"
                />
              </div>
            </div>
          ))}

          {ruleGroups.length === 0 && (
            <ConfigInfo variant="info">
              Nenhum grupo de regras criado. Clique em "Adicionar Grupo" para começar.
            </ConfigInfo>
          )}

          <Button 
            variant="outline" 
            size="sm" 
            onClick={addRuleGroup}
            className="w-full border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/10"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Grupo
          </Button>
        </div>
      </ConfigSection>

      <ConfigInfo variant="info">
        <div className="space-y-2">
          <p className="font-semibold">📊 Como funciona o Lead Scoring?</p>
          <p className="text-xs">
            Lead scoring é um método popular usado por equipes de marketing para priorizar leads com base em ações ou atributos. Você define regras que adicionam ou subtraem pontos com base nas respostas do usuário.
          </p>
          <p className="font-semibold mt-2">⚠️ Por que há uma saída "Falha"?</p>
          <p className="text-xs">
            Em casos raros (por exemplo: condições mal formatadas), o cálculo da pontuação pode falhar. Embora seja improvável, recomendamos configurar um caminho de falha para evitar um beco sem saída.
          </p>
        </div>
      </ConfigInfo>
    </div>
  );
};
