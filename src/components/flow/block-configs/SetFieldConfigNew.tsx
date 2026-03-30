import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VariableInput, VariableTextarea } from "@/components/flow/VariableInput";
import { ConfigSection, ConfigInput, ConfigTextarea, ConfigSelect } from "./ConfigField";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
  inputRefs?: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement | null }>;
  openVariablePicker?: (ref: HTMLInputElement | HTMLTextAreaElement) => void;
}

export const SetFieldConfigNew = ({ config, handleConfigChange, inputRefs, openVariablePicker }: ConfigProps) => {
  const mode = config.mode || "SET";

  return (
    <div className="space-y-4">
      <ConfigSection title="Modo de Operação">
        <div className="flex gap-2">
          <Button
            variant={mode === "SET" ? "default" : "outline"}
            className={mode === "SET" ? "flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600" : "flex-1"}
            onClick={() => handleConfigChange("mode", "SET")}
          >
            SET
          </Button>
          <Button
            variant={mode === "UNSET" ? "default" : "outline"}
            className={mode === "UNSET" ? "flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600" : "flex-1"}
            onClick={() => handleConfigChange("mode", "UNSET")}
          >
            UNSET
          </Button>
        </div>
      </ConfigSection>

      <ConfigSection>
        <div className="space-y-2">
          <Label className="text-white text-sm font-semibold flex items-center gap-2">
            <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
            Campo a Editar
            <Info className="h-4 w-4 text-cyan-400 cursor-help" />
          </Label>
          <VariableInput
            ref={(el) => inputRefs && (inputRefs.current['field'] = el)}
            value={config.field || ""}
            onChange={(e) => handleConfigChange("field", e.target.value)}
            onVariableRequest={() => openVariablePicker?.(inputRefs?.current['field']!)}
            placeholder="nome_do_campo"
            className="bg-foreground/90/80 border-slate-700/50 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner font-medium"
          />
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 bg-blue-500/5 p-2 rounded border border-blue-500/20">
            <Info className="w-3 h-3 flex-shrink-0 mt-0.5 text-blue-400" />
            Digite o nome do campo que deseja modificar
          </p>
        </div>

        {mode === "SET" && (
          <div className="space-y-2 pt-2">
            <Label className="text-white text-sm font-semibold flex items-center gap-2">
              <span className="w-1 h-4 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
              Valor
            </Label>
            <VariableTextarea
              ref={(el) => inputRefs && (inputRefs.current['value'] = el)}
              value={config.value || ""}
              onChange={(e) => handleConfigChange("value", e.target.value)}
              onVariableRequest={() => openVariablePicker?.(inputRefs?.current['value']!)}
              placeholder="Digite o valor ou use variáveis"
              rows={3}
              className="bg-foreground/90/80 border-slate-700/50 text-white placeholder:text-muted-foreground focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 shadow-inner resize-none"
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => openVariablePicker?.(inputRefs?.current['value']!)}
              className="w-full border-cyan-500/40 hover:border-cyan-500 hover:bg-cyan-500/10"
            >
              Usar Campo
            </Button>
          </div>
        )}
      </ConfigSection>
    </div>
  );
};
