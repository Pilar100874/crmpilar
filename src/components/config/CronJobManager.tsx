import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Info, Edit2, Check } from "lucide-react";
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
  { value: "custom", label: "Personalizado", description: "Digite uma expressão cron customizada" },
];

const getCronDescription = (cron: string): string => {
  const preset = CRON_PRESETS.find(p => p.value === cron);
  if (preset && preset.value !== "custom") {
    return preset.description;
  }
  return "Agendamento personalizado";
};

export function CronJobManager({ 
  jobType, 
  jobName, 
  defaultSchedule = "*/5 * * * *",
  config,
  onConfigChange 
}: CronJobManagerProps) {
  const [cronExpression, setCronExpression] = useState(defaultSchedule);
  const [customCronExpression, setCustomCronExpression] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(defaultSchedule);
  const [isCustom, setIsCustom] = useState(false);
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
        const loadedCron = data.schedule_cron;
        setCronExpression(loadedCron);
        
        // Verificar se é um preset ou customizado
        const isPreset = CRON_PRESETS.some(p => p.value === loadedCron && p.value !== "custom");
        if (isPreset) {
          setSelectedPreset(loadedCron);
          setIsCustom(false);
        } else {
          setSelectedPreset("custom");
          setCustomCronExpression(loadedCron);
          setIsCustom(true);
        }
        
        setEnabled(data.enabled || false);
        setLastRun(data.last_run);
        setNextRun(data.next_run);
      } else {
        // Se não existe, usar valores padrão
        setCronExpression(defaultSchedule);
        setSelectedPreset(defaultSchedule);
        setIsCustom(false);
        setEnabled(false);
      }
    } catch (error: any) {
      console.error("Erro ao carregar cron job:", error);
    }
  };

  const handlePresetChange = (value: string) => {
    setSelectedPreset(value);
    if (value === "custom") {
      setIsCustom(true);
      setCustomCronExpression(cronExpression);
    } else {
      setIsCustom(false);
      setCronExpression(value);
    }
  };

  const handleCustomCronChange = (value: string) => {
    setCustomCronExpression(value);
    setCronExpression(value);
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
                    Selecione uma opção pré-definida ou escolha "Personalizado" para criar sua própria expressão cron.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Select value={selectedPreset} onValueChange={handlePresetChange}>
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

          {isCustom && (
            <div className="space-y-2 pt-2">
              <Label htmlFor={`custom-cron-${jobType}`} className="text-sm flex items-center gap-2">
                <Edit2 className="w-3 h-3" />
                Expressão Cron Personalizada
              </Label>
              <div className="flex gap-2">
                <Input
                  id={`custom-cron-${jobType}`}
                  value={customCronExpression}
                  onChange={(e) => handleCustomCronChange(e.target.value)}
                  placeholder="Ex: 0 */3 * * *"
                  className="font-mono text-sm"
                />
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="icon" className="shrink-0">
                        <Info className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold mb-2">Formato Cron:</p>
                      <code className="text-xs">minuto hora dia mês dia-semana</code>
                      <p className="text-xs mt-2">Exemplos:</p>
                      <ul className="text-xs list-disc list-inside mt-1">
                        <li>0 */3 * * * = A cada 3 horas</li>
                        <li>30 9 * * 1-5 = 9:30 dias úteis</li>
                        <li>0 0 1,15 * * = Dias 1 e 15</li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

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
