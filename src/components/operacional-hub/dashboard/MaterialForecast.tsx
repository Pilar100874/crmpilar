import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDown, Calendar, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MaterialForecastItem {
  materialId: string;
  materialName: string;
  unit: string;
  currentStock: number;
  minStock: number;
  dailyUsage: number;
  daysUntilCritical: number | null;
  forecastedNeeds: {
    date: string;
    dateLabel: string;
    needed: number;
    stockAfter: number;
  }[];
}

export function MaterialForecast() {
  const [forecasts, setForecasts] = useState<MaterialForecastItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchForecast();
  }, []);

  const fetchForecast = async () => {
    try {
      // Fetch all active templates with their materials
      const { data: templates, error: templatesError } = await supabase
        .from("op_task_templates")
        .select(`
          id,
          name,
          frequency,
          task_template_materials (
            quantity_needed,
            materials (
              id,
              name,
              unit,
              current_stock,
              min_stock
            )
          )
        `)
        .eq("is_active", true);

      if (templatesError) throw templatesError;

      // Calculate daily usage and forecast
      const materialUsage = new Map<string, {
        material: any;
        dailyUsage: number;
        weeklyUsage: number;
        monthlyUsage: number;
      }>();

      (templates || []).forEach((template) => {
        if (!template.task_template_materials) return;

        template.task_template_materials.forEach((ttm: any) => {
          const mat = ttm.materials;
          if (!mat) return;

          const qty = Number(ttm.quantity_needed) || 1;
          let dailyFactor = 0;

          switch (template.frequency) {
            case "daily":
              dailyFactor = 1;
              break;
            case "weekly":
              dailyFactor = 1 / 7;
              break;
            case "monthly":
              dailyFactor = 1 / 30;
              break;
            default:
              dailyFactor = 0.1; // on_demand estimate
          }

          const existing = materialUsage.get(mat.id);
          if (existing) {
            existing.dailyUsage += qty * dailyFactor;
          } else {
            materialUsage.set(mat.id, {
              material: mat,
              dailyUsage: qty * dailyFactor,
              weeklyUsage: 0,
              monthlyUsage: 0,
            });
          }
        });
      });

      // Build forecast for next 7 days
      const forecastItems: MaterialForecastItem[] = [];
      const today = new Date();

      materialUsage.forEach((usage) => {
        const mat = usage.material;
        let runningStock = Number(mat.current_stock) || 0;
        const forecastedNeeds: MaterialForecastItem["forecastedNeeds"] = [];
        let daysUntilCritical: number | null = null;

        for (let i = 1; i <= 7; i++) {
          const date = addDays(today, i);
          const dateStr = format(date, "yyyy-MM-dd");
          const dateLabel = format(date, "EEE, dd/MM", { locale: ptBR });
          
          // Estimate daily need
          const dailyNeed = Math.round(usage.dailyUsage * 10) / 10;
          runningStock -= dailyNeed;

          forecastedNeeds.push({
            date: dateStr,
            dateLabel,
            needed: dailyNeed,
            stockAfter: Math.max(0, runningStock),
          });

          if (daysUntilCritical === null && runningStock <= Number(mat.min_stock)) {
            daysUntilCritical = i;
          }
        }

        // Only include materials with significant usage
        if (usage.dailyUsage > 0) {
          forecastItems.push({
            materialId: mat.id,
            materialName: mat.name,
            unit: mat.unit,
            currentStock: Number(mat.current_stock) || 0,
            minStock: Number(mat.min_stock) || 0,
            dailyUsage: Math.round(usage.dailyUsage * 10) / 10,
            daysUntilCritical,
            forecastedNeeds,
          });
        }
      });

      // Sort by criticality
      forecastItems.sort((a, b) => {
        if (a.daysUntilCritical === null && b.daysUntilCritical === null) return 0;
        if (a.daysUntilCritical === null) return 1;
        if (b.daysUntilCritical === null) return -1;
        return a.daysUntilCritical - b.daysUntilCritical;
      });

      setForecasts(forecastItems.slice(0, 10)); // Top 10
    } catch (error) {
      console.error("Error fetching forecast:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalItems = forecasts.filter((f) => f.daysUntilCritical !== null && f.daysUntilCritical <= 3);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingDown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Previsão de Materiais</CardTitle>
              <p className="text-sm text-muted-foreground">Próximos 7 dias</p>
            </div>
          </div>
          {criticalItems.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-critical/10 text-critical text-sm font-medium">
              <AlertTriangle className="h-4 w-4" />
              {criticalItems.length} crítico{criticalItems.length > 1 ? "s" : ""}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {forecasts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum material com uso previsto
          </p>
        ) : (
          <div className="space-y-4">
            {forecasts.map((item) => (
              <div
                key={item.materialId}
                className={cn(
                  "p-4 rounded-xl border",
                  item.daysUntilCritical !== null && item.daysUntilCritical <= 3
                    ? "border-critical/30 bg-critical/5"
                    : item.daysUntilCritical !== null && item.daysUntilCritical <= 7
                    ? "border-warning/30 bg-warning/5"
                    : "border-border bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {item.daysUntilCritical !== null && item.daysUntilCritical <= 3 ? (
                      <AlertTriangle className="h-5 w-5 text-critical" />
                    ) : item.daysUntilCritical !== null && item.daysUntilCritical <= 7 ? (
                      <AlertTriangle className="h-5 w-5 text-warning" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    )}
                    <span className="font-medium text-foreground">{item.materialName}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-bold text-foreground">
                      {item.currentStock} {item.unit}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Uso: ~{item.dailyUsage}/{item.unit}/dia
                    </p>
                  </div>
                </div>

                {item.daysUntilCritical !== null && (
                  <div className={cn(
                    "text-sm font-medium mb-3 flex items-center gap-2",
                    item.daysUntilCritical <= 3 ? "text-critical" : "text-warning"
                  )}>
                    <Calendar className="h-4 w-4" />
                    Estoque crítico em {item.daysUntilCritical} dia{item.daysUntilCritical > 1 ? "s" : ""}
                  </div>
                )}

                {/* Mini forecast chart */}
                <div className="flex gap-1">
                  {item.forecastedNeeds.map((day, idx) => (
                    <div
                      key={day.date}
                      className="flex-1 text-center"
                      title={`${day.dateLabel}: ${day.stockAfter} ${item.unit} restantes`}
                    >
                      <div
                        className={cn(
                          "h-2 rounded-full mb-1",
                          day.stockAfter <= item.minStock
                            ? "bg-critical"
                            : day.stockAfter <= item.minStock * 1.5
                            ? "bg-warning"
                            : "bg-success"
                        )}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {format(addDays(new Date(), idx + 1), "dd")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
