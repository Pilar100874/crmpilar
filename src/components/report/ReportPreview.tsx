import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ChartRenderer } from "./ChartRenderer";
import { DataTable } from "./DataTable";
import { ExportToolbar } from "./ExportToolbar";

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
      const fieldName = element.properties.fieldName.replace(/[\[\]]/g, "").split(".").pop();
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

    if (element.type?.startsWith("chart-") && data.length > 0) {
      return (
        <div
          style={{
            position: "absolute",
            left: `${element.x}px`,
            top: `${element.y}px`,
          }}
        >
          <ChartRenderer
            type={element.properties.chartType || "bar"}
            title={element.properties.title || "Gráfico"}
            data={data}
            xField={element.properties.xField || "nome"}
            yField={element.properties.yField || "valor"}
            colorScheme={element.properties.colorScheme || "blue"}
            width={element.width}
            height={element.height}
          />
        </div>
      );
    }

    if (element.type === "table" && data.length > 0) {
      return (
        <div
          style={{
            position: "absolute",
            left: `${element.x}px`,
            top: `${element.y}px`,
          }}
        >
          <DataTable
            data={data}
            width={element.width}
            height={element.height}
          />
        </div>
      );
    }

    if (element.type?.startsWith("aggregate-")) {
      const expression = element.properties.expression || "";
      let result = "";
      
      if (expression.startsWith("SUM")) {
        const field = expression.match(/\[([^\]]+)\]/)?.[1];
        if (field && data.length > 0) {
          const sum = data.reduce((acc, row) => acc + (parseFloat(row[field]) || 0), 0);
          result = sum.toFixed(2);
        }
      } else if (expression.startsWith("COUNT")) {
        result = data.length.toString();
      } else if (expression.startsWith("AVG")) {
        const field = expression.match(/\[([^\]]+)\]/)?.[1];
        if (field && data.length > 0) {
          const sum = data.reduce((acc, row) => acc + (parseFloat(row[field]) || 0), 0);
          result = (sum / data.length).toFixed(2);
        }
      }
      
      return (
        <div
          style={{
            position: "absolute",
            left: `${element.x}px`,
            top: `${element.y}px`,
            width: `${element.width}px`,
            height: `${element.height}px`,
            fontSize: `${element.properties.fontSize || 12}px`,
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {result}
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
        <ExportToolbar 
          reportData={{ tableData: data }}
          reportName="relatorio"
        />
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
