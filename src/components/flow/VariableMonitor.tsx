import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, Type, Hash, Calendar, List, ToggleLeft, Lock, Globe, User } from "lucide-react";
import { FlowVariable } from "./VariableManager";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VariableMonitorProps {
  variables: FlowVariable[];
  context: Record<string, any>;
}

const variableTypeIcons = {
  text: Type,
  number: Hash,
  date: Calendar,
  array: List,
  boolean: ToggleLeft,
};

const variableTypeColors = {
  text: "text-blue-600",
  number: "text-green-600",
  date: "text-purple-600",
  array: "text-orange-600",
  boolean: "text-pink-600",
};

export function VariableMonitor({ variables, context }: VariableMonitorProps) {
  const formatValue = (value: any, variable: FlowVariable): string => {
    // Se não houver valor no contexto e a variável tiver valor padrão, usa o padrão
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
    return "text-slate-900";
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900"
          title="Monitor de variáveis"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:w-[700px] bg-white border-slate-200">
        <SheetHeader>
          <SheetTitle className="text-slate-900 flex items-center gap-2">
            <Eye className="h-5 w-5 text-blue-600" />
            Monitor de Variáveis
          </SheetTitle>
          <SheetDescription className="text-slate-600">
            Acompanhe os valores das variáveis durante a simulação do fluxo em tempo real.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {variables.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <Eye className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">Nenhuma variável para monitorar</p>
              <p className="text-sm text-slate-500 mt-1">Crie variáveis no gerenciador de variáveis</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200 hover:bg-slate-50">
                      <TableHead className="text-slate-700 font-semibold w-[40%]">Variável</TableHead>
                      <TableHead className="text-slate-700 font-semibold w-[20%]">Tipo</TableHead>
                      <TableHead className="text-slate-700 font-semibold w-[40%]">Valor Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variables.map((variable) => {
                      const Icon = variableTypeIcons[variable.type];
                      const typeColor = variableTypeColors[variable.type];
                      // Normaliza o nome da variável removendo chaves duplas para buscar no contexto
                      const cleanVarName = variable.name.replace(/^\{\{|\}\}$/g, '');
                      const currentValue = context[cleanVarName];
                      const hasValue = currentValue !== undefined && currentValue !== null;
                      
                      return (
                        <TableRow 
                          key={variable.id} 
                          className="border-slate-200 hover:bg-slate-50"
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${typeColor}`} />
                              <span className="font-mono text-sm text-slate-900">
                                {variable.name}
                              </span>
                              {variable.scope === "global" && (
                                <span title="Variável global">
                                  <Globe className="h-3 w-3 text-green-600" />
                                </span>
                              )}
                              {variable.isConstant && (
                                <span title="Variável fixa">
                                  <Lock className="h-3 w-3 text-amber-600" />
                                </span>
                              )}
                            </div>
                            {variable.description && (
                              <p className="text-xs text-slate-500 ml-6 mt-0.5">
                                {variable.description}
                              </p>
                            )}
                            {variable.isConstant && variable.defaultValue !== undefined && (
                              <p className="text-xs text-amber-600 ml-6 mt-0.5">
                                Padrão: {typeof variable.defaultValue === "object" 
                                  ? JSON.stringify(variable.defaultValue) 
                                  : String(variable.defaultValue)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant="outline" 
                              className={`${typeColor} border-slate-300 bg-slate-50`}
                            >
                              {variable.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <code 
                                className={`text-sm font-mono ${getValueColor(currentValue !== undefined ? currentValue : variable.defaultValue)} bg-slate-50 px-2 py-1 rounded border border-slate-200`}
                              >
                                {formatValue(currentValue, variable)}
                              </code>
                              {hasValue && (
                                <Badge 
                                  variant="outline" 
                                  className="text-green-700 border-green-300 bg-green-50"
                                >
                                  ✓
                                </Badge>
                              )}
                              {!hasValue && variable.defaultValue !== undefined && (
                                <Badge 
                                  variant="outline" 
                                  className="text-amber-700 border-amber-300 bg-amber-50 text-xs"
                                >
                                  padrão
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Legenda */}
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-xs font-semibold text-slate-700 mb-2">Legenda:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Type className="h-3 w-3 text-blue-600" />
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
