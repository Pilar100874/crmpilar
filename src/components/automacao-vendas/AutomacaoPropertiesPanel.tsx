import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import type { AutomacaoVendasNode } from "@/types/automacaoVendas";

interface AutomacaoPropertiesPanelProps {
  node: AutomacaoVendasNode;
  onClose: () => void;
  onUpdate: (node: AutomacaoVendasNode) => void;
}

export const AutomacaoPropertiesPanel = ({
  node,
  onClose,
  onUpdate,
}: AutomacaoPropertiesPanelProps) => {
  const [config, setConfig] = useState(node.data.config);

  useEffect(() => {
    setConfig(node.data.config);
  }, [node]);

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate({
      ...node,
      data: {
        ...node.data,
        config: newConfig,
      },
    });
  };

  const renderConfigFields = () => {
    switch (node.data.type) {
      case "desconto_valor_compra":
        return (
          <div className="space-y-4">
            <div>
              <Label>Regras de Desconto</Label>
              <div className="space-y-2 mt-2">
                {(config.regras || []).map((regra: any, index: number) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label className="text-xs">Valor Mínimo (R$)</Label>
                      <Input
                        type="number"
                        value={regra.valorMinimo}
                        onChange={(e) => {
                          const newRegras = [...config.regras];
                          newRegras[index].valorMinimo = parseFloat(e.target.value);
                          handleConfigChange("regras", newRegras);
                        }}
                      />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs">Desconto (%)</Label>
                      <Input
                        type="number"
                        value={regra.percentual}
                        onChange={(e) => {
                          const newRegras = [...config.regras];
                          newRegras[index].percentual = parseFloat(e.target.value);
                          handleConfigChange("regras", newRegras);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "desconto_quantidade_compras":
        return (
          <div className="space-y-4">
            <div>
              <Label>Quantidade Mínima de Compras</Label>
              <Input
                type="number"
                value={config.quantidadeMinima || 3}
                onChange={(e) => handleConfigChange("quantidadeMinima", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Período (meses)</Label>
              <Input
                type="number"
                value={config.periodoMeses || 1}
                onChange={(e) => handleConfigChange("periodoMeses", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Percentual de Desconto (%)</Label>
              <Input
                type="number"
                value={config.percentual || 7}
                onChange={(e) => handleConfigChange("percentual", parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case "desconto_aniversario_cliente":
        return (
          <div className="space-y-4">
            <div>
              <Label>Tipo de Desconto</Label>
              <Select
                value={config.tipoDesconto || "mes"}
                onValueChange={(value) => handleConfigChange("tipoDesconto", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes">Mês do Aniversário</SelectItem>
                  <SelectItem value="dia">Dia do Aniversário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Percentual de Desconto (%)</Label>
              <Input
                type="number"
                value={config.percentual || 10}
                onChange={(e) => handleConfigChange("percentual", parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case "desconto_data_especial":
        return (
          <div className="space-y-4">
            <div>
              <Label>Tipo de Data Especial</Label>
              <Select
                value={config.tipo || "blackfriday"}
                onValueChange={(value) => handleConfigChange("tipo", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blackfriday">Black Friday</SelectItem>
                  <SelectItem value="natal">Natal</SelectItem>
                  <SelectItem value="diadocliente">Dia do Cliente</SelectItem>
                  <SelectItem value="feriado">Feriado Nacional</SelectItem>
                  <SelectItem value="personalizado">Data Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {config.tipo === "personalizado" && (
              <div>
                <Label>Data Personalizada</Label>
                <Input
                  type="date"
                  value={config.dataPersonalizada || ""}
                  onChange={(e) => handleConfigChange("dataPersonalizada", e.target.value)}
                />
              </div>
            )}
            <div>
              <Label>Percentual de Desconto (%)</Label>
              <Input
                type="number"
                value={config.percentual || 15}
                onChange={(e) => handleConfigChange("percentual", parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case "aplicar_desconto":
        return (
          <div className="space-y-4">
            <div>
              <Label>Tipo de Aplicação</Label>
              <Select
                value={config.tipoAplicacao || "automatico"}
                onValueChange={(value) => handleConfigChange("tipoAplicacao", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="automatico">Automático</SelectItem>
                  <SelectItem value="aprovacao">Com Aprovação</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-muted-foreground">
            Nenhuma configuração disponível para este bloco.
          </div>
        );
    }
  };

  return (
    <div className="w-96 border-l flex flex-col bg-background">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Propriedades</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div>
            <Label>Tipo de Bloco</Label>
            <div className="mt-1 text-sm text-muted-foreground">
              {node.data.type}
            </div>
          </div>

          <div>
            <Label>Rótulo</Label>
            <Input
              value={node.data.label}
              onChange={(e) =>
                onUpdate({
                  ...node,
                  data: { ...node.data, label: e.target.value },
                })
              }
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">Configurações</h4>
            {renderConfigFields()}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
