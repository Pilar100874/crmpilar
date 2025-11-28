import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  Plus, 
  Minus, 
  X, 
  Divide, 
  Trash2, 
  RotateCcw,
  Save,
  Play,
  Parentheses,
  Variable,
  Hash,
  Info,
  ChevronRight
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/lib/toast-config";

// Variáveis disponíveis para a fórmula
const VARIAVEIS_DISPONIVEIS = [
  // Configuração do veículo
  { id: "manutencaoMensal", nome: "Manutenção Mensal", grupo: "Veículo", descricao: "Custo mensal de manutenção, pneus, óleo (R$)" },
  { id: "extrasMensais", nome: "Extras Mensais", grupo: "Veículo", descricao: "Seguro, depreciação, licenciamento (R$)" },
  { id: "salarioMotorista", nome: "Salário Motorista", grupo: "Veículo", descricao: "Salário mensal com encargos (R$)" },
  { id: "valorAjudanteDia", nome: "Valor Ajudante/Dia", grupo: "Veículo", descricao: "Custo por dia do ajudante (R$)" },
  { id: "valorRefeicao", nome: "Valor Refeição", grupo: "Veículo", descricao: "Valor por refeição por pessoa (R$)" },
  { id: "valorCombustivel", nome: "Valor Combustível", grupo: "Veículo", descricao: "Preço do combustível por litro (R$)" },
  { id: "mediaConsumo", nome: "Média Consumo", grupo: "Veículo", descricao: "Consumo médio do veículo (km/l)" },
  { id: "pernoite", nome: "Pernoite", grupo: "Veículo", descricao: "Valor da pernoite por pessoa (R$)" },
  { id: "adicHoraExtraPerc", nome: "Adic. Hora Extra %", grupo: "Veículo", descricao: "Percentual adicional hora extra" },
  { id: "jornadaBaseDia", nome: "Jornada Base/Dia", grupo: "Veículo", descricao: "Jornada normal antes de hora extra (h)" },
  { id: "horasMensais", nome: "Horas Mensais", grupo: "Veículo", descricao: "Quantidade de horas mensais (padrão 220)" },
  // Variáveis da viagem
  { id: "tempoViagem", nome: "Tempo Viagem", grupo: "Viagem", descricao: "Tempo total da viagem (horas)" },
  { id: "kmViagem", nome: "Km Viagem", grupo: "Viagem", descricao: "Distância da viagem só ida (km)" },
  { id: "numAjudantes", nome: "Nº Ajudantes", grupo: "Viagem", descricao: "Quantidade de ajudantes" },
  { id: "pedagioTotal", nome: "Pedágio Total", grupo: "Viagem", descricao: "Valor total de pedágios (R$)" },
  { id: "idaVolta", nome: "Ida/Volta", grupo: "Viagem", descricao: "Multiplicador: 2 se ida+volta, 1 se só ida" },
  // Variáveis calculadas
  { id: "kmTotal", nome: "Km Total", grupo: "Calculado", descricao: "kmViagem × idaVolta" },
  { id: "custoFixoHora", nome: "Custo Fixo/Hora", grupo: "Calculado", descricao: "(manutenção + extras) / horasMensais" },
  { id: "custoHoraMotorista", nome: "Custo Hora Motorista", grupo: "Calculado", descricao: "salário / horasMensais" },
  { id: "horasNormais", nome: "Horas Normais", grupo: "Calculado", descricao: "min(tempoViagem, jornadaBase)" },
  { id: "horasExtras", nome: "Horas Extras", grupo: "Calculado", descricao: "max(0, tempoViagem - jornadaBase)" },
  { id: "fatorExtra", nome: "Fator H.E.", grupo: "Calculado", descricao: "1 + (adicHoraExtraPerc / 100)" },
  { id: "numFuncionarios", nome: "Nº Funcionários", grupo: "Calculado", descricao: "1 + numAjudantes" },
  { id: "refeicoesPorPessoa", nome: "Refeições/Pessoa", grupo: "Calculado", descricao: "ceil(tempoViagem / 8)" },
];

// Operadores disponíveis
const OPERADORES = [
  { id: "+", nome: "+", tipo: "operador", descricao: "Soma" },
  { id: "-", nome: "-", tipo: "operador", descricao: "Subtração" },
  { id: "*", nome: "×", tipo: "operador", descricao: "Multiplicação" },
  { id: "/", nome: "÷", tipo: "operador", descricao: "Divisão" },
  { id: "(", nome: "(", tipo: "parentese", descricao: "Abre parêntese" },
  { id: ")", nome: ")", tipo: "parentese", descricao: "Fecha parêntese" },
];

