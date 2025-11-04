import { useState } from "react";
import { Rnd } from "react-rnd";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import ReactECharts from "echarts-for-react";
import JsBarcode from "jsbarcode";
import { useEffect, useRef } from "react";

interface ReportElementProps {
  element: any;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  queryData: any[];
}

export function ReportElement({
  element,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  queryData,
}: ReportElementProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (element.type === "barcode" && barcodeRef.current && element.properties.value) {
      try {
        JsBarcode(barcodeRef.current, element.properties.value, {
          format: element.properties.format || "CODE128",
          displayValue: element.properties.displayValue !== false,
          width: 2,
          height: 50,
        });
      } catch (error) {
        console.error("Error generating barcode:", error);
      }
    }
  }, [element.type, element.properties]);

  const renderContent = () => {
    switch (element.type) {
      case "text":
        return (
          <div
            style={{
              fontSize: `${element.properties.fontSize}px`,
              fontFamily: element.properties.fontFamily,
              color: element.properties.color,
              fontWeight: element.properties.bold ? "bold" : "normal",
              fontStyle: element.properties.italic ? "italic" : "normal",
              width: "100%",
              height: "100%",
              padding: "4px",
            }}
          >
            {element.properties.content}
          </div>
        );

      case "image":
        return element.properties.url ? (
          <img
            src={element.properties.url}
            alt="Report Image"
            style={{
              width: "100%",
              height: "100%",
              objectFit: element.properties.fit || "contain",
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">
            Sem imagem
          </div>
        );

      case "chart":
        if (!queryData.length || !element.properties.dataField) {
          return (
            <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">
              Configure os dados do gráfico
            </div>
          );
        }

        const chartData = queryData.map(row => row[element.properties.dataField]);
        const chartLabels = queryData.map(row => 
          element.properties.labelField ? row[element.properties.labelField] : ""
        );

        const chartOption = {
          tooltip: {},
          xAxis: {
            type: "category",
            data: chartLabels,
          },
          yAxis: {
            type: "value",
          },
          series: [
            {
              data: chartData,
              type: element.properties.chartType || "bar",
            },
          ],
        };

        return <ReactECharts option={chartOption} style={{ height: "100%", width: "100%" }} />;

      case "table":
        if (!queryData.length) {
          return (
            <div className="flex items-center justify-center h-full bg-muted text-muted-foreground text-sm">
              Nenhum dado disponível
            </div>
          );
        }

        const columns = element.properties.columns?.length
          ? element.properties.columns
          : Object.keys(queryData[0]);

        return (
          <div className="overflow-auto h-full">
            <table
              className="w-full text-sm"
              style={{
                borderCollapse: "collapse",
                border: `${element.properties.borderWidth || 1}px solid ${
                  element.properties.borderColor || "#000"
                }`,
              }}
            >
              <thead>
                <tr>
                  {columns.map((col: string) => (
                    <th
                      key={col}
                      className="border p-2 bg-muted font-semibold text-left"
                      style={{
                        borderWidth: `${element.properties.borderWidth || 1}px`,
                        borderColor: element.properties.borderColor || "#000",
                      }}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {queryData.slice(0, 10).map((row, idx) => (
                  <tr key={idx}>
                    {columns.map((col: string) => (
                      <td
                        key={col}
                        className="border p-2"
                        style={{
                          borderWidth: `${element.properties.borderWidth || 1}px`,
                          borderColor: element.properties.borderColor || "#000",
                        }}
                      >
                        {row[col]?.toString() || ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "shape":
        const { shapeType, fillColor, borderColor, borderWidth } = element.properties;
        if (shapeType === "circle" || shapeType === "ellipse") {
          return (
            <div
              style={{
                width: "100%",
                height: "100%",
                borderRadius: shapeType === "circle" ? "50%" : "50%",
                backgroundColor: fillColor || "#ffffff",
                border: `${borderWidth || 1}px solid ${borderColor || "#000"}`,
              }}
            />
          );
        }
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: fillColor || "#ffffff",
              border: `${borderWidth || 1}px solid ${borderColor || "#000"}`,
            }}
          />
        );

      case "line":
        return (
          <div
            style={{
              width: "100%",
              height: `${element.properties.width || 1}px`,
              backgroundColor: element.properties.color || "#000",
            }}
          />
        );

      case "barcode":
        return (
          <div className="flex items-center justify-center h-full">
            <svg ref={barcodeRef}></svg>
          </div>
        );

      default:
        return <div className="text-sm text-muted-foreground">Elemento desconhecido</div>;
    }
  };

  return (
    <Rnd
      size={{ width: element.width, height: element.height }}
      position={{ x: element.x, y: element.y }}
      onDragStop={(e, d) => {
        onUpdate({ x: d.x, y: d.y });
      }}
      onResizeStop={(e, direction, ref, delta, position) => {
        onUpdate({
          width: parseInt(ref.style.width),
          height: parseInt(ref.style.height),
          ...position,
        });
      }}
      bounds="parent"
      onClick={onSelect}
      style={{
        border: isSelected ? "2px solid #3b82f6" : "1px dashed #ccc",
        cursor: "move",
      }}
      className="bg-white"
    >
      <div className="relative w-full h-full">
        {renderContent()}
        {isSelected && (
          <Button
            size="sm"
            variant="destructive"
            className="absolute -top-8 -right-8 h-6 w-6 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </Rnd>
  );
}
