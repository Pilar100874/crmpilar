import { useState, useMemo, useCallback } from "react";
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
  Check,
  GripVertical,
  Move
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Variáveis disponíveis para a fórmula
const VARIAVEIS_DISPONIVEIS = [
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
  { id: "tempoViagem", nome: "Tempo Viagem", grupo: "Viagem", descricao: "Tempo total da viagem (horas)" },
  { id: "kmViagem", nome: "Km Viagem", grupo: "Viagem", descricao: "Distância da viagem só ida (km)" },
  { id: "numAjudantes", nome: "Nº Ajudantes", grupo: "Viagem", descricao: "Quantidade de ajudantes" },
  { id: "pedagioTotal", nome: "Pedágio Total", grupo: "Viagem", descricao: "Valor total de pedágios (R$)" },
  { id: "idaVolta", nome: "Ida/Volta", grupo: "Viagem", descricao: "Multiplicador: 2 se ida+volta, 1 se só ida" },
  { id: "kmTotal", nome: "Km Total", grupo: "Calculado", descricao: "kmViagem × idaVolta" },
  { id: "custoFixoHora", nome: "Custo Fixo/Hora", grupo: "Calculado", descricao: "(manutenção + extras) / horasMensais" },
  { id: "custoHoraMotorista", nome: "Custo Hora Motorista", grupo: "Calculado", descricao: "salário / horasMensais" },
  { id: "horasNormais", nome: "Horas Normais", grupo: "Calculado", descricao: "min(tempoViagem, jornadaBase)" },
  { id: "horasExtras", nome: "Horas Extras", grupo: "Calculado", descricao: "max(0, tempoViagem - jornadaBase)" },
  { id: "fatorExtra", nome: "Fator H.E.", grupo: "Calculado", descricao: "1 + (adicHoraExtraPerc / 100)" },
  { id: "numFuncionarios", nome: "Nº Funcionários", grupo: "Calculado", descricao: "1 + numAjudantes" },
  { id: "refeicoesPorPessoa", nome: "Refeições/Pessoa", grupo: "Calculado", descricao: "ceil(tempoViagem / 8)" },
  { id: "custoCombustivel", nome: "Custo Combustível", grupo: "Custos", descricao: "(kmTotal / mediaConsumo) × valorCombustivel" },
  { id: "custoFixosViagem", nome: "Custo Fixos Viagem", grupo: "Custos", descricao: "tempoViagem × custoFixoHora" },
  { id: "custoHorasNormais", nome: "Custo Horas Normais", grupo: "Custos", descricao: "horasNormais × custoHoraMotorista" },
  { id: "custoHorasExtras", nome: "Custo Horas Extras", grupo: "Custos", descricao: "horasExtras × custoHoraMotorista × fatorExtra" },
  { id: "custoAjudantes", nome: "Custo Ajudantes", grupo: "Custos", descricao: "valorAjudanteDia × numAjudantes" },
  { id: "custoPernoite", nome: "Custo Pernoite", grupo: "Custos", descricao: "pernoite × numFuncionarios (se tempoViagem > 12h)" },
  { id: "custoRefeicao", nome: "Custo Refeição", grupo: "Custos", descricao: "numFuncionarios × refeicoesPorPessoa × valorRefeicao" },
];

const OPERADORES = [
  { id: "+", nome: "+", tipo: "operador", descricao: "Soma" },
  { id: "-", nome: "−", tipo: "operador", descricao: "Subtração" },
  { id: "*", nome: "×", tipo: "operador", descricao: "Multiplicação" },
  { id: "/", nome: "÷", tipo: "operador", descricao: "Divisão" },
  { id: "(", nome: "(", tipo: "parentese", descricao: "Abre parêntese" },
  { id: ")", nome: ")", tipo: "parentese", descricao: "Fecha parêntese" },
];

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

export function stringArrayToTokens(formulaArray: string[]): FormulaToken[] {
  return formulaArray.map((item, index) => {
    const variavel = VARIAVEIS_DISPONIVEIS.find(v => v.id === item);
    const operador = OPERADORES.find(o => o.id === item);
    
    if (variavel) {
      return { id: `${variavel.id}_${index}`, tipo: "variavel" as const, valor: variavel.id, display: variavel.nome };
    } else if (operador) {
      return { id: `${operador.id}_${index}`, tipo: operador.tipo as "operador" | "parentese", valor: operador.id, display: operador.nome };
    } else {
      return { id: `num_${index}`, tipo: "numero" as const, valor: item, display: item };
    }
  });
}

