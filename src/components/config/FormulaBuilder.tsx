import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Calculator, 
  Plus, 
  Trash2, 
  RotateCcw,
  Save,
  Variable,
  Hash,
  ChevronRight,
  Check
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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
  // Custos individuais calculados
  { id: "custoCombustivel", nome: "Custo Combustível", grupo: "Custos", descricao: "(kmTotal / mediaConsumo) × valorCombustivel" },
  { id: "custoFixosViagem", nome: "Custo Fixos Viagem", grupo: "Custos", descricao: "tempoViagem × custoFixoHora" },
  { id: "custoHorasNormais", nome: "Custo Horas Normais", grupo: "Custos", descricao: "horasNormais × custoHoraMotorista" },
  { id: "custoHorasExtras", nome: "Custo Horas Extras", grupo: "Custos", descricao: "horasExtras × custoHoraMotorista × fatorExtra" },
  { id: "custoAjudantes", nome: "Custo Ajudantes", grupo: "Custos", descricao: "valorAjudanteDia × numAjudantes" },
  { id: "custoPernoite", nome: "Custo Pernoite", grupo: "Custos", descricao: "pernoite × numFuncionarios (se tempoViagem > 12h)" },
  { id: "custoRefeicao", nome: "Custo Refeição", grupo: "Custos", descricao: "numFuncionarios × refeicoesPorPessoa × valorRefeicao" },
];

// Operadores disponíveis
const OPERADORES = [
  { id: "+", nome: "+", tipo: "operador", descricao: "Soma" },
  { id: "-", nome: "−", tipo: "operador", descricao: "Subtração" },
  { id: "*", nome: "×", tipo: "operador", descricao: "Multiplicação" },
  { id: "/", nome: "÷", tipo: "operador", descricao: "Divisão" },
  { id: "(", nome: "(", tipo: "parentese", descricao: "Abre parêntese" },
  { id: ")", nome: ")", tipo: "parentese", descricao: "Fecha parêntese" },
];

// Fórmula padrão completa de custo de frete
const FORMULA_PADRAO_FRETE = [
  "custoCombustivel", "+", "custoFixosViagem", "+", "custoHorasNormais", "+", 
  "custoHorasExtras", "+", "custoAjudantes", "+", "custoPernoite", "+", 
  "custoRefeicao", "+", "pedagioTotal"
];

export interface FormulaToken {
  id: string;
  tipo: "variavel" | "operador" | "parentese" | "numero";
  valor: string;
  display: string;
}

export interface SavedFormula {
  id: string;
  nome: string;
  tokens: FormulaToken[];
  createdAt: string;
}

interface FormulaBuilderProps {
  formula?: FormulaToken[];
  onChange?: (formula: FormulaToken[]) => void;
  valoresSimulacao?: Record<string, number>;
  showDefaultFormula?: boolean;
  savedFormulas?: SavedFormula[];
  onSaveFormula?: (formula: SavedFormula) => void;
  onDeleteFormula?: (id: string) => void;
  onSelectFormula?: (formula: SavedFormula) => void;
  selectedFormulaId?: string;
}