// Fórmulas predefinidas
const FORMULAS_PREDEFINIDAS = [
  {
    nome: "Combustível",
    formula: ["(", "kmTotal", "/", "mediaConsumo", ")", "*", "valorCombustivel"],
    descricao: "Custo de combustível baseado na distância"
  },
  {
    nome: "Custos Fixos",
    formula: ["tempoViagem", "*", "custoFixoHora"],
    descricao: "Custos fixos rateados pelo tempo"
  },
  {
    nome: "Horas Normais",
    formula: ["horasNormais", "*", "custoHoraMotorista"],
    descricao: "Custo das horas dentro da jornada"
  },
  {
    nome: "Horas Extras",
    formula: ["horasExtras", "*", "custoHoraMotorista", "*", "fatorExtra"],
    descricao: "Custo das horas além da jornada"
  },
  {
    nome: "Ajudantes",
    formula: ["valorAjudanteDia", "*", "numAjudantes"],
    descricao: "Custo dos ajudantes por dia"
  },
  {
    nome: "Refeições",
    formula: ["numFuncionarios", "*", "refeicoesPorPessoa", "*", "valorRefeicao"],
    descricao: "Custo de refeições"
  },
];

interface FormulaToken {
  id: string;
  tipo: "variavel" | "operador" | "parentese" | "numero";
  valor: string;
  display: string;
}

interface FormulaBuilderProps {
  formula?: FormulaToken[];
  onChange?: (formula: FormulaToken[]) => void;
  valoresSimulacao?: Record<string, number>;
}