export function createDefaultFormula(): SavedFormula {
  return {
    id: "default_frete_completo",
    nome: "Frete Completo (Padrão)",
    tokens: stringArrayToTokens(FORMULA_PADRAO_FRETE),
    createdAt: new Date().toISOString()
  };
}

export { VARIAVEIS_DISPONIVEIS, FORMULA_PADRAO_FRETE };

// Sortable Token Component
interface SortableTokenProps {
  token: FormulaToken;
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onRemove: () => void;
}

function SortableToken({ token, index, isSelected, onClick, onRemove }: SortableTokenProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: token.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOperator = token.tipo === "operador";
  const isParenthesis = token.tipo === "parentese";
  const isVariable = token.tipo === "variavel";
  const isNumber = token.tipo === "numero";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center ${isDragging ? "z-50" : ""}`}
    >
      <div
        className={`
          flex items-center gap-1 rounded-lg border-2 transition-all cursor-pointer
          ${isSelected ? "ring-2 ring-primary ring-offset-2 border-primary" : "border-transparent"}
          ${isDragging ? "shadow-lg scale-105" : "hover:shadow-md"}
          ${isVariable ? "bg-gradient-to-r from-primary/90 to-primary text-primary-foreground px-3 py-2" : ""}
          ${isNumber ? "bg-gradient-to-r from-secondary/90 to-secondary text-secondary-foreground px-3 py-2" : ""}
          ${isOperator ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white w-11 h-11 justify-center text-xl font-bold" : ""}
          ${isParenthesis ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white w-10 h-11 justify-center text-xl font-bold" : ""}
        `}
        onClick={onClick}
      >
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className={`cursor-grab active:cursor-grabbing ${isOperator || isParenthesis ? "hidden" : ""}`}
        >
          <GripVertical className="h-3.5 w-3.5 text-current opacity-50 hover:opacity-100" />
        </div>
        
        <span className={`font-medium ${isVariable || isNumber ? "text-sm" : ""}`}>
          {token.display}
        </span>
      </div>
      
      {/* Delete Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-xs shadow-md hover:scale-110"
      >
        ×
      </button>
    </div>
  );
}

// Token Preview for Drag Overlay
function TokenPreview({ token }: { token: FormulaToken }) {
  const isOperator = token.tipo === "operador";
  const isParenthesis = token.tipo === "parentese";
  const isVariable = token.tipo === "variavel";
  const isNumber = token.tipo === "numero";

  return (
    <div
      className={`
        flex items-center gap-1 rounded-lg shadow-xl border-2 border-primary
        ${isVariable ? "bg-gradient-to-r from-primary/90 to-primary text-primary-foreground px-3 py-2" : ""}
        ${isNumber ? "bg-gradient-to-r from-secondary/90 to-secondary text-secondary-foreground px-3 py-2" : ""}
        ${isOperator ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white w-11 h-11 justify-center text-xl font-bold" : ""}
        ${isParenthesis ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white w-10 h-11 justify-center text-xl font-bold" : ""}
      `}
    >
      <Move className={`h-3.5 w-3.5 opacity-50 ${isOperator || isParenthesis ? "hidden" : ""}`} />
      <span className={`font-medium ${isVariable || isNumber ? "text-sm" : ""}`}>
        {token.display}
      </span>
    </div>
  );
}

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
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const variaveisPorGrupo = useMemo(() => {
    const grupos: Record<string, typeof VARIAVEIS_DISPONIVEIS> = {};
    VARIAVEIS_DISPONIVEIS.forEach(v => {
      if (!grupos[v.grupo]) grupos[v.grupo] = [];
      grupos[v.grupo].push(v);
    });
    return grupos;
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = formula.findIndex((t) => t.id === active.id);
      const newIndex = formula.findIndex((t) => t.id === over.id);

      const newFormula = arrayMove(formula, oldIndex, newIndex);
      setFormula(newFormula);
      onChange?.(newFormula);
      
      // Update selected index if needed
      if (selectedIndex === oldIndex) {
        setSelectedIndex(newIndex);
      } else if (selectedIndex !== null) {
        if (oldIndex < selectedIndex && newIndex >= selectedIndex) {
          setSelectedIndex(selectedIndex - 1);
        } else if (oldIndex > selectedIndex && newIndex <= selectedIndex) {
          setSelectedIndex(selectedIndex + 1);
        }
      }
    }
  };

  const insertToken = useCallback((token: FormulaToken) => {
    let newFormula: FormulaToken[];
    if (selectedIndex !== null && selectedIndex < formula.length) {
      // Insert after selected position
      newFormula = [
        ...formula.slice(0, selectedIndex + 1),
        token,
        ...formula.slice(selectedIndex + 1)
      ];
      setSelectedIndex(selectedIndex + 1);
    } else {
      // Append to end
      newFormula = [...formula, token];
      setSelectedIndex(newFormula.length - 1);
    }
    setFormula(newFormula);
    onChange?.(newFormula);
  }, [formula, selectedIndex, onChange]);

  const addVariavel = (variavel: typeof VARIAVEIS_DISPONIVEIS[0]) => {
    insertToken({
      id: `${variavel.id}_${Date.now()}`,
      tipo: "variavel",
      valor: variavel.id,
      display: variavel.nome
    });
  };

  const addOperador = (op: typeof OPERADORES[0]) => {
    insertToken({
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
    insertToken({
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
    if (selectedIndex !== null) {
      if (selectedIndex === index) {
        setSelectedIndex(null);
      } else if (selectedIndex > index) {
        setSelectedIndex(selectedIndex - 1);
      }
    }
  };

  const clearFormula = () => {
    setFormula([]);
    onChange?.([]);
    setSelectedIndex(null);
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
    toast.success("Fórmula salva!");
  };

  const handleSelectFormula = (formulaId: string) => {
    const selected = savedFormulas.find(f => f.id === formulaId);
    if (selected) {
      setFormula(selected.tokens);
      onChange?.(selected.tokens);
      onSelectFormula?.(selected);
      setSelectedIndex(null);
    }
  };

  const activeToken = activeId ? formula.find(t => t.id === activeId) : null;

  const resultadoSimulacao = useMemo(() => {
    if (!valoresSimulacao || formula.length === 0) return null;
    try {
      let expressao = formula.map(token => {
        if (token.tipo === "variavel") {
          return valoresSimulacao[token.valor] ?? 0;
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

  return (
    <Card className="border-2">
      <CardHeader className="pb-3 bg-gradient-to-r from-muted/50 to-muted/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            Editor de Fórmula
          </CardTitle>
          
          {savedFormulas.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Usar fórmula:</Label>
              <Select value={selectedFormulaId || ""} onValueChange={handleSelectFormula}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Selecione" />
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
                  className="h-9 w-9 p-0 text-destructive hover:bg-destructive/10"
                  onClick={() => { onDeleteFormula(selectedFormulaId); clearFormula(); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {/* Formula Area with Drag and Drop */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs text-muted-foreground flex items-center gap-2">
              <Move className="h-3 w-3" />
              Fórmula Atual (arraste para reordenar)
            </Label>
            {selectedIndex !== null && (
              <Badge variant="secondary" className="text-xs">
                Inserindo após posição {selectedIndex + 1}
              </Badge>
            )}
          </div>
          
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div 
              className="min-h-[100px] p-4 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-gradient-to-b from-muted/20 to-muted/5 flex flex-wrap gap-3 items-center content-start"
              onClick={() => setSelectedIndex(formula.length > 0 ? formula.length - 1 : null)}
            >
              {formula.length === 0 ? (
                <div className="w-full flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mb-3">
                    <Calculator className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <span className="text-sm text-muted-foreground font-medium">
                    Fórmula vazia
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Clique nas variáveis e operadores abaixo para montar
                  </span>
                </div>
              ) : (
                <SortableContext
                  items={formula.map(t => t.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {formula.map((token, index) => (
                    <SortableToken
                      key={token.id}
                      token={token}
                      index={index}
                      isSelected={selectedIndex === index}
                      onClick={() => setSelectedIndex(index)}
                      onRemove={() => removeToken(index)}
                    />
                  ))}
                </SortableContext>
              )}
            </div>
            
            <DragOverlay>
              {activeToken ? <TokenPreview token={activeToken} /> : null}
            </DragOverlay>
          </DndContext>
          
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <span className="text-primary">💡</span>
            Clique em um token para selecionar. Novos elementos serão inseridos após a seleção.
          </p>
        </div>

        {/* Result */}
        {resultadoSimulacao !== null && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-700 dark:text-green-400">Resultado:</span>
              <span className="text-xl font-bold text-green-700 dark:text-green-400">
                {resultadoSimulacao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={clearFormula} disabled={formula.length === 0}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Limpar
          </Button>
          {selectedIndex !== null && (
            <Button size="sm" variant="outline" onClick={() => setSelectedIndex(null)}>
              Desmarcar
            </Button>
          )}
          
          <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <DialogTrigger asChild>
              <Button size="sm" variant="default" disabled={formula.length === 0}>
                <Save className="h-4 w-4 mr-1" />
                Salvar Fórmula
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
                    placeholder="Ex: Frete Simples..."
                  />
                </div>
                <div className="p-3 rounded-xl bg-muted/50 max-h-32 overflow-auto">
                  <Label className="text-xs text-muted-foreground">Prévia:</Label>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formula.map((t, i) => (
                      <span key={i} className={`text-xs px-2 py-1 rounded-md font-medium ${
                        t.tipo === "variavel" ? "bg-primary/20 text-primary" :
                        t.tipo === "operador" ? "bg-blue-500/20 text-blue-700 dark:text-blue-300" :
                        t.tipo === "parentese" ? "bg-amber-500/20 text-amber-700 dark:text-amber-300" :
                        "bg-secondary text-secondary-foreground"
                      }`}>
                        {t.display}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
                <Button onClick={handleSaveFormula}><Save className="h-4 w-4 mr-1" />Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Separator />

        {/* Operators */}
        <div>
          <Label className="text-xs text-muted-foreground mb-3 block font-medium">Operadores</Label>
          <div className="flex gap-2 flex-wrap items-center">
            {OPERADORES.map(op => (
              <TooltipProvider key={op.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      size="lg" 
                      variant="outline" 
                      className={`w-12 h-12 text-xl font-bold transition-all hover:scale-105 ${
                        op.tipo === "operador" 
                          ? "hover:bg-blue-500 hover:text-white hover:border-blue-500" 
                          : "hover:bg-amber-500 hover:text-white hover:border-amber-500"
                      }`}
                      onClick={() => addOperador(op)}
                    >
                      {op.nome}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{op.descricao}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
            <div className="flex gap-2 items-center ml-2 pl-4 border-l-2">
              <Input
                type="number"
                step="any"
                value={numeroInput}
                onChange={e => setNumeroInput(e.target.value)}
                placeholder="Número"
                className="w-24 h-12"
                onKeyDown={e => e.key === "Enter" && addNumero()}
              />
              <Button variant="secondary" onClick={addNumero} className="h-12 hover:scale-105 transition-transform">
                <Hash className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* Variables */}
        <div>
          <Label className="text-xs text-muted-foreground mb-3 block font-medium">Variáveis Disponíveis</Label>
          <div className="space-y-2">
            {Object.entries(variaveisPorGrupo).map(([grupo, vars]) => (
              <div key={grupo} className="border rounded-xl overflow-hidden">
                <button
                  className="w-full px-4 py-3 bg-gradient-to-r from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 flex items-center justify-between text-sm font-medium transition-colors"
                  onClick={() => setGrupoExpandido(grupoExpandido === grupo ? "" : grupo)}
                >
                  <span className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                      <Variable className="h-3.5 w-3.5 text-primary" />
                    </div>
                    {grupo}
                    <Badge variant="outline" className="text-xs">{vars.length}</Badge>
                  </span>
                  <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${grupoExpandido === grupo ? "rotate-90" : ""}`} />
                </button>
                {grupoExpandido === grupo && (
                  <div className="p-3 flex flex-wrap gap-2 bg-background border-t">
                    {vars.map(v => (
                      <TooltipProvider key={v.id}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="secondary" 
                              className="h-auto py-2 px-3 text-xs hover:bg-primary hover:text-primary-foreground transition-all hover:scale-105" 
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
