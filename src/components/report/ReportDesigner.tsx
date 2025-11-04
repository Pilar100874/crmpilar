import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Type,
  Image,
  BarChart3,
  Table2,
  Square,
  Minus,
  Barcode,
} from "lucide-react";
import { ReportElement } from "./ReportElement";
import { ReportPropertiesPanel } from "./ReportPropertiesPanel";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";

interface ReportDesignerProps {
  layout: any;
  onChange: (layout: any) => void;
  queryData: any[];
}

export function ReportDesigner({ layout, onChange, queryData }: ReportDesignerProps) {
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [elements, setElements] = useState<any[]>(layout.elements || []);

  const componentTypes = [
    { type: "text", label: "Texto", icon: Type },
    { type: "image", label: "Imagem", icon: Image },
    { type: "chart", label: "Gráfico", icon: BarChart3 },
    { type: "table", label: "Tabela", icon: Table2 },
    { type: "shape", label: "Forma", icon: Square },
    { type: "line", label: "Linha", icon: Minus },
    { type: "barcode", label: "Código de Barras", icon: Barcode },
  ];

  const handleAddElement = (type: string) => {
    const newElement = {
      id: `element-${Date.now()}`,
      type,
      x: 50,
      y: 50,
      width: 200,
      height: type === "line" ? 2 : 100,
      properties: getDefaultProperties(type),
    };

    const updatedElements = [...elements, newElement];
    setElements(updatedElements);
    onChange({ ...layout, elements: updatedElements });
    setSelectedElement(newElement.id);
  };

  const getDefaultProperties = (type: string) => {
    switch (type) {
      case "text":
        return {
          content: "Texto de exemplo",
          fontSize: 14,
          fontFamily: "Arial",
          color: "#000000",
          bold: false,
          italic: false,
        };
      case "image":
        return {
          url: "",
          fit: "contain",
        };
      case "chart":
        return {
          chartType: "bar",
          dataField: "",
          labelField: "",
        };
      case "table":
        return {
          columns: [],
          borderWidth: 1,
          borderColor: "#000000",
        };
      case "shape":
        return {
          shapeType: "rectangle",
          fillColor: "#ffffff",
          borderColor: "#000000",
          borderWidth: 1,
        };
      case "line":
        return {
          color: "#000000",
          width: 1,
        };
      case "barcode":
        return {
          format: "CODE128",
          value: "123456789",
          displayValue: true,
        };
      default:
        return {};
    }
  };

  const handleUpdateElement = (id: string, updates: any) => {
    const updatedElements = elements.map((el) =>
      el.id === id ? { ...el, ...updates } : el
    );
    setElements(updatedElements);
    onChange({ ...layout, elements: updatedElements });
  };

  const handleDeleteElement = (id: string) => {
    const updatedElements = elements.filter((el) => el.id !== id);
    setElements(updatedElements);
    onChange({ ...layout, elements: updatedElements });
    if (selectedElement === id) {
      setSelectedElement(null);
    }
  };

  const selectedElementData = elements.find((el) => el.id === selectedElement);

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full">
      {/* Paleta de Componentes */}
      <ResizablePanel defaultSize={15} minSize={10}>
        <div className="h-full border-r bg-muted/50 p-4">
          <h3 className="font-semibold mb-4">Componentes</h3>
          <ScrollArea className="h-[calc(100%-2rem)]">
            <div className="space-y-2">
              {componentTypes.map(({ type, label, icon: Icon }) => (
                <Button
                  key={type}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleAddElement(type)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Canvas */}
      <ResizablePanel defaultSize={60}>
        <div className="h-full bg-background p-4">
          <div className="h-full border rounded-lg bg-white relative overflow-auto">
            {/* Página A4 simulada */}
            <div
              className="relative mx-auto bg-white shadow-lg"
              style={{
                width: "794px", // A4 width in pixels at 96 DPI
                minHeight: "1123px", // A4 height in pixels at 96 DPI
              }}
            >
              {elements.map((element) => (
                <ReportElement
                  key={element.id}
                  element={element}
                  isSelected={selectedElement === element.id}
                  onSelect={() => setSelectedElement(element.id)}
                  onUpdate={(updates) => handleUpdateElement(element.id, updates)}
                  onDelete={() => handleDeleteElement(element.id)}
                  queryData={queryData}
                />
              ))}
            </div>
          </div>
        </div>
      </ResizablePanel>

      <ResizableHandle withHandle />

      {/* Painel de Propriedades */}
      <ResizablePanel defaultSize={25} minSize={15}>
        <div className="h-full border-l bg-muted/50 p-4">
          <h3 className="font-semibold mb-4">Propriedades</h3>
          {selectedElementData ? (
            <ReportPropertiesPanel
              element={selectedElementData}
              onChange={(updates) => handleUpdateElement(selectedElementData.id, updates)}
              queryData={queryData}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Selecione um elemento para editar suas propriedades
            </p>
          )}
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
