/**
 * Painel lateral para configurar os parâmetros de um bloco selecionado
 */

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AutomacaoVendasBlockType, OperadorComparacao } from "@/types/automacaoVendas";

interface BlockConfigPanelProps {
  blockId: string;
  blockType: AutomacaoVendasBlockType;
  config: any;
  onClose: () => void;
  onSave: (config: any) => void;
}

export function BlockConfigPanel({
  blockId,
  blockType,
  config,
  onClose,
  onSave,
}: BlockConfigPanelProps) {
  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newConfig: any = {};

    formData.forEach((value, key) => {
      newConfig[key] = value;
    });

    onSave(newConfig);
    onClose();
  };

  // Renderizar campos específicos para cada tipo de bloco
  const renderFields = () => {
    switch (blockType) {
      case "condicao_valor":
      case "condicao_quantidade":
      case "condicao_cliente_acumulado":
        return (
          <>
            <div>
              <Label htmlFor="operator">Operador</Label>
              <Select name="operator" defaultValue={config?.operator || ">"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=">">Maior que (&gt;)</SelectItem>
                  <SelectItem value=">=">Maior ou igual (&gt;=)</SelectItem>
                  <SelectItem value="=">Igual (=)</SelectItem>
                  <SelectItem value="<">Menor que (&lt;)</SelectItem>
                  <SelectItem value="<=">Menor ou igual (&lt;=)</SelectItem>
                  <SelectItem value="!=">Diferente (≠)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="value">Valor</Label>
              <Input
                id="value"
                name="value"
                type="number"
                defaultValue={config?.value || ""}
                placeholder="Digite o valor"
                required
              />
            </div>
          </>
        );

      case "condicao_mes":
        return (
          <>
            <div>
              <Label htmlFor="compareWith">Comparar com</Label>
              <Select name="compareWith" defaultValue={config?.compareWith || "aniversario"}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aniversario">Mês de aniversário do cliente</SelectItem>
                  <SelectItem value="atual">Mês atual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        );

      case "acao_desconto_percentual":
        return (
          <>
            <div>
              <Label htmlFor="percentage">Percentual (%)</Label>
              <Input
                id="percentage"
                name="percentage"
                type="number"
                min="0"
                max="100"
                step="0.01"
                defaultValue={config?.percentage || ""}
                placeholder="Ex: 10 para 10%"
                required
              />
            </div>
          </>
        );

      case "acao_desconto_fixo":
      case "acao_adicionar_frete":
        return (
          <>
            <div>
              <Label htmlFor="value">Valor (R$)</Label>
              <Input
                id="value"
                name="value"
                type="number"
                min="0"
                step="0.01"
                defaultValue={config?.value || ""}
                placeholder="Ex: 50.00"
                required
              />
            </div>
          </>
        );

      case "acao_enviar_alerta":
        return (
          <>
            <div>
              <Label htmlFor="message">Mensagem do alerta</Label>
              <Textarea
                id="message"
                name="message"
                defaultValue={config?.message || ""}
                placeholder="Digite a mensagem..."
                rows={4}
                required
              />
            </div>
          </>
        );

      case "logica_e":
      case "logica_ou":
      case "inicio":
      case "fim":
        return (
          <div className="text-sm text-muted-foreground">
            Este bloco não possui configurações.
          </div>
        );

      default:
        return null;
    }
  };

  const getBlockTitle = () => {
    const titles: Record<string, string> = {
      inicio: "Início da Regra",
      condicao_valor: "Condição: Valor Total",
      condicao_mes: "Condição: Mês Especial",
      condicao_quantidade: "Condição: Quantidade",
      condicao_cliente_acumulado: "Condição: Valor Acumulado",
      logica_e: "Lógica: E (AND)",
      logica_ou: "Lógica: OU (OR)",
      acao_desconto_percentual: "Ação: Desconto Percentual",
      acao_desconto_fixo: "Ação: Desconto Fixo",
      acao_adicionar_frete: "Ação: Adicionar Frete",
      acao_enviar_alerta: "Ação: Enviar Alerta",
      fim: "Fim da Regra",
    };
    return titles[blockType] || "Configurar Bloco";
  };

  return (
    <div className="w-80 border-l bg-background h-full overflow-y-auto">
      <div className="sticky top-0 bg-background border-b p-4 flex items-center justify-between">
        <h3 className="font-semibold">{getBlockTitle()}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSave} className="p-4 space-y-4">
        {renderFields()}

        {blockType !== "inicio" && blockType !== "fim" && blockType !== "logica_e" && blockType !== "logica_ou" && (
          <Button type="submit" className="w-full">
            Salvar Configuração
          </Button>
        )}
      </form>
    </div>
  );
}
