import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Variable {
  name: string;
  type: string;
}

interface TestVariablesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variables: Variable[];
  onSubmit: (values: Record<string, any>) => void;
}

export function TestVariablesDialog({ open, onOpenChange, variables, onSubmit }: TestVariablesDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const handleSubmit = () => {
    // Converter valores para os tipos corretos
    const convertedValues: Record<string, any> = {};
    
    variables.forEach(variable => {
      const value = values[variable.name] || '';
      
      try {
        switch (variable.type) {
          case 'number':
            convertedValues[variable.name] = value ? parseFloat(value) : 0;
            break;
          case 'boolean':
            convertedValues[variable.name] = value === 'true' || value === '1';
            break;
          case 'date':
            convertedValues[variable.name] = value ? new Date(value).toISOString() : null;
            break;
          case 'array':
            convertedValues[variable.name] = value ? JSON.parse(value) : [];
            break;
          case 'object':
            convertedValues[variable.name] = value ? JSON.parse(value) : {};
            break;
          default: // string
            convertedValues[variable.name] = String(value);
        }
      } catch (error) {
        console.warn(`Erro ao converter ${variable.name}:`, error);
        convertedValues[variable.name] = value;
      }
    });

    onSubmit(convertedValues);
    onOpenChange(false);
  };

  const renderInput = (variable: Variable) => {
    const value = values[variable.name] || '';

    switch (variable.type) {
      case 'boolean':
        return (
          <Select
            value={value}
            onValueChange={(v) => setValues({ ...values, [variable.name]: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Verdadeiro</SelectItem>
              <SelectItem value="false">Falso</SelectItem>
            </SelectContent>
          </Select>
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setValues({ ...values, [variable.name]: e.target.value })}
            placeholder="Digite um número..."
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setValues({ ...values, [variable.name]: e.target.value })}
          />
        );
      
      case 'array':
      case 'object':
        return (
          <Input
            value={value}
            onChange={(e) => setValues({ ...values, [variable.name]: e.target.value })}
            placeholder={`Digite JSON (ex: ${variable.type === 'array' ? '["item1", "item2"]' : '{"key": "value"}'})`}
          />
        );
      
      default: // string
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => setValues({ ...values, [variable.name]: e.target.value })}
            placeholder="Digite um valor..."
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Testar Relatório com Variáveis</DialogTitle>
          <DialogDescription>
            Informe os valores das variáveis para testar o relatório
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {variables.map((variable) => (
            <div key={variable.name} className="space-y-2">
              <Label htmlFor={variable.name}>
                {variable.name}
                <span className="text-xs text-muted-foreground ml-2">({variable.type})</span>
              </Label>
              {renderInput(variable)}
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            Gerar Preview
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
