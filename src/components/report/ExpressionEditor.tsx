import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator, Sigma, Hash, Calendar, Type as TypeIcon } from "lucide-react";

interface ExpressionEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (expression: string) => void;
  initialValue?: string;
}

const functions = [
  { name: "SUM", description: "Soma de valores", example: "SUM([campo])" },
  { name: "AVG", description: "Média", example: "AVG([campo])" },
  { name: "COUNT", description: "Contagem", example: "COUNT([campo])" },
  { name: "MIN", description: "Valor mínimo", example: "MIN([campo])" },
  { name: "MAX", description: "Valor máximo", example: "MAX([campo])" },
  { name: "IF", description: "Condicional", example: "IF([campo] > 0, 'Positivo', 'Negativo')" },
];

const operators = [
  { symbol: "+", name: "Adição" },
  { symbol: "-", name: "Subtração" },
  { symbol: "*", name: "Multiplicação" },
  { symbol: "/", name: "Divisão" },
  { symbol: ">", name: "Maior que" },
  { symbol: "<", name: "Menor que" },
  { symbol: "==", name: "Igual a" },
  { symbol: "!=", name: "Diferente de" },
];

export function ExpressionEditor({ open, onClose, onSave, initialValue = "" }: ExpressionEditorProps) {
  const [expression, setExpression] = useState(initialValue);

  const insertText = (text: string) => {
    setExpression(prev => prev + text);
  };

  const handleSave = () => {
    onSave(expression);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Editor de Expressões</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="functions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="functions">Funções</TabsTrigger>
            <TabsTrigger value="operators">Operadores</TabsTrigger>
            <TabsTrigger value="examples">Exemplos</TabsTrigger>
          </TabsList>

          <TabsContent value="functions" className="space-y-2">
            <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
              {functions.map((func) => (
                <Card key={func.name} className="cursor-pointer hover:bg-muted/50" onClick={() => insertText(func.example)}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-primary" />
                      <div>
                        <div className="text-sm font-semibold">{func.name}</div>
                        <div className="text-xs text-muted-foreground">{func.description}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="operators" className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              {operators.map((op) => (
                <Button
                  key={op.symbol}
                  variant="outline"
                  onClick={() => insertText(` ${op.symbol} `)}
                  className="flex flex-col h-auto py-3"
                >
                  <span className="text-lg font-bold">{op.symbol}</span>
                  <span className="text-xs text-muted-foreground">{op.name}</span>
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="examples" className="space-y-2">
            <div className="space-y-2">
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setExpression("SUM([valor_total])")}>
                <CardContent className="p-3">
                  <div className="text-sm font-mono">SUM([valor_total])</div>
                  <div className="text-xs text-muted-foreground">Soma total de valores</div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setExpression("COUNT(*)")}>
                <CardContent className="p-3">
                  <div className="text-sm font-mono">COUNT(*)</div>
                  <div className="text-xs text-muted-foreground">Conta total de registros</div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-muted/50" onClick={() => setExpression("[valor_total] * 1.1")}>
                <CardContent className="p-3">
                  <div className="text-sm font-mono">[valor_total] * 1.1</div>
                  <div className="text-xs text-muted-foreground">Valor com acréscimo de 10%</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <label className="text-sm font-medium">Expressão</label>
          <Textarea
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder="Digite ou clique nos botões acima para construir a expressão..."
            className="font-mono text-sm"
            rows={4}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