export function FormulaBuilder({ formula: initialFormula, onChange, valoresSimulacao }: FormulaBuilderProps) {
  const [formula, setFormula] = useState<FormulaToken[]>(initialFormula || []);
  const [numeroInput, setNumeroInput] = useState("");
  const [grupoExpandido, setGrupoExpandido] = useState<string>("Veículo");

  // Agrupar variáveis
  const variaveisPorGrupo = useMemo(() => {
    const grupos: Record<string, typeof VARIAVEIS_DISPONIVEIS> = {};
    VARIAVEIS_DISPONIVEIS.forEach(v => {
      if (!grupos[v.grupo]) grupos[v.grupo] = [];
      grupos[v.grupo].push(v);
    });
    return grupos;
  }, []);

  const addToken = (token: FormulaToken) => {
    const newFormula = [...formula, token];
    setFormula(newFormula);
    onChange?.(newFormula);
  };

  const addVariavel = (variavel: typeof VARIAVEIS_DISPONIVEIS[0]) => {
    addToken({
      id: variavel.id,
      tipo: "variavel",
      valor: variavel.id,
      display: variavel.nome
    });
  };

  const addOperador = (op: typeof OPERADORES[0]) => {
    addToken({
      id: `${op.id}_${Date.now()}`,
      tipo: op.tipo as "operador" | "parentese",
      valor: op.id,
      display: op.nome
    });
  };

  const addNumero = () => {
    if (!numeroInput || isNaN(Number(numeroInput))) {
      toast.error("Digite um número válido");
      return;
    }
    addToken({
      id: `num_${Date.now()}`,
      tipo: "numero",
      valor: numeroInput,
      display: numeroInput
    });
    setNumeroInput("");
  };

  const removeToken = (index: number) => {
    const newFormula = formula.filter((_, i) => i !== index);
    setFormula(newFormula);
    onChange?.(newFormula);
  };

  const clearFormula = () => {
    setFormula([]);
    onChange?.([]);
  };

  const loadPredefinida = (predefinida: typeof FORMULAS_PREDEFINIDAS[0]) => {
    const tokens: FormulaToken[] = predefinida.formula.map((item, index) => {
      const variavel = VARIAVEIS_DISPONIVEIS.find(v => v.id === item);
      const operador = OPERADORES.find(o => o.id === item);
      
      if (variavel) {
        return {
          id: `${variavel.id}_${index}`,
          tipo: "variavel" as const,
          valor: variavel.id,
          display: variavel.nome
        };
      } else if (operador) {
        return {
          id: `${operador.id}_${index}`,
          tipo: operador.tipo as "operador" | "parentese",
          valor: operador.id,
          display: operador.nome
        };
      } else {
        return {
          id: `num_${index}`,
          tipo: "numero" as const,
          valor: item,
          display: item
        };
      }
    });
    setFormula(tokens);
    onChange?.(tokens);
  };

  // Calcular resultado da simulação
  const resultadoSimulacao = useMemo(() => {
    if (!valoresSimulacao || formula.length === 0) return null;

    try {
      // Construir expressão
      let expressao = formula.map(token => {
        if (token.tipo === "variavel") {
          const valor = valoresSimulacao[token.valor];
          return valor !== undefined ? valor : 0;
        } else if (token.tipo === "numero") {
          return Number(token.valor);
        } else if (token.valor === "×") {
          return "*";
        } else if (token.valor === "÷") {
          return "/";
        } else {
          return token.valor;
        }
      }).join(" ");

      // Avaliar expressão (de forma segura)
      const resultado = Function(`"use strict"; return (${expressao})`)();
      return typeof resultado === "number" && !isNaN(resultado) ? resultado : null;
    } catch {
      return null;
    }
  }, [formula, valoresSimulacao]);

  // Gerar string da fórmula legível
  const formulaString = useMemo(() => {
    return formula.map(t => t.display).join(" ");
  }, [formula]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Editor de Fórmula
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Área da Fórmula */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Fórmula Atual</Label>
          <div className="min-h-[60px] p-3 rounded-lg border-2 border-dashed border-muted bg-muted/20 flex flex-wrap gap-1 items-center">
            {formula.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Clique nas variáveis e operadores abaixo para montar sua fórmula
              </span>
            ) : (
              formula.map((token, index) => (
                <Badge
                  key={token.id}
                  variant={token.tipo === "variavel" ? "default" : token.tipo === "numero" ? "secondary" : "outline"}
                  className={`cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors ${
                    token.tipo === "operador" ? "bg-primary/20 text-primary" : ""
                  } ${token.tipo === "parentese" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : ""}`}
                  onClick={() => removeToken(index)}
                >
                  {token.display}
                  <X className="h-3 w-3 ml-1" />
                </Badge>
              ))
            )}
          </div>
          {formula.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              {formulaString}
            </p>
          )}
        </div>

        {/* Resultado da Simulação */}
        {resultadoSimulacao !== null && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Resultado:</span>
              <span className="text-lg font-bold text-green-700 dark:text-green-400">
                {resultadoSimulacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={clearFormula} disabled={formula.length === 0}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Limpar
          </Button>
        </div>

        <Separator />

        {/* Operadores */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Operadores</Label>
          <div className="flex gap-2 flex-wrap">
            {OPERADORES.map(op => (
              <TooltipProvider key={op.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-10 h-10 text-lg font-bold"
                      onClick={() => addOperador(op)}
                    >
                      {op.nome}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{op.descricao}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            <div className="flex gap-1 items-center ml-2">
              <Input
                type="number"
                step="any"
                value={numeroInput}
                onChange={e => setNumeroInput(e.target.value)}
                placeholder="Número"
                className="w-24 h-10"
                onKeyDown={e => e.key === "Enter" && addNumero()}
              />
              <Button size="sm" variant="secondary" onClick={addNumero} className="h-10">
                <Hash className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Variáveis por Grupo */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Variáveis Disponíveis</Label>
          <div className="space-y-2">
            {Object.entries(variaveisPorGrupo).map(([grupo, vars]) => (
              <div key={grupo} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full px-3 py-2 bg-muted/50 hover:bg-muted flex items-center justify-between text-sm font-medium"
                  onClick={() => setGrupoExpandido(grupoExpandido === grupo ? "" : grupo)}
                >
                  <span className="flex items-center gap-2">
                    <Variable className="h-4 w-4" />
                    {grupo}
                    <Badge variant="outline" className="text-xs">{vars.length}</Badge>
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform ${grupoExpandido === grupo ? "rotate-90" : ""}`} />
                </button>
                {grupoExpandido === grupo && (
                  <div className="p-2 flex flex-wrap gap-1">
                    {vars.map(v => (
                      <TooltipProvider key={v.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-auto py-1 px-2 text-xs"
                              onClick={() => addVariavel(v)}
                            >
                              {v.nome}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="font-medium">{v.nome}</p>
                            <p className="text-xs text-muted-foreground">{v.descricao}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Fórmulas Predefinidas */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Fórmulas Predefinidas (Clique para carregar)</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {FORMULAS_PREDEFINIDAS.map(pred => (
              <TooltipProvider key={pred.nome}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-auto py-2 text-xs justify-start"
                      onClick={() => loadPredefinida(pred)}
                    >
                      <Play className="h-3 w-3 mr-1 flex-shrink-0" />
                      {pred.nome}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-medium">{pred.nome}</p>
                    <p className="text-xs text-muted-foreground">{pred.descricao}</p>
                    <p className="text-xs font-mono mt-1">
                      {pred.formula.join(" ")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
