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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface VariableSequenceProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (variables: Record<string, string>) => void;
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Sequência de Variáveis</DialogTitle>
          <DialogDescription>
            Crie uma sequência de variáveis customizadas para enviar
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-4">
            {variables.map((variable, index) => (
              <div key={variable.id} className="flex gap-2 items-end">
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
        </ScrollArea>

        <div className="flex gap-2">
          <Button variant="outline" onClick={addVariable} className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Variável
          </Button>
          <Button onClick={handleSubmit} className="flex-1">
            Enviar Variáveis
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
