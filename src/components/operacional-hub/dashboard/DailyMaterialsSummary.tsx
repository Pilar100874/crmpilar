import { useEffect, useState } from "react";
import { Package, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/operacional-hub/useAuth";
import { useUserRole } from "@/hooks/operacional-hub/useUserRole";
import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";

interface MaterialNeed {
  materialId: string;
  materialName: string;
  unit: string;
  totalNeeded: number;
  currentStock: number;
  isAvailable: boolean;
  tasks: string[];
}

interface DailyMaterialsSummaryProps {
  filterUserId?: string | null;
}

export function DailyMaterialsSummary({ filterUserId }: DailyMaterialsSummaryProps = {}) {
  const { user } = useAuth();
  const { isAdmin, isManager, loading: roleLoading } = useUserRole();
  const { establishmentId } = useEstablishment();
  const [materials, setMaterials] = useState<MaterialNeed[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdminOrManager = isAdmin || isManager;

  useEffect(() => {
    if (user && !roleLoading) {
      setLoading(true);
      fetchDailyMaterials();
    }
  }, [user, isAdminOrManager, establishmentId, roleLoading, filterUserId]);

  const fetchDailyMaterials = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Build query - for admin/manager show ALL tasks, for workers filter by assignment
      let query = supabase
        .from("op_task_executions")
        .select(`
          id,
          assigned_user_id,
          task_templates (
            id,
            name,
            job_function_id,
            sector_id,
            task_template_materials (
              quantity_needed,
              materials (
                id,
                name,
                unit,
                current_stock
              )
            )
          )
        `)
        .eq("scheduled_date", today)
        .in("status", ["pending", "in_progress"]);

      // If a specific user filter is provided, filter by that user
      if (filterUserId) {
        const { data: filterProfile } = await supabase
          .from("op_profiles")
          .select("job_function_id, job_functions(sector_id)")
          .eq("user_id", filterUserId)
          .maybeSingle();

        const jobFunctionId = filterProfile?.job_function_id;
        const sectorId = (filterProfile?.job_functions as any)?.sector_id;

        const { data: executions, error } = await query;
        if (error) throw error;

        const relevantExecutions = (executions || []).filter((exec) => {
          if (exec.assigned_user_id === filterUserId) return true;
          if (!exec.assigned_user_id) {
            const template = exec.task_templates as any;
            if (!template) return false;
            if (template.job_function_id && template.job_function_id === jobFunctionId) return true;
            if (!template.job_function_id && template.sector_id && template.sector_id === sectorId) return true;
          }
          return false;
        });

        aggregateAndSetMaterials(relevantExecutions);
      } else if (!isAdminOrManager) {
        // Worker viewing own materials
        const { data: profile } = await supabase
          .from("op_profiles")
          .select("job_function_id, job_functions(sector_id)")
          .eq("user_id", user?.id)
          .maybeSingle();

        const jobFunctionId = profile?.job_function_id;
        const sectorId = (profile?.job_functions as any)?.sector_id;

        const { data: executions, error } = await query;
        if (error) throw error;

        const relevantExecutions = (executions || []).filter((exec) => {
          if (exec.assigned_user_id === user?.id) return true;
          if (!exec.assigned_user_id) {
            const template = exec.task_templates as any;
            if (!template) return false;
            if (template.job_function_id && template.job_function_id === jobFunctionId) return true;
            if (!template.job_function_id && template.sector_id && template.sector_id === sectorId) return true;
          }
          return false;
        });

        aggregateAndSetMaterials(relevantExecutions);
      } else {
        // Admin/manager: show all tasks
        const { data: executions, error } = await query;
        if (error) throw error;
        aggregateAndSetMaterials(executions || []);
      }
    } catch (error) {
      console.error("Error fetching daily materials:", error);
    } finally {
      setLoading(false);
    }
  };

  const aggregateAndSetMaterials = (executions: any[]) => {
    const materialMap = new Map<string, MaterialNeed>();

    executions.forEach((exec) => {
      const template = exec.task_templates as any;
      if (!template?.task_template_materials) return;

      template.task_template_materials.forEach((ttm: any) => {
        const mat = ttm.materials;
        if (!mat) return;

        const existing = materialMap.get(mat.id);
        const qtyNeeded = Number(ttm.quantity_needed) || 1;

        if (existing) {
          existing.totalNeeded += qtyNeeded;
          if (!existing.tasks.includes(template.name)) {
            existing.tasks.push(template.name);
          }
        } else {
          materialMap.set(mat.id, {
            materialId: mat.id,
            materialName: mat.name,
            unit: mat.unit,
            totalNeeded: qtyNeeded,
            currentStock: Number(mat.current_stock) || 0,
            isAvailable: Number(mat.current_stock) >= qtyNeeded,
            tasks: [template.name],
          });
        }
      });
    });

    const materialsList = Array.from(materialMap.values()).map((m) => ({
      ...m,
      isAvailable: m.currentStock >= m.totalNeeded,
    }));

    materialsList.sort((a, b) => {
      if (a.isAvailable === b.isAvailable) return a.materialName.localeCompare(b.materialName);
      return a.isAvailable ? 1 : -1;
    });

    setMaterials(materialsList);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Materiais do Dia</h3>
            <p className="text-sm text-muted-foreground">O que você precisa hoje</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          Nenhum material necessário para as tarefas de hoje
        </p>
      </div>
    );
  }

  const unavailableCount = materials.filter((m) => !m.isAvailable).length;

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Materiais do Dia</h3>
            <p className="text-sm text-muted-foreground">
              {isAdminOrManager ? "Todos os materiais necessários hoje" : "O que você precisa hoje"}
            </p>
          </div>
        </div>
        {unavailableCount > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-warning/10 text-warning text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            {unavailableCount} em falta
          </div>
        )}
      </div>

      <div className="space-y-3">
        {materials.map((material) => (
          <div
            key={material.materialId}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl",
              material.isAvailable ? "bg-muted/50" : "bg-warning/10 border border-warning/30"
            )}
          >
            {material.isAvailable ? (
              <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{material.materialName}</p>
              <p className="text-xs text-muted-foreground truncate">
                Para: {material.tasks.slice(0, 2).join(", ")}
                {material.tasks.length > 2 && ` +${material.tasks.length - 2}`}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className={cn(
                "text-sm font-mono font-bold",
                material.isAvailable ? "text-foreground" : "text-warning"
              )}>
                {material.totalNeeded} {material.unit}
              </p>
              <p className="text-xs text-muted-foreground">
                Estoque: {material.currentStock}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}