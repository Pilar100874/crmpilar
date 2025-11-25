import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Info } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CronJobManagerProps {
  jobType: string;
  jobName: string;
  defaultSchedule?: string;
  config?: any;
  onConfigChange?: (schedule: string, enabled: boolean) => void;
}

const CRON_PRESETS = [
  { value: "*/1 * * * *", label: "A cada 1 minuto", description: "Executa a cada minuto" },
  { value: "*/5 * * * *", label: "A cada 5 minutos", description: "Executa de 5 em 5 minutos" },
  { value: "*/10 * * * *", label: "A cada 10 minutos", description: "Executa de 10 em 10 minutos" },
  { value: "*/15 * * * *", label: "A cada 15 minutos", description: "Executa de 15 em 15 minutos" },
  { value: "*/30 * * * *", label: "A cada 30 minutos", description: "Executa de 30 em 30 minutos" },
  { value: "0 * * * *", label: "A cada hora", description: "Executa no início de cada hora" },
  { value: "0 */2 * * *", label: "A cada 2 horas", description: "Executa de 2 em 2 horas" },
  { value: "0 */6 * * *", label: "A cada 6 horas", description: "Executa de 6 em 6 horas" },
  { value: "0 0 * * *", label: "Diariamente à meia-noite", description: "Executa todo dia às 00:00" },
  { value: "0 9 * * *", label: "Diariamente às 9h", description: "Executa todo dia às 09:00" },
  { value: "0 0 * * 0", label: "Semanalmente (Domingo)", description: "Executa todo domingo à meia-noite" },
  { value: "0 0 1 * *", label: "Mensalmente", description: "Executa no dia 1 de cada mês" },
];

const getCronDescription = (cron: string): string => {
  const preset = CRON_PRESETS.find(p => p.value === cron);
  return preset ? preset.description : "Agendamento personalizado";
};

export function CronJobManager({ 
  jobType, 
  jobName, 
  defaultSchedule = "*/5 * * * *",
  config,
  onConfigChange 
}: CronJobManagerProps) {
  const [cronExpression, setCronExpression] = useState(defaultSchedule);
  const [enabled, setEnabled] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [nextRun, setNextRun] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    loadCronJob();
  }, [jobType]);

  useEffect(() => {
    if (onConfigChange) {
      onConfigChange(cronExpression, enabled);
    }
  }, [cronExpression, enabled]);

  const loadCronJob = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      const { data, error } = await supabase
        .from("cron_jobs")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("job_type", jobType)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setJobId(data.id);
        setCronExpression(data.schedule_cron);
        setEnabled(data.enabled || false);
        setLastRun(data.last_run);
        setNextRun(data.next_run);
      } else {
        // Se não existe, usar valores padrão
        setCronExpression(defaultSchedule);
        setEnabled(false);
      }
    } catch (error: any) {
      console.error("Erro ao carregar cron job:", error);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não identificado");
        return;
      }

      const cronData = {
        estabelecimento_id: estabelecimentoId,
        job_type: jobType,
        job_name: jobName,
        schedule_cron: cronExpression,
        enabled: enabled,
        config: config || {},
      };

      if (jobId) {
        const { error } = await supabase
          .from("cron_jobs")
          .update(cronData)
          .eq("id", jobId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("cron_jobs")
          .insert([cronData])
          .select()
          .single();

        if (error) throw error;
        setJobId(data.id);
      }

      toast.success("Agendamento salvo com sucesso!");
      loadCronJob();
    } catch (error: any) {
      console.error("Erro ao salvar cron job:", error);
      toast.error("Erro ao salvar agendamento");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    return new Date(dateStr).toLocaleString("pt-BR");
  };

  return (
    <Card className="border-muted">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Agendamento Automático</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor={`enabled-${jobType}`} className="text-sm">
              {enabled ? "Ativo" : "Inativo"}
            </Label>
            <Switch
              id={`enabled-${jobType}`}
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>
        </div>
        <CardDescription>
          Configure quando esta tarefa deve ser executada automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={`cron-${jobType}`}>Frequência de Execução</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Selecione uma opção pré-definida para definir a frequência de execução automática.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Select value={cronExpression} onValueChange={setCronExpression}>
            <SelectTrigger id={`cron-${jobType}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CRON_PRESETS.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  <div className="flex flex-col">
                    <span className="font-medium">{preset.label}</span>
                    <span className="text-xs text-muted-foreground">{preset.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-md">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {getCronDescription(cronExpression)}
            </p>
          </div>
        </div>

        {enabled && (
          <div className="flex gap-2">
            <Badge variant="outline" className="gap-1">
              <span className="text-xs">Status:</span>
              <span className="text-xs font-semibold text-green-600">Ativo</span>
            </Badge>
            {lastRun && (
              <Badge variant="outline" className="gap-1">
                <span className="text-xs">Última execução:</span>
                <span className="text-xs font-semibold">{formatDate(lastRun)}</span>
              </Badge>
            )}
          </div>
        )}

        {!enabled && (
          <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-md">
            <Info className="w-4 h-4 text-amber-600 mt-0.5" />
            <p className="text-xs text-amber-700">
              O agendamento está desativado. Ative o switch acima para iniciar a execução automática desta tarefa.
            </p>
          </div>
        )}

        <div className="pt-2 border-t">
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Salvando..." : "Salvar Agendamento"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
