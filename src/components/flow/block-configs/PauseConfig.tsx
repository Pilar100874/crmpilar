import { FlowNodeData } from "@/types/flow";
import { ConfigSection, ConfigSwitch, ConfigInfo } from "./ConfigField";
import { Pause, Play } from "lucide-react";

interface PauseConfigProps {
  data: FlowNodeData;
  onChange: (data: FlowNodeData) => void;
}

export const PauseConfig = ({ data, onChange }: PauseConfigProps) => {
  const config = data.config || {};

  const handleChange = (field: string, value: any) => {
    onChange({
      ...data,
      config: {
        ...config,
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      <ConfigSection 
        title="Configuração de Pausa" 
        icon={<Pause className="w-4 h-4" />}
      >
        <ConfigSwitch
          label="Ativar breakpoint"
          checked={config.enabled !== false}
          onChange={(checked) => handleChange("enabled", checked)}
          info="Quando ativado, a simulação pausará neste bloco. Use os controles Play/Pause do simulador para continuar."
        />
      </ConfigSection>

      <ConfigInfo variant="info">
        <div className="flex items-start gap-2">
          <Pause className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="text-xs space-y-1">
            <p className="font-semibold">Como usar:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Arraste este bloco para o fluxo onde deseja pausar</li>
              <li>Na simulação, o fluxo pausará automaticamente neste ponto</li>
              <li>Use o botão <Play className="w-3 h-3 inline" /> no simulador para continuar</li>
            </ol>
          </div>
        </div>
      </ConfigInfo>
    </div>
  );
};