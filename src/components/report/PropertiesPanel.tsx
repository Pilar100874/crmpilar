import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartConfig } from "./ChartConfig";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";
import { useState } from "react";
import { ExpressionEditor } from "./ExpressionEditor";

interface ReportElement {
  id: string;
  type: "text" | "field" | "image" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
}

interface Band {
  id: string;
  type: "report-header" | "page-header" | "data" | "page-footer" | "report-footer";
  height: number;
  elements: ReportElement[];
}

interface PropertiesPanelProps {
  selectedElement: string | null;
  bands: Band[];
  onUpdateBands: (bands: Band[]) => void;
}

export function PropertiesPanel({ selectedElement, bands, onUpdateBands }: PropertiesPanelProps) {
  const [showExpressionEditor, setShowExpressionEditor] = useState(false);
  
  const element = bands
    .flatMap(b => b.elements)
    .find(e => e.id === selectedElement);

  if (!element) {
    return (
      <div className="p-4">
        <p className="text-sm text-muted-foreground">
          Selecione um elemento para ver suas propriedades
        </p>
      </div>
    );
  }

  const updateProperty = (key: string, value: any) => {
    const updatedBands = bands.map(band => ({
      ...band,
      elements: band.elements.map(el =>
        el.id === selectedElement
          ? { ...el, properties: { ...el.properties, [key]: value } }
          : el
      ),
    }));
    onUpdateBands(updatedBands);
  };

  const updateElement = (properties: any) => {
    const updatedBands = bands.map(band => ({
      ...band,
      elements: band.elements.map(el =>
        el.id === selectedElement
          ? { ...el, properties }
          : el
      ),
    }));
    onUpdateBands(updatedBands);
  };

  // Renderizar configuração específica para gráficos
  if (element?.type?.startsWith("chart-")) {
    return (
      <div className="p-4 space-y-4">
        <ChartConfig element={element} onUpdate={updateElement} />
        <Card>
          <CardContent className="p-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>X: {element.x}px</div>
              <div>Y: {element.y}px</div>
              <div>Largura: {element.width}px</div>
              <div>Altura: {element.height}px</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Propriedades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
          {element.type === "text" && (
            <>
              <div>
                <Label htmlFor="text" className="text-xs">Texto</Label>
                <Input
                  id="text"
                  value={element.properties.text || ""}
                  onChange={(e) => updateProperty("text", e.target.value)}
                  className="h-8"
                />
              </div>
              <div>
                <Label htmlFor="fontSize" className="text-xs">Tamanho da Fonte</Label>
                <Input
                  id="fontSize"
                  type="number"
                  value={element.properties.fontSize || 12}
                  onChange={(e) => updateProperty("fontSize", parseInt(e.target.value))}
                  className="h-8"
                />
              </div>
            </>
          )}

          {element.type === "field" && (
            <>
              <div>
                <Label htmlFor="fieldName" className="text-xs">Nome do Campo</Label>
                <Input
                  id="fieldName"
                  value={element.properties.fieldName || ""}
                  onChange={(e) => updateProperty("fieldName", e.target.value)}
                  className="h-8"
                  placeholder="[nome_do_campo]"
                />
              </div>
              <div>
                <Label htmlFor="fontSize" className="text-xs">Tamanho da Fonte</Label>
                <Input
                  id="fontSize"
                  type="number"
                  value={element.properties.fontSize || 11}
                  onChange={(e) => updateProperty("fontSize", parseInt(e.target.value))}
                  className="h-8"
                />
              </div>
            </>
          )}

          {element.type?.startsWith("aggregate-") && (
            <>
              <div>
                <Label className="text-xs">Expressão</Label>
                <div className="flex gap-1">
                  <Input
                    value={element.properties.expression || ""}
                    onChange={(e) => updateProperty("expression", e.target.value)}
                    className="h-8 font-mono text-xs"
                    placeholder="SUM([campo])"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowExpressionEditor(true)}
                  >
                    <Calculator className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="pt-3 border-t">
            <div className="text-xs text-muted-foreground space-y-1">
              <div>X: {element.x}px</div>
              <div>Y: {element.y}px</div>
              <div>Largura: {element.width}px</div>
              <div>Altura: {element.height}px</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    <ExpressionEditor
      open={showExpressionEditor}
      onClose={() => setShowExpressionEditor(false)}
      onSave={(expression) => updateProperty("expression", expression)}
      initialValue={element?.properties.expression || ""}
    />
  </>
  );
}