// Função auxiliar para converter array de strings em FormulaToken[]
export function stringArrayToTokens(formulaArray: string[]): FormulaToken[] {
  return formulaArray.map((item, index) => {
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
}

// Criar fórmula padrão como SavedFormula
export function createDefaultFormula(): SavedFormula {
  return {
    id: "default_frete_completo",
    nome: "Frete Completo (Padrão)",
    tokens: stringArrayToTokens(FORMULA_PADRAO_FRETE),
    createdAt: new Date().toISOString()
  };
}

// Exportar variáveis e fórmula padrão
export { VARIAVEIS_DISPONIVEIS, FORMULA_PADRAO_FRETE };

export function FormulaBuilder({ 
  formula: initialFormula, 
  onChange, 
  valoresSimulacao, 
  showDefaultFormula = true,
  savedFormulas = [],
  onSaveFormula,
  onDeleteFormula,
  onSelectFormula,
  selectedFormulaId
}: FormulaBuilderProps) {
  const defaultFormula = showDefaultFormula ? stringArrayToTokens(FORMULA_PADRAO_FRETE) : [];
  const [formula, setFormula] = useState<FormulaToken[]>(initialFormula || defaultFormula);
  const [numeroInput, setNumeroInput] = useState("");
  const [grupoExpandido, setGrupoExpandido] = useState<string>("Custos");
  const [newFormulaName, setNewFormulaName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

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
      id: `${variavel.id}_${Date.now()}`,
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

  const handleSaveFormula = () => {
    if (!newFormulaName.trim()) {
      toast.error("Digite um nome para a fórmula");
      return;
    }
    if (formula.length === 0) {
      toast.error("A fórmula está vazia");
      return;
    }
    
    const newFormula: SavedFormula = {
      id: `formula_${Date.now()}`,
      nome: newFormulaName.trim(),
      tokens: formula,
      createdAt: new Date().toISOString()
    };
    
    onSaveFormula?.(newFormula);
    setNewFormulaName("");
    setShowSaveDialog(false);
    toast.success("Fórmula salva com sucesso!");
  };

  const handleSelectFormula = (formulaId: string) => {
    const selected = savedFormulas.find(f => f.id === formulaId);
    if (selected) {
      setFormula(selected.tokens);
      onChange?.(selected.tokens);
      onSelectFormula?.(selected);
    }
  };

  // Calcular resultado da simulação
  const resultadoSimulacao = useMemo(() => {
    if (!valoresSimulacao || formula.length === 0) return null;

    try {
      let expressao = formula.map(token => {
        if (token.tipo === "variavel") {
          const valor = valoresSimulacao[token.valor];
          return valor !== undefined ? valor : 0;
        } else if (token.tipo === "numero") {
          return Number(token.valor);
        } else {
          return token.valor;
        }
      }).join(" ");

      const resultado = Function(`"use strict"; return (${expressao})`)();
      return typeof resultado === "number" && !isNaN(resultado) ? resultado : null;
    } catch {
      return null;
    }
  }, [formula, valoresSimulacao]);

  // Renderizar token com espaçamento visual adequado
  const renderToken = (token: FormulaToken, index: number) => {
    const isOperator = token.tipo === "operador";
    const isParenthesis = token.tipo === "parentese";
    const isVariable = token.tipo === "variavel";
    const isNumber = token.tipo === "numero";

    return (
      <TooltipProvider key={`${token.id}_${index}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => removeToken(index)}
              className={`
                cursor-pointer transition-all text-sm font-medium rounded-md inline-flex items-center justify-center
                hover:ring-2 hover:ring-destructive hover:ring-offset-1
                ${isVariable ? "bg-primary text-primary-foreground px-3 py-2" : ""}
                ${isNumber ? "bg-secondary text-secondary-foreground px-3 py-2" : ""}
                ${isOperator ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 w-12 h-12 text-2xl font-bold mx-1" : ""}
                ${isParenthesis ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 w-10 h-12 text-2xl font-bold" : ""}
              `}
            >
              {token.display}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Clique para remover</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Editor de Fórmula
          </CardTitle>
          
          {/* Seletor de Fórmulas Salvas */}
          {savedFormulas.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Usar fórmula:</Label>
              <Select value={selectedFormulaId || ""} onValueChange={handleSelectFormula}>
                <SelectTrigger className="w-[220px] h-9">
                  <SelectValue placeholder="Selecione uma fórmula" />
                </SelectTrigger>
                <SelectContent>
                  {savedFormulas.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      <div className="flex items-center gap-2">
                        {selectedFormulaId === f.id && <Check className="h-3 w-3 text-green-500" />}
                        <span>{f.nome}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedFormulaId && onDeleteFormula && selectedFormulaId !== "default_frete_completo" && (
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-9 w-9 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onDeleteFormula(selectedFormulaId);
                    clearFormula();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Área da Fórmula */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Fórmula Atual</Label>
          <div className="min-h-[100px] p-4 rounded-lg border-2 border-dashed border-muted bg-muted/5 flex flex-wrap gap-2 items-center content-start">
            {formula.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Clique nas variáveis e operadores abaixo para montar sua fórmula
              </span>
            ) : (
              formula.map((token, index) => renderToken(token, index))
            )}
          </div>
        </div>

        {/* Resultado da Simulação */}
        {resultadoSimulacao !== null && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Resultado Calculado:</span>
              <span className="text-xl font-bold text-green-700 dark:text-green-400">
                {resultadoSimulacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={clearFormula} disabled={formula.length === 0}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Limpar
          </Button>
          
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="default" disabled={formula.length === 0}>
                <Save className="h-4 w-4 mr-1" />
                Salvar como Nova Fórmula
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Salvar Fórmula</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="formula-name">Nome da Fórmula</Label>
                  <Input
                    id="formula-name"
                    value={newFormulaName}
                    onChange={(e) => setNewFormulaName(e.target.value)}
                    placeholder="Ex: Frete Simples, Só Combustível..."
                  />
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Prévia da fórmula:</Label>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formula.map((t, i) => (
                      <span 
                        key={i} 
                        className={`text-xs px-2 py-1 rounded ${
                          t.tipo === "variavel" ? "bg-primary/20 text-primary" :
                          t.tipo === "operador" ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold px-3" :
                          t.tipo === "parentese" ? "bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 font-bold" :
                          "bg-secondary text-secondary-foreground"
                        }`}
                      >
                        {t.display}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveFormula}>
                  <Save className="h-4 w-4 mr-1" />
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        {/* Operadores */}
        <div>
          <Label className="text-xs text-muted-foreground mb-3 block">Operadores Matemáticos</Label>
          <div className="flex gap-3 flex-wrap items-center">
            {OPERADORES.map(op => (
              <TooltipProvider key={op.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="lg"
                      variant="outline"
                      className="w-14 h-14 text-2xl font-bold hover:bg-blue-50 dark:hover:bg-blue-950"
                      onClick={() => addOperador(op)}
                    >
                      {op.nome}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{op.descricao}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            <div className="flex gap-2 items-center ml-4 pl-4 border-l">
              <Input
                type="number"
                step="any"
                value={numeroInput}
                onChange={e => setNumeroInput(e.target.value)}
                placeholder="Número"
                className="w-28 h-14 text-lg"
                onKeyDown={e => e.key === "Enter" && addNumero()}
              />
              <Button variant="secondary" onClick={addNumero} className="h-14 px-4">
                <Hash className="h-5 w-5 mr-1" />
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Variáveis por Grupo */}
        <div>
          <Label className="text-xs text-muted-foreground mb-3 block">Variáveis Disponíveis</Label>
          <div className="space-y-2">
            {Object.entries(variaveisPorGrupo).map(([grupo, vars]) => (
              <div key={grupo} className="border rounded-lg overflow-hidden">
                <button
                  className="w-full px-4 py-3 bg-muted/50 hover:bg-muted flex items-center justify-between text-sm font-medium transition-colors"
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
                  <div className="p-4 flex flex-wrap gap-2 bg-background">
                    {vars.map(v => (
                      <TooltipProvider key={v.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-auto py-2 px-3 text-xs"
                              onClick={() => addVariavel(v)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              {v.nome}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
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
      </CardContent>
    </Card>
  );
}
