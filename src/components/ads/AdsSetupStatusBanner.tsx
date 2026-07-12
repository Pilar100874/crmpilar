import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, X } from "lucide-react";

interface Props {
  estabelecimentoId: string;
  onGoToWizard: () => void;
}

type StepStatus = { id: string; label: string; ok: boolean };

export const useAdsSetupStatus = (estabelecimentoId: string | null) => {
  const [steps, setSteps] = useState<StepStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    try {
      const [apps, accounts, autos, sched, logs] = await Promise.all([
        supabase.from("ads_platform_apps" as any).select("meta_app_id, google_client_id, tiktok_app_id").eq("estabelecimento_id", estabelecimentoId).maybeSingle(),
        supabase.from("ad_accounts").select("id", { count: "exact", head: true }).eq("estabelecimento_id", estabelecimentoId),
        supabase.from("ads_automacoes").select("id", { count: "exact", head: true }).eq("estabelecimento_id", estabelecimentoId).eq("ativo", true),
        supabase.from("ads_scheduler_config" as any).select("ativo").eq("estabelecimento_id", estabelecimentoId).maybeSingle(),
        supabase.from("ads_logs_coleta").select("id", { count: "exact", head: true }).eq("estabelecimento_id", estabelecimentoId).in("tipo", ["execucao", "acao_executada"]),
      ]);
      const appsData: any = apps.data;
      const schedData: any = sched.data;
      setSteps([
        { id: "apps", label: "Apps das Plataformas", ok: !!(appsData && (appsData.meta_app_id || appsData.google_client_id || appsData.tiktok_app_id)) },
        { id: "accounts", label: "Credenciais das Contas", ok: (accounts.count || 0) > 0 },
        { id: "automation", label: "Automação Ativa", ok: (autos.count || 0) > 0 },
        { id: "scheduler", label: "Agendamento Ativo", ok: !!(schedData && schedData.ativo) },
        { id: "test", label: "Execução Testada", ok: (logs.count || 0) > 0 },
      ]);
    } catch (e) {
      console.error("[AdsSetupStatus]", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [estabelecimentoId]);

  const done = steps.filter((s) => s.ok).length;
  const total = steps.length;
  const complete = total > 0 && done === total;
  return { steps, done, total, complete, loading, refresh };
};

export const AdsSetupStatusBanner: React.FC<Props> = ({ estabelecimentoId, onGoToWizard }) => {
  const { steps, done, total, complete, loading } = useAdsSetupStatus(estabelecimentoId);
  const [dismissed, setDismissed] = useState<boolean>(() => localStorage.getItem("ads_setup_banner_dismissed") === "1");

  if (loading || total === 0) return null;

  if (complete) {
    if (dismissed) return null;
    return (
      <div className="border-b bg-green-500/10 px-4 py-2 flex items-center gap-3">
        <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
        <span className="text-sm text-green-700 dark:text-green-400 flex-1">
          <b>Setup Ads completo!</b> Todas as 5 etapas configuradas — automações rodando conforme o agendamento.
        </span>
        <Button variant="ghost" size="sm" onClick={() => { setDismissed(true); localStorage.setItem("ads_setup_banner_dismissed", "1"); }}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const pct = Math.round((done / total) * 100);
  return (
    <div className="border-b bg-primary/5 px-4 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Configuração incompleta</span>
          <Badge variant="secondary">{done}/{total}</Badge>
        </div>
        <div className="flex-1 min-w-0">
          <Progress value={pct} className="h-2" />
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {steps.map((s) => (
              <span key={s.id} className={s.ok ? "line-through opacity-60" : ""}>
                {s.ok ? "✓" : "○"} {s.label}
              </span>
            ))}
          </div>
        </div>
        <Button size="sm" onClick={onGoToWizard} className="shrink-0">
          <Sparkles className="h-4 w-4 mr-1" /> Continuar setup
        </Button>
      </div>
    </div>
  );
};
