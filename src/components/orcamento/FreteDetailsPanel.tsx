import { FreteResult, FORMULAS_FRETE } from "@/hooks/useFreteCalculation";
import { Badge } from "@/components/ui/badge";
import { Calculator, ChevronRight, Truck } from "lucide-react";
import { useState } from "react";

interface FreteDetailsPanelProps {
  freteResult: FreteResult | null;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

export default function FreteDetailsPanel({ freteResult }: FreteDetailsPanelProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  if (!freteResult) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Truck className="w-12 h-12 mb-3 opacity-20" />
        <p className="text-xs text-center">Calcule a rota primeiro</p>
        <p className="text-xs text-center mt-1">para ver os custos de frete</p>
      </div>
    );
  }

  const custoItems = [
    { 
      key: 'combustivel', 
      nome: 'Combustível', 
      valor: freteResult.custoCombustivel,
      formula: FORMULAS_FRETE.combustivel.formula,
      descricao: FORMULAS_FRETE.combustivel.descricao
    },
    { 
      key: 'fixos', 
      nome: 'Custos Fixos', 
      valor: freteResult.custoFixosViagem,
      formula: FORMULAS_FRETE.custosFixos.formula,
      descricao: FORMULAS_FRETE.custosFixos.descricao
    },
    { 
      key: 'horasNormais', 
      nome: 'Horas Normais', 
      valor: freteResult.custoHorasNormais,
      formula: FORMULAS_FRETE.horasNormais.formula,
      descricao: FORMULAS_FRETE.horasNormais.descricao
    },
    { 
      key: 'horasExtras', 
      nome: 'Horas Extras', 
      valor: freteResult.custoHorasExtras,
      formula: FORMULAS_FRETE.horasExtras.formula,
      descricao: FORMULAS_FRETE.horasExtras.descricao
    },
    { 
      key: 'ajudantes', 
      nome: 'Ajudantes', 
      valor: freteResult.custoAjudantes,
      formula: FORMULAS_FRETE.ajudantes.formula,
      descricao: FORMULAS_FRETE.ajudantes.descricao
    },
    { 
      key: 'pernoite', 
      nome: 'Pernoite', 
      valor: freteResult.custoPernoite,
      formula: FORMULAS_FRETE.pernoite.formula,
      descricao: FORMULAS_FRETE.pernoite.descricao
    },
    { 
      key: 'refeicao', 
      nome: 'Refeição', 
      valor: freteResult.custoRefeicao,
      formula: FORMULAS_FRETE.refeicao.formula,
      descricao: FORMULAS_FRETE.refeicao.descricao
    },
    { 
      key: 'pedagio', 
      nome: 'Pedágio', 
      valor: freteResult.custoPedagio,
      formula: FORMULAS_FRETE.pedagio.formula,
      descricao: FORMULAS_FRETE.pedagio.descricao
    },
  ];

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="bg-primary/10 rounded p-2.5 border border-primary/20">
        <h4 className="text-xs font-medium text-primary mb-1 flex items-center gap-2">
          <Calculator className="w-3.5 h-3.5" />
          Custo de Frete
        </h4>
        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-primary">
            {formatCurrency(freteResult.custoTotal)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {freteResult.kmTotal.toFixed(1)} km
          </span>
        </div>
      </div>

      {/* Detalhes Calculados */}
      <div className="bg-muted/50 rounded p-2.5 border border-border/50">
        <h4 className="text-xs font-medium text-foreground mb-2">Valores Calculados</h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Custo Fixo/h:</span>
            <span className="font-medium">{formatCurrency(freteResult.detalhes.custoFixoHora)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Custo Motorista/h:</span>
            <span className="font-medium">{formatCurrency(freteResult.detalhes.custoHoraMotorista)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Horas Normais:</span>
            <span className="font-medium">{freteResult.detalhes.horasNormais.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Horas Extras:</span>
            <span className="font-medium">{freteResult.detalhes.horasExtras.toFixed(1)}h</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Funcionários:</span>
            <span className="font-medium">{freteResult.detalhes.numFuncionarios}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Refeições/pessoa:</span>
            <span className="font-medium">{freteResult.detalhes.refeicoesPorPessoa}</span>
          </div>
        </div>
      </div>

      {/* Lista de Custos - Expandível */}
      <div className="space-y-1">
        <h4 className="text-xs font-medium text-foreground px-1">Composição do Custo</h4>
        {custoItems.map((item) => (
          <div 
            key={item.key} 
            className={`bg-muted/50 rounded border border-border/50 overflow-hidden cursor-pointer transition-colors hover:bg-muted/70 ${
              item.valor === 0 ? 'opacity-50' : ''
            }`}
            onClick={() => setExpandedItem(expandedItem === item.key ? null : item.key)}
          >
            <div className="p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {item.nome}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  {formatCurrency(item.valor)}
                </span>
                <ChevronRight className={`w-3 h-3 text-muted-foreground transition-transform ${
                  expandedItem === item.key ? 'rotate-90' : ''
                }`} />
              </div>
            </div>
            {expandedItem === item.key && (
              <div className="px-2 pb-2 pt-0 border-t border-border/50">
                <div className="bg-background/50 rounded p-2 mt-1.5">
                  <p className="text-[10px] font-mono text-primary mb-1">{item.formula}</p>
                  <p className="text-[10px] text-muted-foreground">{item.descricao}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

    </div>
  );
}