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
  text: "text-primary",
  number: "text-green-600",
  date: "text-purple-600",
  array: "text-orange-600",
  boolean: "text-pink-600",
};

export function VariableMonitor({ variables, context }: VariableMonitorProps) {
  const formatValue = (value: any, type?: string): string => {
    if (value === undefined || value === null) return "-";
    
    if (type === "array" || Array.isArray(value)) {
      try {
        return Array.isArray(value) ? `[${value.length} itens]` : JSON.stringify(value);
      } catch {
        return String(value);
      }
    }
    
    if (type === "boolean" || typeof value === "boolean") {
      return value ? "Verdadeiro" : "Falso";
    }
    
    if (type === "date" || value instanceof Date) {
      try {
        return new Date(value).toLocaleString("pt-BR");
      } catch {
        return String(value);
      }
    }
    
    return String(value);
  };

  const getValueColor = (value: any): string => {
    if (value === undefined || value === null) return "text-muted-foreground";
    return "text-foreground";
  };

  const inferType = (value: any): string => {
    if (value === null || value === undefined) return "text";
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (value instanceof Date) return "date";
    if (Array.isArray(value)) return "array";
    return "text";
  };

  // Criar uma lista combinada de variáveis (definidas + contexto)
  const allVariables: Array<FlowVariable & { fromContext?: boolean }> = [...variables];
  
  // Adicionar variáveis do contexto que não estão na lista de variáveis definidas
  Object.keys(context).forEach(key => {
    const exists = variables.some(v => {
      const cleanName = v.name.replace(/^\{\{|\}\}$/g, '');
      return cleanName === key;
    });
    
    if (!exists) {
      const value = context[key];
      allVariables.push({
        id: `context_${key}`,
        name: key,
        type: inferType(value),
        scope: "local",
        description: "Variável criada pelo fluxo",
        fromContext: true,
      } as FlowVariable & { fromContext?: boolean });
    }
  });

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-white border-border text-foreground/80 hover:bg-muted hover:text-foreground"
          title="Monitor de variáveis"
        >
          <Eye className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[600px] sm:w-[700px] bg-white border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Monitor de Variáveis
          </SheetTitle>
          <SheetDescription className="text-foreground/70">
            Acompanhe os valores das variáveis durante a simulação do fluxo em tempo real.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {allVariables.length === 0 ? (
            <div className="bg-muted border border-border rounded-lg p-8 text-center">
              <Eye className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
              <p className="text-foreground/70">Nenhuma variável para monitorar</p>
              <p className="text-sm text-muted-foreground mt-1">Execute o simulador para ver as variáveis</p>
            </div>
          ) : (
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="bg-white border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted bg-primary/5">
                      <TableHead className="text-foreground font-bold">Variável</TableHead>
                      <TableHead className="text-foreground font-bold w-[100px]">Tipo</TableHead>
                      <TableHead className="text-foreground font-bold">Valor Atual</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allVariables.map((variable) => {
                      const Icon = variableTypeIcons[variable.type];
                      const typeColor = variableTypeColors[variable.type];
                      // Normaliza o nome da variável removendo chaves duplas para buscar no contexto
                      const cleanVarName = variable.name.replace(/^\{\{|\}\}$/g, '');
                      const currentValue = context[cleanVarName];
                      const hasValue = currentValue !== undefined && currentValue !== null;
                      
                      return (
                        <TableRow 
                          key={variable.id} 
                          className="border-border hover:bg-blue-50/30"
                        >
                          <TableCell className="align-top">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <Icon className={`h-4 w-4 ${typeColor} flex-shrink-0`} />
                              <span className="font-mono text-sm text-foreground break-all">
                                {variable.name}
                              </span>
                              {variable.fromContext && (
                                <span title="Variável do fluxo" className="flex-shrink-0">
                                  <User className="h-3 w-3 text-blue-600" />
                                </span>
                              )}
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
                              <p className="text-xs text-muted-foreground ml-6 mt-0.5 break-words">
                                {variable.description}
                              </p>
                            )}
                            {variable.isConstant && variable.defaultValue !== undefined && (
                              <p className="text-xs text-amber-600 ml-6 mt-0.5 break-all">
                                Padrão: {typeof variable.defaultValue === "object" 
                                  ? JSON.stringify(variable.defaultValue) 
                                  : String(variable.defaultValue)}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge 
                              variant="outline" 
                              className={`${typeColor} border-border bg-muted whitespace-nowrap`}
                            >
                              {variable.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex items-start gap-2 flex-wrap">
                              <code 
                                className={`text-sm font-mono ${getValueColor(currentValue !== undefined ? currentValue : (variable as any).defaultValue)} bg-muted px-2 py-1 rounded border border-border break-all max-w-full`}
                              >
                                {formatValue(currentValue, variable.type)}
                              </code>
                              {hasValue && (
                                <Badge 
                                  variant="outline" 
                                  className="text-green-700 border-green-300 bg-green-50 whitespace-nowrap flex-shrink-0"
                                >
                                  ✓
                                </Badge>
                              )}
                              {!hasValue && (variable as any).defaultValue !== undefined && (
                                <Badge 
                                  variant="outline" 
                                  className="text-amber-700 border-amber-300 bg-amber-50 text-xs whitespace-nowrap flex-shrink-0"
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
              <div className="mt-4 p-3 bg-muted border border-border rounded-lg">
                <p className="text-xs font-semibold text-foreground/80 mb-2">Legenda:</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-foreground/70">
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
                    <User className="h-3 w-3 text-blue-600" />
                    <span>Do Fluxo</span>
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
