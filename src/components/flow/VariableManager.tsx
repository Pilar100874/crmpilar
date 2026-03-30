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
import { Plus, Trash2, Variable, Type, Hash, Calendar, List, ToggleLeft, Lock, Unlock, Globe, User } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast-config";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

export type VariableType = "text" | "number" | "date" | "array" | "boolean";

export interface FlowVariable {
  id: string;
  name: string;
  type: VariableType;
  description?: string;
  isConstant?: boolean; // Se true, o valor não deve mudar após ser definido
  defaultValue?: any; // Valor inicial (obrigatório se isConstant for true)
  scope?: "local" | "global"; // local = apenas neste bot, global = todos os bots
}

interface VariableManagerProps {
  variables: FlowVariable[];
  onVariablesChange: (variables: FlowVariable[]) => void;
  globalVariables?: FlowVariable[];
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

export function VariableManager({ variables, onVariablesChange, globalVariables = [] }: VariableManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState<VariableType>("text");
  const [newVarDescription, setNewVarDescription] = useState("");
  const [newVarIsConstant, setNewVarIsConstant] = useState(false);
  const [newVarDefaultValue, setNewVarDefaultValue] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [variableToDelete, setVariableToDelete] = useState<FlowVariable | null>(null);

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

    // Verificar se já existe uma variável local com este nome
    if (variables.some(v => v.name === newVarName)) {
      toast.error("Já existe uma variável local com este nome");
      return;
    }

    // Verificar se já existe uma variável global com este nome
    if (globalVariables.some(v => v.name === newVarName)) {
      toast.error("Já existe uma variável global com este nome. Use outro nome para a variável local.");
      return;
    }

    // Se for constante, o valor inicial é obrigatório
    if (newVarIsConstant && !newVarDefaultValue.trim()) {
      toast.error("Variáveis fixas precisam de um valor inicial");
      return;
    }

    // Processar o valor padrão de acordo com o tipo
    let processedDefaultValue: any = undefined;
    if (newVarIsConstant && newVarDefaultValue.trim()) {
      switch (newVarType) {
        case "number":
          processedDefaultValue = Number(newVarDefaultValue);
          if (isNaN(processedDefaultValue)) {
            toast.error("Valor inválido para tipo número");
            return;
          }
          break;
        case "boolean":
          processedDefaultValue = newVarDefaultValue.toLowerCase() === "true";
          break;
        case "array":
          try {
            processedDefaultValue = JSON.parse(newVarDefaultValue);
            if (!Array.isArray(processedDefaultValue)) {
              toast.error("Valor deve ser um array válido (ex: [1, 2, 3])");
              return;
            }
          } catch {
            toast.error("Valor inválido para array. Use formato JSON (ex: [1, 2, 3])");
            return;
          }
          break;
        default:
          processedDefaultValue = newVarDefaultValue.trim();
      }
    }

    const newVariable: FlowVariable = {
      id: `var_${Date.now()}`,
      name: newVarName,
      type: newVarType,
      description: newVarDescription.trim() || undefined,
      isConstant: newVarIsConstant,
      defaultValue: processedDefaultValue,
      scope: "local", // Sempre local no gerenciador de bots
    };

    onVariablesChange([...variables, newVariable]);
    setNewVarName("");
    setNewVarDescription("");
    setNewVarType("text");
    setNewVarIsConstant(false);
    setNewVarDefaultValue("");
    toast.success(`Variável local "${newVarName}" criada!`);
  };

