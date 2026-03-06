import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/toast-config";

interface VariableSequenceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (variables: Record<string, string>) => void;
  botVariables?: Record<string, any>;
}

interface Variable {
  id: string;
  key: string;
  value: string;
}

export default function VariableSequence({
  open,
  onOpenChange,
  onSubmit,
  botVariables = {},
}: VariableSequenceProps) {
  const [variables, setVariables] = useState<Variable[]>([
    { id: "1", key: "", value: "" },
  ]);

  const addVariable = () => {
    setVariables([
      ...variables,
      { id: Date.now().toString(), key: "", value: "" },
    ]);
  };

  const removeVariable = (id: string) => {
    if (variables.length === 1) {
      toast.error("Deve haver pelo menos uma variável");
      return;
    }
    setVariables(variables.filter((v) => v.id !== id));
  };

  const updateVariable = (id: string, field: "key" | "value", value: string) => {
    setVariables(
      variables.map((v) => (v.id === id ? { ...v, [field]: value } : v))
    );
  };

  const handleSubmit = () => {
    const invalidVariables = variables.filter((v) => !v.key || !v.value);
    if (invalidVariables.length > 0) {
      toast.error("Preencha todas as variáveis");
      return;
    }

    const variablesObject = variables.reduce(
      (acc, v) => ({ ...acc, [v.key]: v.value }),
      {}
    );

    onSubmit(variablesObject);
    setVariables([{ id: "1", key: "", value: "" }]);
    onOpenChange(false);
    toast.success("Variáveis enviadas");
  };

  const botVarsCount = Object.keys(botVariables).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-3xl max-h-[80vh] p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Variáveis Recebidas no Chat do Bot</DialogTitle>
          <DialogDescription>
            {botVarsCount > 0 
              ? `${botVarsCount} variável(is) recebida(s) durante a conversa com o bot`
              : "Nenhuma variável foi recebida do bot ainda"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-4">
            {/* Bot Variables Section - Main Focus */}
            {botVarsCount > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant="secondary" className="text-xs">
                    Bot Variables
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Estas variáveis foram coletadas durante a interação com o bot
                  </span>
                </div>
                
                <div className="grid gap-3 grid-cols-1">
                  {Object.entries(botVariables).map(([key, value], index) => (
                    <Card key={key} className="p-4 border-l-4 border-l-primary">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                              Nome da Variável
                            </span>
                          </div>
                        </div>
                        <div className="font-mono text-sm font-semibold text-foreground bg-muted/50 px-3 py-2 rounded">
                          {key}
                        </div>
                        
                        <div className="mt-3">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Valor
                          </span>
                          <div className="mt-1 font-mono text-sm text-foreground bg-background border px-3 py-2 rounded min-h-[40px] break-words">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">Nenhuma variável disponível no momento</p>
                <p className="text-xs mt-2">As variáveis aparecerão aqui quando o bot interagir com o usuário</p>
              </div>
            )}

            {/* Custom Variables Section - Secondary */}
            <div className="mt-6 pt-6 border-t space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="text-xs">
                  Variáveis Personalizadas
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Adicione variáveis customizadas adicionais se necessário
                </span>
              </div>
              {variables.map((variable, index) => (
              <div key={variable.id} className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1 space-y-2">
                  <Label htmlFor={`key-${variable.id}`}>
                    Chave {index + 1}
                  </Label>
                  <Input
                    id={`key-${variable.id}`}
                    value={variable.key}
                    onChange={(e) =>
                      updateVariable(variable.id, "key", e.target.value)
                    }
                    placeholder="nome"
                  />
                </div>

                <div className="flex-1 space-y-2">
                  <Label htmlFor={`value-${variable.id}`}>Valor</Label>
                  <Input
                    id={`value-${variable.id}`}
                    value={variable.value}
                    onChange={(e) =>
                      updateVariable(variable.id, "value", e.target.value)
                    }
                    placeholder="João Silva"
                  />
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => removeVariable(variable.id)}
                  disabled={variables.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            </div>
          </div>
        </ScrollArea>

        <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
          <Button variant="outline" onClick={addVariable} className="flex-1 text-xs sm:text-sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Variável
          </Button>
          <Button onClick={handleSubmit} className="flex-1 text-xs sm:text-sm" disabled={botVarsCount === 0 && variables.some(v => !v.key || !v.value)}>
            Enviar Variáveis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
