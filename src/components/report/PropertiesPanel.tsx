import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

  return (
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
  );
}
