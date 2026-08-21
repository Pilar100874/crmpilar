import { AlertTriangle, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Material {
  id: string;
  name: string;
  currentStock: number;
  minStock: number;
  unit: string;
}

interface MaterialAlertProps {
  materials: Material[];
}

export function MaterialAlert({ materials }: MaterialAlertProps) {
  const criticalMaterials = materials.filter(
    (m) => m.currentStock <= m.minStock
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4 lg:p-6">
      <div className="flex items-center gap-2 mb-4">
        <Package className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Alertas de Estoque</h3>
      </div>

      {criticalMaterials.length === 0 ? (
        <div className="text-center py-8">
          <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
            <Package className="h-6 w-6 text-success" />
          </div>
          <p className="text-sm text-muted-foreground">
            Todos os materiais em níveis adequados
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {criticalMaterials.map((material) => {
            const percentage = Math.round(
              (material.currentStock / material.minStock) * 100
            );
            const isCritical = percentage < 50;

            return (
              <div
                key={material.id}
                className={cn(
                  "p-3 rounded-lg border",
                  isCritical
                    ? "bg-critical/10 border-critical/30"
                    : "bg-warning/10 border-warning/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={cn(
                        "h-4 w-4",
                        isCritical ? "text-critical" : "text-warning"
                      )}
                    />
                    <span className="font-medium text-sm">{material.name}</span>
                  </div>
                  <span
                    className={cn(
                      "text-sm font-mono font-bold",
                      isCritical ? "text-critical" : "text-warning"
                    )}
                  >
                    {material.currentStock} {material.unit}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Mínimo: {material.minStock} {material.unit}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
