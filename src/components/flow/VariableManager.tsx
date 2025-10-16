import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, Variable, Type, Hash, Calendar, List, ToggleLeft } from "lucide-react";
import { toast } from "sonner";

export type VariableType = "text" | "number" | "date" | "array" | "boolean";

export interface FlowVariable {
  id: string;
  name: string;
  type: VariableType;
  description?: string;
}

interface VariableManagerProps {
  variables: FlowVariable[];
  onVariablesChange: (variables: FlowVariable[]) => void;
}

const variableTypeIcons = {
  text: Type,
  number: Hash,
  date: Calendar,
  array: List,
  boolean: ToggleLeft,
};

const variableTypeLabels = {
  text: "Texto",
  number: "Número",
  date: "Data",
  array: "Coleção (Array)",
  boolean: "Booleano",
};

export function VariableManager({ variables, onVariablesChange }: VariableManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState<VariableType>("text");
  const [newVarDescription, setNewVarDescription] = useState("");

  const handleAddVariable = () => {
    if (!newVarName.trim()) {
      toast.error("Digite um nome para a variável");
      return;
    }

    // Validar nome da variável (sem espaços, apenas letras, números e underscore)
    const validName = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validName.test(newVarName)) {
      toast.error("Nome inválido. Use apenas letras, números e underscore (_)");
      return;
    }

    // Verificar se já existe
    if (variables.some(v => v.name === newVarName)) {
      toast.error("Já existe uma variável com este nome");
      return;
    }

    const newVariable: FlowVariable = {
      id: `var_${Date.now()}`,
      name: newVarName,
      type: newVarType,
      description: newVarDescription.trim() || undefined,
    };

    onVariablesChange([...variables, newVariable]);
    setNewVarName("");
    setNewVarDescription("");
    setNewVarType("text");
    toast.success(`Variável "${newVarName}" criada!`);
  };

  const handleDeleteVariable = (id: string) => {
    const variable = variables.find(v => v.id === id);
    if (!variable) return;

    if (!confirm(`Tem certeza que deseja excluir a variável "${variable.name}"?`)) return;

    onVariablesChange(variables.filter(v => v.id !== id));
    toast.success(`Variável "${variable.name}" excluída!`);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white"
          title="Gerenciar variáveis"
        >
          <Variable className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:w-[600px] bg-slate-900 border-slate-700">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Variable className="h-5 w-5 text-cyan-500" />
            Gerenciar Variáveis
          </SheetTitle>
          <SheetDescription className="text-slate-400">
            Crie e gerencie as variáveis do seu fluxo. Elas podem ser usadas para armazenar dados coletados.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Adicionar nova variável */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-white">Adicionar Nova Variável</h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="var-name" className="text-slate-300">Nome da Variável</Label>
                <Input
                  id="var-name"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  placeholder="ex: nome_cliente"
                  className="mt-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddVariable();
                  }}
                />
                <p className="text-xs text-slate-500 mt-1">Use apenas letras, números e underscore (_)</p>
              </div>

              <div>
                <Label htmlFor="var-type" className="text-slate-300">Tipo</Label>
                <Select value={newVarType} onValueChange={(value) => setNewVarType(value as VariableType)}>
                  <SelectTrigger id="var-type" className="mt-1 bg-slate-800 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {Object.entries(variableTypeLabels).map(([value, label]) => {
                      const Icon = variableTypeIcons[value as VariableType];
                      return (
                        <SelectItem key={value} value={value} className="text-white">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="var-description" className="text-slate-300">Descrição (opcional)</Label>
                <Input
                  id="var-description"
                  value={newVarDescription}
                  onChange={(e) => setNewVarDescription(e.target.value)}
                  placeholder="ex: Nome completo do cliente"
                  className="mt-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>

              <Button
                onClick={handleAddVariable}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Variável
              </Button>
            </div>
          </div>

          {/* Lista de variáveis */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-white">Variáveis Existentes ({variables.length})</h3>
            
            {variables.length === 0 ? (
              <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-8 text-center">
                <Variable className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">Nenhuma variável criada ainda</p>
                <p className="text-sm text-slate-500 mt-1">Adicione variáveis para armazenar dados</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {variables.map((variable) => {
                    const Icon = variableTypeIcons[variable.type];
                    return (
                      <div
                        key={variable.id}
                        className="bg-slate-800/70 border border-slate-700 rounded-lg p-3 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-cyan-500" />
                              <span className="font-mono text-sm font-semibold text-white">
                                {`{{${variable.name}}}`}
                              </span>
                              <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                                {variableTypeLabels[variable.type]}
                              </span>
                            </div>
                            {variable.description && (
                              <p className="text-xs text-slate-400 mt-1 ml-6">{variable.description}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteVariable(variable.id)}
                            className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
