import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Type, Hash, Calendar, List, ToggleLeft, Lock, Database, Globe, Box } from "lucide-react";
import { FlowVariable } from "./VariableManager";
import { Node, Edge } from "@xyflow/react";

interface BlockMonitorProps {
  selectedNode: Node | null;
  nodes: Node[];
  edges: Edge[];
  context: Record<string, any>;
  allVariables: FlowVariable[];
}

const variableTypeIcons = {
  text: Type,
  number: Hash,
  date: Calendar,
  array: List,
  boolean: ToggleLeft,
};

const variableTypeColors = {
  text: "text-primary",
  number: "text-green-600",
  date: "text-purple-600",
  array: "text-orange-600",
  boolean: "text-pink-600",
};

// Função auxiliar para obter variáveis disponíveis para um nó
const getAvailableVariablesForNode = (
  nodeId: string,
  nodes: Node[],
  edges: Edge[],
  allVariables: FlowVariable[]
): FlowVariable[] => {
  const getAncestorNodes = (currentNodeId: string, visited = new Set<string>()): Set<string> => {
    if (visited.has(currentNodeId)) return visited;
    visited.add(currentNodeId);

    const incomingEdges = edges.filter(edge => edge.target === currentNodeId);
    incomingEdges.forEach(edge => {
      getAncestorNodes(edge.source, visited);
    });

    return visited;
  };

  const ancestorIds = getAncestorNodes(nodeId);
  ancestorIds.delete(nodeId);

  // Retorna variáveis globais e todas as outras
  return allVariables.filter(variable => {
    return variable.scope === "global";
  });
};

export function BlockMonitor({ selectedNode, nodes, edges, context, allVariables }: BlockMonitorProps) {
  const formatValue = (value: any, variable: FlowVariable): string => {
    const displayValue = value !== undefined && value !== null ? value : variable.defaultValue;
    
    if (displayValue === undefined || displayValue === null) return "-";
    
    if (variable.type === "array") {
      try {
        return Array.isArray(displayValue) ? `[${displayValue.length} itens]` : JSON.stringify(displayValue);
      } catch {
        return String(displayValue);
      }
    }
    
    if (variable.type === "boolean") {
      return displayValue ? "Verdadeiro" : "Falso";
    }
    
    if (variable.type === "date") {
      try {
        return new Date(displayValue).toLocaleString("pt-BR");
      } catch {
        return String(displayValue);
      }
    }
    
    return String(displayValue);
  };

  const getValueColor = (value: any): string => {
    if (value === undefined || value === null) return "text-slate-500";
    return "text-foreground";
  };

  const availableVariables = selectedNode 
    ? getAvailableVariablesForNode(selectedNode.id, nodes, edges, allVariables)
    : [];

  const blockLabel = String(selectedNode?.data?.label || "Nenhum bloco selecionado");

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-card dark:bg-card border-border text-foreground hover:bg-muted hover:text-foreground"
          title="Monitor do bloco selecionado"
          disabled={!selectedNode}
        >
          <Box className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:w-[700px] bg-card dark:bg-card border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Monitor do Bloco
          </SheetTitle>
          <SheetDescription className="text-slate-600">
            Variáveis acessíveis no bloco: <span className="font-semibold text-foreground">{blockLabel}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {availableVariables.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <Database className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Nenhuma variável disponível</p>
              <p className="text-sm text-slate-500 mt-1">
                {selectedNode 
                  ? "Variáveis criadas antes deste bloco aparecerão aqui"
                  : "Selecione um bloco para ver as variáveis disponíveis"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-muted bg-primary/5">
                      <TableHead className="text-foreground font-bold">Variável</TableHead>
                      <TableHead className="text-foreground font-bold w-[100px]">Tipo</TableHead>
                      <TableHead className="text-foreground font-bold">Valor</TableHead>
                      <TableHead className="text-foreground font-bold w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableVariables.map((variable) => {
                      const Icon = variableTypeIcons[variable.type];
                      const typeColor = variableTypeColors[variable.type];
                      const cleanVarName = variable.name.replace(/^\{\{|\}\}$/g, '');
                      const currentValue = context[cleanVarName];
                      const hasValue = currentValue !== undefined && currentValue !== null;
                      
                      return (
                        <TableRow 
                          key={variable.id} 
                          className="border-slate-200 hover:bg-primary/5"
                        >
                          <TableCell className="align-top">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <Icon className={`h-4 w-4 ${typeColor} flex-shrink-0`} />
                              <span className="font-mono text-sm text-foreground break-all">
                                {variable.name}
                              </span>
                              {variable.scope === "global" && (
                                <span title="Variável global" className="flex-shrink-0">
                                  <Globe className="h-3 w-3 text-green-600" />
                                </span>
                              )}
                              {variable.isConstant && (
                                <span title="Variável fixa" className="flex-shrink-0">
                                  <Lock className="h-3 w-3 text-amber-600" />
                                </span>
                              )}
                            </div>
                            {variable.description && (
                              <p className="text-xs text-slate-500 ml-6 mt-0.5 break-words">
                                {variable.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge 
                              variant="outline" 
                              className={`${typeColor} border-slate-300 bg-slate-50 whitespace-nowrap`}
                            >
                              {variable.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <code 
                              className={`text-sm font-mono ${getValueColor(currentValue !== undefined ? currentValue : variable.defaultValue)} bg-slate-50 px-2 py-1 rounded border border-slate-200 break-all max-w-full inline-block`}
                            >
                              {formatValue(currentValue, variable)}
                            </code>
                          </TableCell>
                          <TableCell className="align-top">
                            {hasValue ? (
                              <Badge 
                                variant="outline" 
                                className="text-green-700 border-green-300 bg-green-50 whitespace-nowrap"
                              >
                                ✓ Def.
                              </Badge>
                            ) : variable.defaultValue !== undefined ? (
                              <Badge 
                                variant="outline" 
                                className="text-amber-700 border-amber-300 bg-amber-50 text-xs whitespace-nowrap"
                              >
                                Padrão
                              </Badge>
                            ) : (
                              <Badge 
                                variant="outline" 
                                className="text-slate-500 border-slate-300 bg-slate-50 text-xs whitespace-nowrap"
                              >
                                Vazio
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Legenda */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-semibold text-foreground mb-2">Legenda:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Type className="h-3 w-3 text-primary" />
                    <span>Texto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3 w-3 text-green-600" />
                    <span>Número</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-purple-600" />
                    <span>Data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <List className="h-3 w-3 text-orange-600" />
                    <span>Array</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ToggleLeft className="h-3 w-3 text-pink-600" />
                    <span>Booleano</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-amber-600" />
                    <span>Fixa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-green-600" />
                    <span>Global</span>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
