import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Trash2 } from "lucide-react";
import type { AutomacaoVendasBlockType } from "@/types/automacaoVendas";

interface BlockData {
  id: string;
  type: AutomacaoVendasBlockType;
  label: string;
  config: any;
  note?: string;
}

interface AutomacaoPropertiesPanelProps {
  block: BlockData;
  onClose: () => void;
  onUpdate: (block: BlockData) => void;
}

export const AutomacaoPropertiesPanel = ({
  block,
  onClose,
  onUpdate,
}: AutomacaoPropertiesPanelProps) => {
  const [config, setConfig] = useState(block.config || {});

  useEffect(() => {
    setConfig(block.config || {});
  }, [block]);

  const handleConfigChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    onUpdate({
      ...block,
      config: newConfig,
    });
  };

  const renderConfigFields = () => {
    switch (block.type) {
      case "desconto_valor_compra":
        return (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Regras de Desconto</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const newRegras = [
                      ...(config.regras || []),
                      { valorMinimo: 1000, percentual: 5 },
                    ];
                    handleConfigChange("regras", newRegras);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
              </div>
              <div className="space-y-3">
                {(config.regras || []).map((regra: any, index: number) => (
                  <div key={index} className="p-3 border rounded-lg space-y-2">
                    <div className="flex gap-2">
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
                      <Button
                        size="sm"
                        variant="ghost"
                        className="mt-5"
                        onClick={() => {
                          const newRegras = config.regras.filter((_: any, i: number) => i !== index);
                          handleConfigChange("regras", newRegras);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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

      case "desconto_produtos_grupo":
        return (
          <div className="space-y-4">
            <div>
              <Label>Grupo de Produtos</Label>
              <Input
                value={config.grupo || ""}
                onChange={(e) => handleConfigChange("grupo", e.target.value)}
                placeholder="Nome do grupo"
              />
            </div>
            <div>
              <Label>Valor Mínimo Total (R$)</Label>
              <Input
                type="number"
                value={config.valorMinimo || 500}
                onChange={(e) => handleConfigChange("valorMinimo", parseFloat(e.target.value))}
              />
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

      case "desconto_pagamento_antecipado":
        return (
          <div className="space-y-4">
            <div>
              <Label>Dias de Antecipação Mínimos</Label>
              <Input
                type="number"
                value={config.diasAntecipacao || 7}
                onChange={(e) => handleConfigChange("diasAntecipacao", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Percentual de Desconto (%)</Label>
              <Input
                type="number"
                value={config.percentual || 5}
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

      case "desconto_aniversario_empresa":
        return (
          <div className="space-y-4">
            <div>
              <Label>Mês do Aniversário da Empresa</Label>
              <Select
                value={config.mes || "1"}
                onValueChange={(value) => handleConfigChange("mes", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Janeiro</SelectItem>
                  <SelectItem value="2">Fevereiro</SelectItem>
                  <SelectItem value="3">Março</SelectItem>
                  <SelectItem value="4">Abril</SelectItem>
                  <SelectItem value="5">Maio</SelectItem>
                  <SelectItem value="6">Junho</SelectItem>
                  <SelectItem value="7">Julho</SelectItem>
                  <SelectItem value="8">Agosto</SelectItem>
                  <SelectItem value="9">Setembro</SelectItem>
                  <SelectItem value="10">Outubro</SelectItem>
                  <SelectItem value="11">Novembro</SelectItem>
                  <SelectItem value="12">Dezembro</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                  <SelectItem value="ano_novo">Ano Novo</SelectItem>
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

      case "desconto_historico_crescimento":
        return (
          <div className="space-y-4">
            <div>
              <Label>Percentual de Crescimento Mínimo (%)</Label>
              <Input
                type="number"
                value={config.crescimentoMinimo || 30}
                onChange={(e) => handleConfigChange("crescimentoMinimo", parseFloat(e.target.value))}
              />
            </div>
            <div>
              <Label>Percentual de Bônus (%)</Label>
              <Input
                type="number"
                value={config.percentual || 8}
                onChange={(e) => handleConfigChange("percentual", parseFloat(e.target.value))}
              />
            </div>
          </div>
        );

      case "desconto_tempo_desde_ultimo":
        return (
          <div className="space-y-4">
            <div>
              <Label>Dias desde Último Orçamento</Label>
              <Input
                type="number"
                value={config.diasDesdeUltimo || 7}
                onChange={(e) => handleConfigChange("diasDesdeUltimo", parseInt(e.target.value))}
              />
            </div>
            <div>
              <Label>Percentual de Desconto (%)</Label>
              <Input
                type="number"
                value={config.percentual || 5}
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
                  <SelectItem value="sugestao">Apenas Sugestão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor Máximo de Desconto (R$)</Label>
              <Input
                type="number"
                value={config.valorMaximo || 10000}
                onChange={(e) => handleConfigChange("valorMaximo", parseFloat(e.target.value))}
              />
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
        <h3 className="font-semibold">Propriedades do Bloco</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div>
            <Label className="text-xs text-muted-foreground">Tipo de Bloco</Label>
            <div className="mt-1 font-medium">
              {block.type.replace(/_/g, " ")}
            </div>
          </div>

          <div>
            <Label>Rótulo do Bloco</Label>
            <Input
              value={block.label}
              onChange={(e) =>
                onUpdate({
                  ...block,
                  label: e.target.value,
                })
              }
              placeholder="Nome do bloco"
            />
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-4">Configurações Específicas</h4>
            {renderConfigFields()}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
