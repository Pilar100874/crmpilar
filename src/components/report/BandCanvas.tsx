import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Type, Image, Minus, Database, Trash2, BarChart3 } from "lucide-react";

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

interface BandCanvasProps {
  bands: Band[];
  selectedElement: string | null;
  onSelectElement: (id: string | null) => void;
  onAddElement: (bandId: string, element: ReportElement) => void;
  onUpdateBands: (bands: Band[]) => void;
  onDrop: (bandId: string, e: React.DragEvent) => void;
}

const bandLabels = {
  "report-header": "Report Header",
  "page-header": "Page Header",
  "data": "Data Band",
  "page-footer": "Page Footer",
  "report-footer": "Report Footer",
};

export function BandCanvas({ bands, selectedElement, onSelectElement, onAddElement, onUpdateBands, onDrop }: BandCanvasProps) {
  const [activeBand, setActiveBand] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  const handleAddText = (bandId: string) => {
    const newElement: ReportElement = {
      id: `text-${Date.now()}`,
      type: "text",
      x: 20,
      y: 20,
      width: 200,
      height: 30,
      properties: {
        text: "Texto",
        fontSize: 12,
        fontWeight: "normal",
      },
    };
    onAddElement(bandId, newElement);
  };

  const handleAddField = (bandId: string) => {
    const newElement: ReportElement = {
      id: `field-${Date.now()}`,
      type: "field",
      x: 20,
      y: 20,
      width: 150,
      height: 25,
      properties: {
        fieldName: "[field_name]",
        fontSize: 11,
      },
    };
    onAddElement(bandId, newElement);
  };

  const handleRemoveBand = (bandId: string) => {
    onUpdateBands(bands.filter(b => b.id !== bandId));
  };

  const handleDragOver = (e: React.DragEvent, bandId: string) => {
    e.preventDefault();
    setDragOver(bandId);
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (bandId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    onDrop(bandId, e);
  };

  return (
    <div className="p-4">
      {bands.map((band) => (
        <div
          key={band.id}
          className="mb-2 border rounded bg-background"
          onMouseEnter={() => setActiveBand(band.id)}
          onMouseLeave={() => setActiveBand(null)}
        >
          {/* Band Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted border-b">
            <span className="text-sm font-medium">{bandLabels[band.type]}</span>
            <div className="flex gap-1">
              {activeBand === band.id && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddText(band.id)}
                    title="Adicionar Texto"
                  >
                    <Type className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleAddField(band.id)}
                    title="Adicionar Campo"
                  >
                    <Database className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveBand(band.id)}
                    title="Remover Band"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Band Content */}
          <div
            className={`relative bg-card ${dragOver === band.id ? "ring-2 ring-primary" : ""}`}
            style={{ height: `${band.height}px`, minHeight: "60px" }}
            onDragOver={(e) => handleDragOver(e, band.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(band.id, e)}
          >
            {band.elements.map((element) => (
              <div
                key={element.id}
                className={`absolute border-2 cursor-move flex items-center justify-center text-sm ${
                  selectedElement === element.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/50"
                }`}
                style={{
                  left: `${element.x}px`,
                  top: `${element.y}px`,
                  width: `${element.width}px`,
                  height: `${element.height}px`,
                }}
                onClick={() => onSelectElement(element.id)}
              >
                {element.type === "text" && (
                  <span className="px-2 truncate">{element.properties.text}</span>
                )}
                {element.type === "field" && (
                  <span className="px-2 truncate text-muted-foreground">
                    {element.properties.fieldName}
                  </span>
                )}
                {element.type?.startsWith("chart-") && (
                  <div className="flex items-center justify-center w-full h-full bg-muted/20">
                    <BarChart3 className="h-6 w-6 text-primary" />
                    <span className="ml-2 text-xs">{element.properties.title || "Gráfico"}</span>
                  </div>
                )}
                {element.type?.startsWith("aggregate-") && (
                  <div className="flex items-center justify-center w-full h-full bg-muted/20">
                    <span className="text-xs font-mono">{element.properties.expression}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
