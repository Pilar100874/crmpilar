import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Type, Hash, Calendar, List as ListIcon, ToggleLeft, Lock, Unlock, Trash2, Plus } from "lucide-react";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { useLayout } from "@/contexts/LayoutContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

type VariableType = "text" | "number" | "date" | "array" | "boolean";

interface GlobalVariable {
  id: string;
  name: string;
  type: VariableType;
  description?: string;
  isConstant?: boolean;
  defaultValue?: any;
  created_at?: string;
  updated_at?: string;
}

const variableTypeIcons = {
  text: Type,
  number: Hash,
  date: Calendar,
  array: ListIcon,
  boolean: ToggleLeft,
};

const variableTypeLabels = {
  text: "Texto",
  number: "Número",
  date: "Data",
  array: "Coleção (Array)",
  boolean: "Booleano",
};

export default function GlobalVariables() {
  const { openSubmenu } = useLayout();
  const [variables, setVariables] = useState<GlobalVariable[]>([]);
  const [loadingVariables, setLoadingVariables] = useState(true);
  const [newVarName, setNewVarName] = useState("");
  const [newVarType, setNewVarType] = useState<VariableType>("text");
  const [newVarDescription, setNewVarDescription] = useState("");
  const [newVarIsConstant, setNewVarIsConstant] = useState(false);
  const [newVarDefaultValue, setNewVarDefaultValue] = useState("");

  useEffect(() => {
    loadGlobalVariables();
  }, []);

  const loadGlobalVariables = async () => {
    try {
      const { data, error } = await supabase
        .from("global_variables")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVariables((data || []).map(v => ({
        ...v,
        type: v.type as VariableType,
        isConstant: v.is_constant,
        defaultValue: v.default_value,
      })));
    } catch (error) {
      console.error("Error loading global variables:", error);
      toast.error("Erro ao carregar variáveis globais");
    } finally {
      setLoadingVariables(false);
    }
  };

  const handleAddVariable = async () => {
    if (!newVarName.trim()) {
      toast.error("Digite um nome para a variável");
      return;
    }

    const validName = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (!validName.test(newVarName)) {
      toast.error("Nome inválido. Use apenas letras, números e underscore (_)");
      return;
    }

    if (variables.some(v => v.name === newVarName)) {
      toast.error("Já existe uma variável global com este nome");
      return;
    }

    if (newVarIsConstant && !newVarDefaultValue.trim()) {
      toast.error("Variáveis fixas precisam de um valor inicial");
      return;
    }

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

    try {
      const { data, error } = await supabase
        .from("global_variables")
        .insert([
          {
            name: newVarName,
            type: newVarType,
            description: newVarDescription.trim() || null,
            is_constant: newVarIsConstant,
            default_value: processedDefaultValue,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      const mappedData: GlobalVariable = {
        id: data.id,
        name: data.name,
        type: data.type as VariableType,
        description: data.description || undefined,
        isConstant: data.is_constant || undefined,
        defaultValue: data.default_value,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      setVariables([mappedData, ...variables]);
      setNewVarName("");
      setNewVarDescription("");
      setNewVarType("text");
      setNewVarIsConstant(false);
      setNewVarDefaultValue("");
      toast.success(`Variável global "${newVarName}" criada!`);
    } catch (error) {
      console.error("Error creating variable:", error);
      toast.error("Erro ao criar variável global");
    }
  };

  const handleDeleteVariable = async (id: string) => {
    const variable = variables.find(v => v.id === id);
    if (!variable) return;

    if (!confirm(`Tem certeza que deseja excluir a variável global "${variable.name}"?\n\nEsta ação pode afetar todos os bots que usam esta variável.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("global_variables")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setVariables(variables.filter(v => v.id !== id));
      toast.success(`Variável "${variable.name}" excluída!`);
    } catch (error) {
      console.error("Error deleting variable:", error);
      toast.error("Erro ao excluir variável");
    }
  };
  
  return (
    <div className="p-8 bg-background dark:bg-background min-h-full">
      <div className="flex items-center gap-4 mb-8">
        <SubMenuHeader 
          title="Configurações"
          onOpenSubmenu={() => openSubmenu("Configurações")}
        />
        <h1 className="text-lg font-bold text-foreground">Variáveis Globais</h1>
      </div>
      
      <p className="text-muted-foreground mb-8">
        Variáveis compartilhadas entre todos os bots
      </p>
      
      <div className="space-y-6 max-w-4xl">
        {/* Formulário para adicionar nova variável */}
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Nova Variável Global</CardTitle>
            <CardDescription>
              Variáveis globais estarão disponíveis em todos os bots do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="var-name">Nome da Variável</Label>
                <Input
                  id="var-name"
                  value={newVarName}
                  onChange={(e) => setNewVarName(e.target.value)}
                  placeholder="ex: empresa_nome"
                  className="mt-1"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddVariable();
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">Use apenas letras, números e underscore (_)</p>
              </div>

              <div>
                <Label htmlFor="var-type">Tipo</Label>
                <Select value={newVarType} onValueChange={(value) => setNewVarType(value as VariableType)}>
                  <SelectTrigger id="var-type" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(variableTypeLabels).map(([value, label]) => {
                      const Icon = variableTypeIcons[value as VariableType];
                      return (
                        <SelectItem key={value} value={value}>
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
            </div>

            <div>
              <Label htmlFor="var-description">Descrição (opcional)</Label>
              <Input
                id="var-description"
                value={newVarDescription}
                onChange={(e) => setNewVarDescription(e.target.value)}
                placeholder="ex: Nome da empresa para usar em mensagens"
                className="mt-1"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                {newVarIsConstant ? (
                  <Lock className="h-4 w-4 text-amber-500" />
                ) : (
                  <Unlock className="h-4 w-4 text-muted-foreground" />
                )}
                <div>
                  <Label htmlFor="var-constant" className="cursor-pointer">
                    Variável Fixa (Constante)
                  </Label>
                  <p className="text-xs text-muted-foreground">
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

            {newVarIsConstant && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <Label htmlFor="var-default" className="flex items-center gap-2">
                  <span className="text-amber-600">*</span> Valor Inicial (obrigatório)
                </Label>
                <Input
                  id="var-default"
                  value={newVarDefaultValue}
                  onChange={(e) => setNewVarDefaultValue(e.target.value)}
                  placeholder={
                    newVarType === "text" ? "ex: Minha Empresa" :
                    newVarType === "number" ? "ex: 42" :
                    newVarType === "boolean" ? "true ou false" :
                    newVarType === "array" ? '["item1", "item2"]' :
                    "ex: 2024-01-01"
                  }
                  className="mt-2"
                />
              </div>
            )}

            <Button
              onClick={handleAddVariable}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Variável Global
            </Button>
          </CardContent>
        </Card>

        {/* Lista de variáveis globais */}
        <Card>
          <CardHeader>
            <CardTitle>
              Variáveis Globais Existentes ({variables.length})
            </CardTitle>
            <CardDescription>
              Estas variáveis estão disponíveis em todos os bots
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingVariables ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : variables.length === 0 ? (
              <div className="bg-muted/50 border rounded-lg p-8 text-center">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma variável global criada ainda</p>
                <p className="text-sm text-muted-foreground mt-1">Crie variáveis para compartilhar dados entre bots</p>
              </div>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-2">
                  {variables.map((variable) => {
                    const Icon = variableTypeIcons[variable.type];
                    return (
                      <div
                        key={variable.id}
                        className="bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Icon className="h-4 w-4 text-green-600" />
                              <span className="font-mono text-sm font-semibold text-foreground">
                                {`{{${variable.name}}}`}
                              </span>
                              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                {variableTypeLabels[variable.type]}
                              </span>
                              <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <Globe className="h-3 w-3" />
                                Global
                              </span>
                              {variable.isConstant && (
                                <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                                  <Lock className="h-3 w-3" />
                                  Fixa
                                </span>
                              )}
                            </div>
                            {variable.description && (
                              <p className="text-xs text-muted-foreground mt-1 ml-6">{variable.description}</p>
                            )}
                            {variable.isConstant && variable.defaultValue !== undefined && (
                              <div className="text-xs text-amber-700 mt-1 ml-6 flex items-center gap-1">
                                <span className="font-semibold">Valor:</span>
                                <code className="bg-amber-50 px-1 py-0.5 rounded">
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
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
