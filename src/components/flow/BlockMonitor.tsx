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
  text: "text-blue-400",
  number: "text-green-400",
  date: "text-purple-400",
  array: "text-orange-400",
  boolean: "text-pink-400",
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
    return "text-white";
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
          className="h-9 w-9 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
          title="Monitor do bloco selecionado"
          disabled={!selectedNode}
        >
          <Box className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:w-[700px] bg-slate-900 border-slate-700">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-cyan-500" />
            Monitor do Bloco
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Variáveis acessíveis no bloco: <span className="font-semibold text-white">{blockLabel}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {availableVariables.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 text-center">
              <Database className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma variável disponível</p>
              <p className="text-sm text-slate-500 mt-1">
                {selectedNode 
                  ? "Variáveis criadas antes deste bloco aparecerão aqui"
                  : "Selecione um bloco para ver as variáveis disponíveis"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-800/70">
                      <TableHead className="text-slate-300 font-semibold w-[35%]">Variável</TableHead>
                      <TableHead className="text-slate-300 font-semibold w-[15%]">Tipo</TableHead>
                      <TableHead className="text-slate-300 font-semibold w-[35%]">Valor Atual</TableHead>
                      <TableHead className="text-slate-300 font-semibold w-[15%]">Status</TableHead>
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
                          className="border-slate-700 hover:bg-slate-800/70"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${typeColor}`} />
                              <span className="font-mono text-sm text-white">
                                {variable.name}
                              </span>
                              {variable.scope === "global" && (
                                <span title="Variável global">
                                  <Globe className="h-3 w-3 text-green-500" />
                                </span>
                              )}
                              {variable.isConstant && (
                                <span title="Variável fixa">
                                  <Lock className="h-3 w-3 text-amber-500" />
                                </span>
                              )}
                            </div>
                            {variable.description && (
                              <p className="text-xs text-slate-500 ml-6 mt-0.5">
                                {variable.description}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`${typeColor} border-slate-600 bg-slate-800/50`}
                            >
                              {variable.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <code 
                              className={`text-sm font-mono ${getValueColor(currentValue !== undefined ? currentValue : variable.defaultValue)} bg-slate-800 px-2 py-1 rounded border border-slate-700`}
                            >
                              {formatValue(currentValue, variable)}
                            </code>
                          </TableCell>
                          <TableCell>
                            {hasValue ? (
                              <Badge 
                                variant="outline" 
                                className="text-green-400 border-green-600/50 bg-green-900/20"
                              >
                                ✓ Definido
                              </Badge>
                            ) : variable.defaultValue !== undefined ? (
                              <Badge 
                                variant="outline" 
                                className="text-amber-400 border-amber-600/50 bg-amber-900/20 text-xs"
                              >
                                Padrão
                              </Badge>
                            ) : (
                              <Badge 
                                variant="outline" 
                                className="text-slate-500 border-slate-600/50 bg-slate-800/20 text-xs"
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
              <div className="mt-4 p-3 bg-slate-800/30 border border-slate-700 rounded-lg">
                <p className="text-xs font-semibold text-slate-300 mb-2">Legenda:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Type className="h-3 w-3 text-blue-400" />
                    <span>Texto</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Hash className="h-3 w-3 text-green-400" />
                    <span>Número</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3 text-purple-400" />
                    <span>Data</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <List className="h-3 w-3 text-orange-400" />
                    <span>Array</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ToggleLeft className="h-3 w-3 text-pink-400" />
                    <span>Booleano</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Lock className="h-3 w-3 text-amber-500" />
                    <span>Fixa</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="h-3 w-3 text-green-500" />
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
