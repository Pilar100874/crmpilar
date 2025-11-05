import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { useState } from "react";
import { ExpressionEditor } from "./ExpressionEditor";

interface ChartConfigProps {
  element: any;
  onUpdate: (properties: any) => void;
}

export function ChartConfig({ element, onUpdate }: ChartConfigProps) {
  const [showExpressionEditor, setShowExpressionEditor] = useState(false);
  const [editingField, setEditingField] = useState<"xField" | "yField" | null>(null);

  const updateProperty = (key: string, value: any) => {
    onUpdate({ ...element.properties, [key]: value });
  };

  const handleExpressionSave = (expression: string) => {
    if (editingField) {
      updateProperty(editingField, expression);
    }
    setEditingField(null);
  };

  const chartTypes = [
    { value: "bar", label: "Barras" },
    { value: "line", label: "Linha" },
    { value: "pie", label: "Pizza" },
    { value: "area", label: "Área" },
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuração do Gráfico</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="chartType" className="text-xs">Tipo de Gráfico</Label>
            <Select
              value={element.properties.chartType || "bar"}
              onValueChange={(value) => updateProperty("chartType", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {chartTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="title" className="text-xs">Título</Label>
            <Input
              id="title"
              value={element.properties.title || ""}
              onChange={(e) => updateProperty("title", e.target.value)}
              className="h-8"
              placeholder="Título do gráfico"
            />
          </div>

          <div>
            <Label className="text-xs">Eixo X (Categorias)</Label>
            <div className="flex gap-1">
              <Input
                value={element.properties.xField || ""}
                onChange={(e) => updateProperty("xField", e.target.value)}
                className="h-8"
                placeholder="[campo_categoria]"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingField("xField");
                  setShowExpressionEditor(true);
                }}
              >
                <Calculator className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs">Eixo Y (Valores)</Label>
            <div className="flex gap-1">
              <Input
                value={element.properties.yField || ""}
                onChange={(e) => updateProperty("yField", e.target.value)}
                className="h-8"
                placeholder="SUM([campo_valor])"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setEditingField("yField");
                  setShowExpressionEditor(true);
                }}
              >
                <Calculator className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="colorScheme" className="text-xs">Esquema de Cores</Label>
            <Select
              value={element.properties.colorScheme || "blue"}
              onValueChange={(value) => updateProperty("colorScheme", value)}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="blue">Azul</SelectItem>
                <SelectItem value="green">Verde</SelectItem>
                <SelectItem value="purple">Roxo</SelectItem>
                <SelectItem value="orange">Laranja</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <ExpressionEditor
        open={showExpressionEditor}
        onClose={() => {
          setShowExpressionEditor(false);
          setEditingField(null);
        }}
        onSave={handleExpressionSave}
        initialValue={editingField ? element.properties[editingField] : ""}
      />
    </>
  );
}
