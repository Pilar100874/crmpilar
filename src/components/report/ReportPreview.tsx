import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import { ReportElement } from "./ReportElement";

interface ReportPreviewProps {
  layout: any;
  data: any[];
}

export function ReportPreview({ layout, data }: ReportPreviewProps) {
  const [zoom, setZoom] = useState(1);

  const elements = layout.elements || [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Pré-visualização</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="flex items-center px-2">{Math.round(zoom * 100)}%</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setZoom(Math.min(2, zoom + 0.25))}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            transition: "transform 0.2s",
          }}
        >
          <div
            className="bg-white shadow-lg mx-auto relative"
            style={{
              width: "794px",
              minHeight: "1123px",
            }}
          >
            {elements.map((element: any) => (
              <div
                key={element.id}
                style={{
                  position: "absolute",
                  left: element.x,
                  top: element.y,
                  width: element.width,
                  height: element.height,
                }}
              >
                <ReportElement
                  element={element}
                  isSelected={false}
                  onSelect={() => {}}
                  onUpdate={() => {}}
                  onDelete={() => {}}
                  queryData={data}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
