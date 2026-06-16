import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info, Plus, X } from "lucide-react";
import { useState } from "react";
import { ConfigSection, ConfigInput, ConfigSelect, ConfigInfo } from "./ConfigField";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

export const ConditionsConfigNew = ({ config, handleConfigChange }: ConfigProps) => {
  const conditions = config.conditions || [];

  const addCondition = () => {
    handleConfigChange("conditions", [
      ...conditions,
      { field: "", operator: "EQUAL TO", value: "" }
    ]);
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    handleConfigChange("conditions", newConditions);
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_: any, i: number) => i !== index);
    handleConfigChange("conditions", newConditions);
  };

  return (
    <div className="space-y-4">
      <ConfigSection title="Definir Condições">
        {conditions.length === 0 && (
          <ConfigInfo variant="info">
            Clique em "Adicionar Condição" para começar a criar suas regras lógicas.
          </ConfigInfo>
        )}
        
        <div className="space-y-3">
          {conditions.map((condition: any, index: number) => (
            <div key={index} className="space-y-3 p-3 border border-cyan-500/30 rounded-lg bg-foreground/50 relative">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeCondition(index)}
                className="absolute top-2 right-2 h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/10"
              >
                <X className="h-3 w-3" />
              </Button>

              <div className="space-y-2">
                <Label className="text-white text-sm font-semibold flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-bold">IF</span>
                  Campo
                </Label>
                <Input
                  value={condition.field || ""}
                  onChange={(e) => updateCondition(index, "field", e.target.value)}
                  placeholder="@nome_do_campo"
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white text-sm font-semibold flex items-center gap-2">
                  <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
                  Operador
                </Label>
                <Select
                  value={condition.operator || "EQUAL TO"}
                  onValueChange={(v) => updateCondition(index, "operator", v)}
                >
                  <SelectTrigger className="bg-background border-border text-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-foreground/90 border-foreground/70 text-white">
                    <SelectItem value="EQUAL TO" className="focus:bg-foreground/80 focus:text-white">É IGUAL A</SelectItem>
                    <SelectItem value="NOT EQUAL TO" className="focus:bg-foreground/80 focus:text-white">NÃO É IGUAL A</SelectItem>
                    <SelectItem value="CONTAINS" className="focus:bg-foreground/80 focus:text-white">CONTÉM</SelectItem>
                    <SelectItem value="NOT CONTAINS" className="focus:bg-foreground/80 focus:text-white">NÃO CONTÉM</SelectItem>
                    <SelectItem value="GREATER THAN" className="focus:bg-foreground/80 focus:text-white">MAIOR QUE</SelectItem>
                    <SelectItem value="LESS THAN" className="focus:bg-foreground/80 focus:text-white">MENOR QUE</SelectItem>
                    <SelectItem value="IS SET" className="focus:bg-foreground/80 focus:text-white">ESTÁ DEFINIDO</SelectItem>
                    <SelectItem value="IS NOT SET" className="focus:bg-foreground/80 focus:text-white">NÃO ESTÁ DEFINIDO</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {condition.operator !== "IS SET" && condition.operator !== "IS NOT SET" && (
                <div className="space-y-2">
                  <Label className="text-white text-sm font-semibold flex items-center gap-2">
                    <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
                    Valor
                  </Label>
                  <Input
                    value={condition.value || ""}
                    onChange={(e) => updateCondition(index, "value", e.target.value)}
                    placeholder="Digite um valor ou @campo"
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium"
                  />
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/10"
                  >
                    Usar Campo
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button 
          onClick={addCondition}
          variant="outline"
          className="w-full border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/10"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Condição
        </Button>
      </ConfigSection>

      <ConfigInfo variant="info">
        <p className="font-semibold mb-1">ℹ️ Como funcionam as condições:</p>
        <p>• As condições permitem dividir o fluxo com base em regras</p>
        <p>• Exemplo: se o campo @email 'CONTÉM' o texto 'gmail'</p>
        <p>• Cada bloco tem duas saídas: verde (verdadeiro) e vermelha (falso)</p>
      </ConfigInfo>
    </div>
  );
};
