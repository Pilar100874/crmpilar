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
import { Eye, Type, Hash, Calendar, List, ToggleLeft, Lock } from "lucide-react";
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
  text: "text-blue-400",
  number: "text-green-400",
  date: "text-purple-400",
  array: "text-orange-400",
  boolean: "text-pink-400",
};

export function VariableMonitor({ variables, context }: VariableMonitorProps) {
  const formatValue = (value: any, type: string): string => {
    if (value === undefined || value === null) return "-";
    
    if (type === "array") {
      try {
        return Array.isArray(value) ? `[${value.length} itens]` : JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    
    if (type === "boolean") {
      return value ? "Verdadeiro" : "Falso";
    }
    
    if (type === "date") {
      try {
        return new Date(value).toLocaleString("pt-BR");
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  };

  const getValueColor = (value: any): string => {
    if (value === undefined || value === null) return "text-slate-500";
    return "text-white";
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
          title="Monitor de variáveis"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:w-[700px] bg-slate-900 border-slate-700">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Eye className="h-5 w-5 text-cyan-500" />
            Monitor de Variáveis
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Acompanhe os valores das variáveis durante a simulação do fluxo em tempo real.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {variables.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 text-center">
              <Eye className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma variável para monitorar</p>
              <p className="text-sm text-slate-500 mt-1">Crie variáveis no gerenciador de variáveis</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700 hover:bg-slate-800/70">
                      <TableHead className="text-slate-300 font-semibold w-[40%]">Variável</TableHead>
                      <TableHead className="text-slate-300 font-semibold w-[20%]">Tipo</TableHead>
                      <TableHead className="text-slate-300 font-semibold w-[40%]">Valor Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variables.map((variable) => {
                      const Icon = variableTypeIcons[variable.type];
                      const typeColor = variableTypeColors[variable.type];
                      const currentValue = context[variable.name];
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
                            <div className="flex items-center gap-2">
                              <code 
                                className={`text-sm font-mono ${getValueColor(currentValue)} bg-slate-800 px-2 py-1 rounded border border-slate-700`}
                              >
                                {formatValue(currentValue, variable.type)}
                              </code>
                              {hasValue && (
                                <Badge 
                                  variant="outline" 
                                  className="text-green-400 border-green-600/50 bg-green-900/20"
                                >
                                  ✓
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
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
