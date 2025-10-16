import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Type, Hash, Calendar, List, ToggleLeft, Lock, Database, Globe, User } from "lucide-react";
import { FlowVariable } from "./VariableManager";

interface BlockVariablesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockLabel: string;
  availableVariables: FlowVariable[];
  currentContext: Record<string, any>;
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

export function BlockVariablesDialog({
  open,
  onOpenChange,
  blockLabel,
  availableVariables,
  currentContext,
}: BlockVariablesDialogProps) {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-cyan-500" />
            Variáveis Disponíveis
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Variáveis acessíveis no bloco: <span className="font-semibold text-white">{blockLabel}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {availableVariables.length === 0 ? (
            <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 text-center">
              <Database className="h-12 w-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Nenhuma variável disponível</p>
              <p className="text-sm text-slate-500 mt-1">
                Variáveis criadas antes deste bloco aparecerão aqui
              </p>
            </div>
          ) : (
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
                    const currentValue = currentContext[cleanVarName];
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
          )}

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
      </DialogContent>
    </Dialog>
  );
}
