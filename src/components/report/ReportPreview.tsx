import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";

interface Band {
  id: string;
  type: "report-header" | "page-header" | "data" | "page-footer" | "report-footer";
  height: number;
  elements: any[];
}

interface ReportPreviewProps {
  bands: Band[];
  query: string;
  connectionId: string | null;
  onClose: () => void;
}

export function ReportPreview({ bands, query, connectionId, onClose }: ReportPreviewProps) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query && connectionId) {
      loadData();
    }
  }, [query, connectionId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Simulação - substituir pela chamada real à API
      setData([
        { id: 1, nome: "Exemplo 1", valor: 100 },
        { id: 2, nome: "Exemplo 2", valor: 200 },
      ]);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderElement = (element: any, rowData?: any) => {
    if (element.type === "text") {
      return (
        <div
          style={{
            position: "absolute",
            left: `${element.x}px`,
            top: `${element.y}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            fontSize: `${element.properties.fontSize}px`,
            fontWeight: element.properties.fontWeight,
          }}
        >
          {element.properties.text}
        </div>
      );
    }

    if (element.type === "field" && rowData) {
      const fieldName = element.properties.fieldName.replace(/[\[\]]/g, "");
      const value = rowData[fieldName] || element.properties.fieldName;
      return (
        <div
          style={{
            position: "absolute",
            left: `${element.x}px`,
            top: `${element.y}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            fontSize: `${element.properties.fontSize}px`,
          }}
        >
          {value}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Editor
        </Button>
        <Button disabled>
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-muted/10">
        <Card className="max-w-4xl mx-auto bg-background shadow-lg p-8">
          {loading ? (
            <div className="text-center py-8">Carregando dados...</div>
          ) : (
            <div>
              {/* Page Header */}
              {bands
                .filter(b => b.type === "page-header" || b.type === "report-header")
                .map(band => (
                  <div key={band.id} className="relative mb-2" style={{ height: `${band.height}px` }}>
                    {band.elements.map(el => (
                      <div key={el.id}>{renderElement(el)}</div>
                    ))}
                  </div>
                ))}

              {/* Data Rows */}
              {data.map((row, idx) => (
                <div key={idx}>
                  {bands
                    .filter(b => b.type === "data")
                    .map(band => (
                      <div key={band.id} className="relative border-t" style={{ height: `${band.height}px` }}>
                        {band.elements.map(el => (
                          <div key={el.id}>{renderElement(el, row)}</div>
                        ))}
                      </div>
                    ))}
                </div>
              ))}

              {/* Page Footer */}
              {bands
                .filter(b => b.type === "page-footer" || b.type === "report-footer")
                .map(band => (
                  <div key={band.id} className="relative mt-2 border-t" style={{ height: `${band.height}px` }}>
                    {band.elements.map(el => (
                      <div key={el.id}>{renderElement(el)}</div>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
