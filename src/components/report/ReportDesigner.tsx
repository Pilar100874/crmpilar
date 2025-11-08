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
import { DatabaseExplorer } from "./DatabaseExplorer";
import { ComponentLibrary } from "./ComponentLibrary";
import { DataSourceManager } from "./DataSourceManager";

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
  const [bands, setBands] = useState<Band[]>(
    report.layout_json?.bands || [
      { id: "page-header", type: "page-header", height: 60, elements: [] },
      { id: "data", type: "data", height: 120, elements: [] },
      { id: "page-footer", type: "page-footer", height: 40, elements: [] },
    ]
  );
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [query, setQuery] = useState(report.query_sql || "");
  const [dataSources, setDataSources] = useState<Array<{id: string, name: string, query: string, connectionId: string}>>([
    { id: "main", name: "Principal", query: report.query_sql || "", connectionId: report.conexao_id || "" }
  ]);

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

  const handleDrop = (bandId: string, e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;

    const dropData = JSON.parse(data);
    
    let newElement: ReportElement;
    
    if (dropData.type === "field") {
      // Campo arrastado do Database Explorer
      newElement = {
        id: `field-${Date.now()}`,
        type: "field",
        x: 20,
        y: 20,
        width: 150,
        height: 25,
        properties: {
          fieldName: `[${dropData.table}.${dropData.field}]`,
          fontSize: 11,
          dataSourceId: selectedDataSourceId,
        },
      };
    } else if (dropData.type?.startsWith("chart-")) {
      // Gráfico da Component Library
      newElement = {
        id: `${dropData.type}-${Date.now()}`,
        type: dropData.type,
        x: 20,
        y: 20,
        width: 400,
        height: 250,
        properties: {
          chartType: dropData.type.replace("chart-", ""),
          title: "Novo Gráfico",
          xField: "",
          yField: "",
          colorScheme: "blue",
          dataSourceId: selectedDataSourceId,
        },
      };
    } else if (dropData.type?.startsWith("aggregate-")) {
      // Agregação da Component Library
      const aggType = dropData.type.replace("aggregate-", "").toUpperCase();
      newElement = {
        id: `${dropData.type}-${Date.now()}`,
        type: dropData.type,
        x: 20,
        y: 20,
        width: 150,
        height: 30,
        properties: {
          expression: `${aggType}([campo])`,
          fontSize: 12,
          dataSourceId: selectedDataSourceId,
        },
      };
    } else {
      // Outros componentes
      newElement = {
        id: `${dropData.type}-${Date.now()}`,
        type: dropData.type,
        x: 20,
        y: 20,
        width: dropData.type === "table" ? 500 : 200,
        height: dropData.type === "table" ? 200 : 30,
        properties: { dataSourceId: selectedDataSourceId },
      };
    }
    
    handleAddElement(bandId, newElement);
  };

  const handleSave = () => {
    const mainSource = dataSources.find(ds => ds.id === "main");
    onSave({
      layout_json: { bands, dataSources },
      query_sql: mainSource?.query || query,
    });
  };

  const [selectedDataSourceId, setSelectedDataSourceId] = useState("main");

  const handleDataSourceQueryChange = (newQuery: string) => {
    setDataSources(dataSources.map(ds => 
      ds.id === selectedDataSourceId 
        ? { ...ds, query: newQuery }
        : ds
    ));
    if (selectedDataSourceId === "main") {
      setQuery(newQuery);
    }
  };

  const currentDataSource = dataSources.find(ds => ds.id === selectedDataSourceId) || dataSources[0];

  if (showPreview) {
    return (
      <ReportPreview 
        bands={bands} 
        dataSources={dataSources}
        onClose={() => setShowPreview(false)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-card">
        <BandToolbar onAddBand={handleAddBand} />
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="default"
            onClick={() => setShowPreview(true)}
            className="h-10 px-4 rounded-xl transition-all hover:scale-105"
          >
            <Eye className="h-5 w-5 mr-2" />
            Preview
          </Button>
          <Button 
            size="default"
            onClick={handleSave}
            className="h-10 px-4 rounded-xl transition-all hover:scale-105 bg-primary hover:bg-primary/90 shadow-lg"
          >
            <Save className="h-5 w-5 mr-2" />
            Salvar
          </Button>
          <Button 
            variant="outline" 
            size="default"
            onClick={onClose}
            className="h-10 px-4 rounded-xl transition-all hover:scale-105"
          >
            Fechar
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Database & Components */}
        <div className="w-80 border-r bg-muted/20 overflow-y-auto">
          <Tabs defaultValue="sources" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 mx-4 mt-4 h-12 rounded-xl bg-muted p-1">
              <TabsTrigger value="sources" className="rounded-lg transition-all data-[state=active]:shadow-md">Fontes</TabsTrigger>
              <TabsTrigger value="database" className="rounded-lg transition-all data-[state=active]:shadow-md">BD</TabsTrigger>
              <TabsTrigger value="components" className="rounded-lg transition-all data-[state=active]:shadow-md">Comp</TabsTrigger>
              <TabsTrigger value="query" className="rounded-lg transition-all data-[state=active]:shadow-md">Query</TabsTrigger>
            </TabsList>
            <TabsContent value="sources" className="flex-1 p-4">
              <DataSourceManager
                dataSources={dataSources}
                onDataSourcesChange={setDataSources}
                onSelectDataSource={setSelectedDataSourceId}
                selectedDataSourceId={selectedDataSourceId}
              />
            </TabsContent>
            <TabsContent value="database" className="flex-1 p-4">
              <DatabaseExplorer 
                connectionId={currentDataSource.connectionId}
                onDragStart={(data) => {}}
              />
            </TabsContent>
            <TabsContent value="components" className="flex-1 p-4">
              <ComponentLibrary onDragStart={(component) => {}} />
            </TabsContent>
            <TabsContent value="query" className="flex-1 p-4">
              <DataSourcePanel 
                connectionId={currentDataSource.connectionId}
                query={currentDataSource.query}
                onQueryChange={handleDataSourceQueryChange}
                dataSourceId={currentDataSource.id}
              />
            </TabsContent>
          </Tabs>
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
              onDrop={handleDrop}
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
