import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Wrench, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/operacional-hub/useAuth";

interface ToolItem {
  id: string;
  name: string;
  description: string | null;
  is_available: boolean;
  needs_repair: boolean;
}

interface ToolCheckDialogProps {
  open: boolean;
  taskTemplateId: string;
  onAllConfirmed: () => void;
  onSkip: (reason: string) => void;
}

export function ToolCheckDialog({ open, taskTemplateId, onAllConfirmed, onSkip }: ToolCheckDialogProps) {
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [unavailable, setUnavailable] = useState<Record<string, boolean>>({});
  const [reporting, setReporting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open && taskTemplateId) {
      fetchTools();
    }
  }, [open, taskTemplateId]);

  const fetchTools = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("op_task_template_tools")
        .select("tool_id, tools(id, name, description, is_available, needs_repair)")
        .eq("task_template_id", taskTemplateId);

      if (error) throw error;

      const toolsList = (data || [])
        .map((d: any) => d.tools)
        .filter(Boolean) as ToolItem[];

      setTools(toolsList);
      setConfirmed({});
      setUnavailable({});

      // If no tools required, auto-confirm
      if (toolsList.length === 0) {
        onAllConfirmed();
      }
    } catch (error) {
      console.error("Error fetching tools:", error);
      onAllConfirmed(); // Don't block if fetch fails
    } finally {
      setLoading(false);
    }
  };

  const allConfirmed = tools.length > 0 && tools.every((t) => confirmed[t.id]);
  const hasUnavailable = Object.values(unavailable).some(Boolean);

  const handleConfirmAll = () => {
    if (allConfirmed) {
      onAllConfirmed();
    }
  };

  const handleReportAndSkip = async () => {
    setReporting(true);
    try {
      const unavailableToolIds = Object.entries(unavailable)
        .filter(([, v]) => v)
        .map(([id]) => id);

      const unavailableToolNames = tools
        .filter((t) => unavailableToolIds.includes(t.id))
        .map((t) => t.name);

      // Mark tools as needing repair
      for (const toolId of unavailableToolIds) {
        await supabase
          .from("op_tools")
          .update({
            needs_repair: true,
            is_available: false,
            repair_reported_at: new Date().toISOString(),
            repair_reported_by_user_id: user?.id || null,
            repair_notes: "Reportado como indisponível/defeituoso durante verificação pré-tarefa",
          })
          .eq("id", toolId);
      }

      toast({
        title: "⚠️ Ferramentas reportadas",
        description: `${unavailableToolNames.join(", ")} marcada(s) para conserto`,
      });

      onSkip(`Ferramenta(s) indisponível(is): ${unavailableToolNames.join(", ")}`);
    } catch (error) {
      console.error("Error reporting tools:", error);
      toast({ title: "Erro ao reportar", variant: "destructive" });
    } finally {
      setReporting(false);
    }
  };

  const toggleConfirm = (toolId: string) => {
    setConfirmed((prev) => ({ ...prev, [toolId]: !prev[toolId] }));
    // If confirming, remove from unavailable
    if (!confirmed[toolId]) {
      setUnavailable((prev) => ({ ...prev, [toolId]: false }));
    }
  };

  const toggleUnavailable = (toolId: string) => {
    setUnavailable((prev) => ({ ...prev, [toolId]: !prev[toolId] }));
    // If marking unavailable, remove from confirmed
    if (!unavailable[toolId]) {
      setConfirmed((prev) => ({ ...prev, [toolId]: false }));
    }
  };

  if (loading) {
    return (
      <Dialog open={open}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Verificação de Ferramentas
          </DialogTitle>
          <DialogDescription>
            Confirme que todas as ferramentas necessárias estão disponíveis e funcionais antes de iniciar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {tools.map((tool) => {
            const isConfirmed = confirmed[tool.id];
            const isUnavailable = unavailable[tool.id];
            const alreadyBroken = tool.needs_repair;

            return (
              <div
                key={tool.id}
                className={cn(
                  "p-3 rounded-xl border transition-all",
                  isConfirmed
                    ? "border-success/50 bg-success/5"
                    : isUnavailable || alreadyBroken
                    ? "border-destructive/50 bg-destructive/5"
                    : "border-border"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Wrench className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{tool.name}</p>
                      {alreadyBroken && (
                        <Badge variant="destructive" className="text-xs">Em conserto</Badge>
                      )}
                    </div>
                    {tool.description && (
                      <p className="text-xs text-muted-foreground">{tool.description}</p>
                    )}
                  </div>
                </div>

                {!alreadyBroken && (
                  <div className="flex items-center gap-4 mt-3 ml-11">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={isConfirmed}
                        onCheckedChange={() => toggleConfirm(tool.id)}
                      />
                      <span className="text-sm text-success font-medium">OK</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={isUnavailable}
                        onCheckedChange={() => toggleUnavailable(tool.id)}
                      />
                      <span className="text-sm text-destructive font-medium">Indisponível</span>
                    </label>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 mt-4">
          {(hasUnavailable || tools.some((t) => t.needs_repair)) ? (
            <Button
              onClick={handleReportAndSkip}
              disabled={reporting}
              variant="destructive"
              className="w-full gap-2"
            >
              {reporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              Reportar e Pular Tarefa
            </Button>
          ) : (
            <Button
              onClick={handleConfirmAll}
              disabled={!allConfirmed}
              className="w-full gap-2 bg-success hover:bg-success/90 text-success-foreground"
            >
              <CheckCircle2 className="h-4 w-4" />
              Todas OK — Continuar
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}