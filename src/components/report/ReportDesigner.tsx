import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Eye, Save } from "lucide-react";
import { BandToolbar } from "./BandToolbar";
import { BandCanvas } from "./BandCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { DataSourcePanel } from "./DataSourcePanel";
import { ReportPreview } from "./ReportPreview";

interface Band {
  id: string;
  type: "report-header" | "page-header" | "data" | "page-footer" | "report-footer";
  height: number;
  elements: ReportElement[];
}

interface ReportElement {
  id: string;
  type: "text" | "field" | "image" | "line";
  x: number;
  y: number;
  width: number;
  height: number;
  properties: Record<string, any>;
}

interface ReportDesignerProps {
  report: any;
  onSave: (data: any) => void;
  onClose: () => void;
}

export function ReportDesigner({ report, onSave, onClose }: ReportDesignerProps) {
  const [bands, setBands] = useState<Band[]>([
    { id: "page-header", type: "page-header", height: 60, elements: [] },
    { id: "data", type: "data", height: 120, elements: [] },
    { id: "page-footer", type: "page-footer", height: 40, elements: [] },
  ]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [query, setQuery] = useState(report.query_sql || "");

  const handleAddBand = (type: Band["type"]) => {
    const newBand: Band = {
      id: `${type}-${Date.now()}`,
      type,
      height: 60,
      elements: [],
    };
    setBands([...bands, newBand]);
  };

  const handleAddElement = (bandId: string, element: ReportElement) => {
    setBands(bands.map(band => 
      band.id === bandId 
        ? { ...band, elements: [...band.elements, element] }
        : band
    ));
  };

  const handleSave = () => {
    onSave({
      layout_json: { bands },
      query_sql: query,
    });
  };

  if (showPreview) {
    return (
      <ReportPreview 
        bands={bands} 
        query={query}
        connectionId={report.conexao_id}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <BandToolbar onAddBand={handleAddBand} />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Data Source */}
        <div className="w-64 border-r bg-muted/20 overflow-y-auto">
          <DataSourcePanel 
            connectionId={report.conexao_id}
            query={query}
            onQueryChange={setQuery}
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-y-auto p-8 bg-muted/10">
          <Card className="max-w-4xl mx-auto bg-background shadow-lg">
            <BandCanvas
              bands={bands}
              selectedElement={selectedElement}
              onSelectElement={setSelectedElement}
              onAddElement={handleAddElement}
              onUpdateBands={setBands}
            />
          </Card>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-80 border-l bg-muted/20 overflow-y-auto">
          <PropertiesPanel
            selectedElement={selectedElement}
            bands={bands}
            onUpdateBands={setBands}
          />
        </div>
      </div>
    </div>
  );
}