  const handleDeleteVariable = (id: string) => {
    const variable = variables.find(v => v.id === id);
    if (!variable) return;

    setVariableToDelete(variable);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteVariable = () => {
    if (!variableToDelete) return;

    onVariablesChange(variables.filter(v => v.id !== variableToDelete.id));
    toast.success(`Variável "${variableToDelete.name}" excluída!`);
    setDeleteConfirmOpen(false);
    setVariableToDelete(null);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 bg-white border-border text-foreground/80 hover:bg-muted hover:text-foreground"
          title="Gerenciar variáveis"
        >
          <Variable className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:w-[600px] bg-white border-border">
        <SheetHeader>
          <SheetTitle className="text-foreground flex items-center gap-2">
            <Variable className="h-5 w-5 text-primary" />
            Gerenciar Variáveis Locais
          </SheetTitle>
          <SheetDescription className="text-foreground/70">
            Crie e gerencie variáveis locais do seu bot. Para variáveis compartilhadas entre bots, use o menu "Variáveis Globais".
          </SheetDescription>
        </SheetHeader>

        {/* Aviso sobre variáveis globais disponíveis */}
        {globalVariables.length > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-green-600" />
              <span className="text-sm font-semibold text-green-700">
                {globalVariables.length} variável{globalVariables.length > 1 ? 'is' : ''} global{globalVariables.length > 1 ? 'is' : ''} disponível{globalVariables.length > 1 ? 'is' : ''}
              </span>
            </div>
            <p className="text-xs text-foreground/70">
              Variáveis globais estão automaticamente disponíveis em todos os bots:
            </p>
            <div className="mt-2 flex flex-wrap gap-1">
              {globalVariables.map(gv => (
                <span key={gv.id} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded border border-green-200">
                  {`{{${gv.name}}}`}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {/* Adicionar nova variável */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Adicionar Nova Variável Local</h3>
            <p className="text-xs text-foreground/70 -mt-2">Disponível apenas neste bot</p>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="var-name" className="text-foreground/80 font-medium">Nome da Variável</Label>
                <Input
                  id="var-name"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  placeholder="ex: nome_cliente"
                  className="mt-1 bg-white border-border text-foreground placeholder:text-muted-foreground"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddVariable();
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">Use apenas letras, números e underscore (_)</p>
              </div>

              <div>
                <Label htmlFor="var-type" className="text-foreground/80 font-medium">Tipo</Label>
                <Select value={newVarType} onValueChange={(value) => setNewVarType(value as VariableType)}>
                  <SelectTrigger id="var-type" className="mt-1 bg-white border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-border">
                    {Object.entries(variableTypeLabels).map(([value, label]) => {
                      const Icon = variableTypeIcons[value as VariableType];
                      return (
                        <SelectItem key={value} value={value} className="text-foreground">
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
                <Label htmlFor="var-description" className="text-foreground/80 font-medium">Descrição (opcional)</Label>
                <Input
                  id="var-description"
                  value={newVarDescription}
                  onChange={(e) => setNewVarDescription(e.target.value)}
                  placeholder="ex: Nome completo do cliente"
                  className="mt-1 bg-white border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-white border border-border rounded-lg">
                <div className="flex items-center gap-2">
                  {newVarIsConstant ? (
                    <Lock className="h-4 w-4 text-amber-600" />
                  ) : (
                    <Unlock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <Label htmlFor="var-constant" className="text-foreground/80 cursor-pointer font-medium">
                      Variável Fixa (Constante)
                    </Label>
                    <p className="text-xs text-foreground/70">
                      {newVarIsConstant 
                        ? "Valor não pode ser alterado após definido"
                        : "Valor pode ser alterado durante o fluxo"}
                    </p>
                  </div>
                </div>
                <Switch
                  id="var-constant"
                  checked={newVarIsConstant}
                  onCheckedChange={setNewVarIsConstant}
                />
              </div>

              {/* Campo de valor inicial (obrigatório se for constante) */}
              {newVarIsConstant && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                  <Label htmlFor="var-default" className="text-foreground/80 font-medium flex items-center gap-2">
                    <span className="text-amber-600">*</span> Valor Inicial (obrigatório)
                  </Label>
                  <Input
                    id="var-default"
                    value={newVarDefaultValue}
                    onChange={(e) => setNewVarDefaultValue(e.target.value)}
                    placeholder={
                      newVarType === "text" ? "ex: João Silva" :
                      newVarType === "number" ? "ex: 42" :
                      newVarType === "boolean" ? "true ou false" :
                      newVarType === "array" ? 'ex: ["item1", "item2"]' :
                      "ex: 2024-01-01"
                    }
                    className="mt-2 bg-white border-amber-300 text-foreground placeholder:text-muted-foreground"
                  />
                  <p className="text-xs text-foreground/70 mt-1">
                    {newVarType === "number" && "Digite um número válido"}
                    {newVarType === "boolean" && "Digite 'true' ou 'false'"}
                    {newVarType === "array" && "Digite um array JSON válido"}
                    {newVarType === "date" && "Digite uma data válida"}
                    {newVarType === "text" && "Digite o valor inicial do texto"}
                  </p>
                </div>
              )}

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
            <h3 className="text-sm font-semibold text-foreground">Variáveis Locais Existentes ({variables.length})</h3>
            
            {variables.length === 0 ? (
              <div className="bg-muted border border-border rounded-lg p-8 text-center">
                <Variable className="h-12 w-12 text-muted-foreground/60 mx-auto mb-3" />
                <p className="text-foreground/70">Nenhuma variável criada ainda</p>
                <p className="text-sm text-muted-foreground mt-1">Adicione variáveis para armazenar dados</p>
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {variables.map((variable) => {
                    const Icon = variableTypeIcons[variable.type];
                    return (
                      <div
                        key={variable.id}
                        className="bg-gradient-to-r from-primary/5 to-white border border-primary/20 rounded-lg p-3 hover:border-primary/30 transition-all hover:shadow-sm"
                      >
                      <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="font-mono text-sm font-semibold text-foreground break-all">
                                {`{{${variable.name}}}`}
                              </span>
                              <span className="text-xs text-foreground/80 bg-muted px-2 py-0.5 rounded border border-border flex-shrink-0">
                                {variableTypeLabels[variable.type]}
                              </span>
                              {variable.scope === "global" && (
                                <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1 border border-green-200 flex-shrink-0">
                                  <Globe className="h-3 w-3" />
                                  Global
                                </span>
                              )}
                              {variable.scope === "local" && (
                                <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1 border border-primary/20 flex-shrink-0">
                                  <User className="h-3 w-3" />
                                  Local
                                </span>
                              )}
                              {variable.isConstant && (
                                <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1 border border-amber-200 flex-shrink-0">
                                  <Lock className="h-3 w-3" />
                                  Fixa
                                </span>
                              )}
                            </div>
                            {variable.description && (
                              <p className="text-xs text-foreground/70 mt-1 ml-6 break-words">{variable.description}</p>
                            )}
                            {variable.isConstant && variable.defaultValue !== undefined && (
                              <div className="text-xs text-amber-700 mt-1 ml-6 flex items-start gap-1">
                                <span className="font-semibold flex-shrink-0">Valor:</span>
                                <code className="bg-amber-100 px-1 py-0.5 rounded border border-amber-200 break-all">
                                  {typeof variable.defaultValue === "object" 
                                    ? JSON.stringify(variable.defaultValue) 
                                    : String(variable.defaultValue)}
                                </code>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteVariable(variable.id)}
                            className="h-8 w-8 text-foreground/70 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
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

      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDeleteVariable}
        title="Confirmar exclusão"
        itemName={variableToDelete?.name}
      />
    </Sheet>
  );
}
