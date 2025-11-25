import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast-config";
import { Clock, Play, Pause, RefreshCw } from "lucide-react";

interface CronJob {
  id: string;
  job_type: string;
  job_name: string;
  schedule_cron: string;
  enabled: boolean;
  last_run: string | null;
  next_run: string | null;
  config: any;
}

interface CronJobManagerProps {
  estabelecimentoId: string;
  jobType: string; // 'pesquisa_satisfacao' ou 'monitorar_sla'
  title: string;
  defaultCron?: string;
}

export function CronJobManager({ 
  estabelecimentoId, 
  jobType, 
  title,
  defaultCron = "*/5 * * * *" // A cada 5 minutos por padrão
}: CronJobManagerProps) {
  const [job, setJob] = useState<CronJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [cronExpression, setCronExpression] = useState(defaultCron);

  useEffect(() => {
    loadJob();
  }, [estabelecimentoId, jobType]);

  const loadJob = async () => {
    try {
      const { data, error } = await supabase
        .from("cron_jobs")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("job_type", jobType)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setJob(data);
        setCronExpression(data.schedule_cron);
      }
    } catch (error: any) {
      console.error("Erro ao carregar job:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOrCreate = async () => {
    try {
      if (!cronExpression) {
        toast.error("Insira uma expressão cron válida");
        return;
      }

      const dataToSave = {
        estabelecimento_id: estabelecimentoId,
        job_type: jobType,
        job_name: title,
        schedule_cron: cronExpression,
        enabled: job?.enabled ?? true,
      };

      if (job) {
        const { error } = await supabase
          .from("cron_jobs")
          .update(dataToSave)
          .eq("id", job.id);

        if (error) throw error;
        toast.success("Agendamento atualizado");
      } else {
        const { error } = await supabase
          .from("cron_jobs")
          .insert([dataToSave]);

        if (error) throw error;
        toast.success("Agendamento criado");
      }

      loadJob();
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar agendamento");
    }
  };

  const handleToggleEnabled = async () => {
    if (!job) return;

    try {
      const { error } = await supabase
        .from("cron_jobs")
        .update({ enabled: !job.enabled })
        .eq("id", job.id);

      if (error) throw error;
      toast.success(job.enabled ? "Job pausado" : "Job ativado");
      loadJob();
    } catch (error: any) {
      console.error("Erro ao alternar status:", error);
      toast.error("Erro ao alternar status");
    }
  };

  const getCronDescription = (cron: string) => {
    const patterns: Record<string, string> = {
      "*/1 * * * *": "A cada 1 minuto",
      "*/5 * * * *": "A cada 5 minutos",
      "*/10 * * * *": "A cada 10 minutos",
      "*/15 * * * *": "A cada 15 minutos",
      "*/30 * * * *": "A cada 30 minutos",
      "0 * * * *": "A cada hora",
      "0 */2 * * *": "A cada 2 horas",
      "0 */6 * * *": "A cada 6 horas",
      "0 0 * * *": "Diariamente à meia-noite",
    };
    return patterns[cron] || "Personalizado";
  };

  if (loading) return <div className="text-xs sm:text-sm text-muted-foreground">Carregando...</div>;

  return (
    <Card className="border-muted/50 bg-card/50">
      <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <h4 className="text-sm sm:text-base font-semibold">Agendamento Automático</h4>
          </div>
          {job && (
            <Badge variant={job.enabled ? "default" : "secondary"} className="text-xs">
              {job.enabled ? "Ativo" : "Pausado"}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cron-expression" className="text-xs sm:text-sm">Expressão Cron</Label>
              <Input
                id="cron-expression"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="*/5 * * * *"
                className="text-xs sm:text-sm h-8 sm:h-9"
              />
              <p className="text-xs text-muted-foreground">
                {getCronDescription(cronExpression)}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs sm:text-sm">Presets Comuns</Label>
              <div className="grid grid-cols-2 gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setCronExpression("*/5 * * * *")}
                >
                  5 min
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setCronExpression("*/15 * * * *")}
                >
                  15 min
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setCronExpression("0 * * * *")}
                >
                  1 hora
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs h-7"
                  onClick={() => setCronExpression("0 0 * * *")}
                >
                  Diário
                </Button>
              </div>
            </div>
          </div>

          {job && (
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-2 border-t">
              <div>
                <span className="font-medium">Última execução:</span>
                <br />
                {job.last_run 
                  ? new Date(job.last_run).toLocaleString("pt-BR")
                  : "Nunca"}
              </div>
              <div>
                <span className="font-medium">Próxima execução:</span>
                <br />
                {job.next_run
                  ? new Date(job.next_run).toLocaleString("pt-BR")
                  : "Não agendada"}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSaveOrCreate}
              size="sm"
              className="text-xs flex-1"
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              {job ? "Atualizar" : "Criar"} Agendamento
            </Button>
            {job && (
              <Button
                onClick={handleToggleEnabled}
                variant={job.enabled ? "secondary" : "default"}
                size="sm"
                className="text-xs"
              >
                {job.enabled ? (
                  <>
                    <Pause className="w-3 h-3 mr-1.5" />
                    Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 mr-1.5" />
                    Ativar
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
