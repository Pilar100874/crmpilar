import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Save, Clock } from "lucide-react";

type Freq = "desligado" | "15min" | "hora" | "dia" | "custom";
interface Config {
  ativo: boolean;
  frequencia: Freq;
  cron_expr: string | null;
  ultima_execucao: string | null;
  proxima_execucao: string | null;
  ultimo_status: string | null;
  ultimo_erro: string | null;
}

const FREQ_LABEL: Record<Freq, string> = {
  desligado: "Desligado",
  "15min": "A cada 15 minutos",
  hora: "A cada hora",
  dia: "1 vez por dia",
  custom: "Personalizado (cron)",
};

export default function AdsSchedulerConfig() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningNow, setRunningNow] = useState(false);
  const [estabId, setEstabId] = useState<string>("");
  const [cfg, setCfg] = useState<Config>({
    ativo: false, frequencia: "desligado", cron_expr: "*/30 * * * *",
    ultima_execucao: null, proxima_execucao: null, ultimo_status: null, ultimo_erro: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const id = await getEstabelecimentoId();
        setEstabId(id);
        const { data } = await supabase
          .from("ads_scheduler_config" as any)
          .select("*").eq("estabelecimento_id", id).maybeSingle();
        if (data) setCfg({ ...cfg, ...(data as any) });
      } catch (e: any) { toast.error(e?.message || "Falha ao carregar configuração"); }
      finally { setLoading(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvar = async () => {
    if (!estabId) return;
    setSaving(true);
    try {
      const payload: any = {
        estabelecimento_id: estabId,
        ativo: cfg.ativo,
        frequencia: cfg.frequencia,
        cron_expr: cfg.frequencia === "custom" ? (cfg.cron_expr || "*/30 * * * *") : null,
        proxima_execucao: cfg.ativo && cfg.frequencia !== "desligado" ? new Date().toISOString() : null,
      };
      const { error } = await supabase.from("ads_scheduler_config" as any).upsert(payload);
      if (error) throw error;
      toast.success("Configuração salva");
    } catch (e: any) { toast.error(e?.message || "Falha ao salvar"); }
    finally { setSaving(false); }
  };

  const executarAgora = async (dryRun = false) => {
    if (!estabId) return;
    setRunningNow(true);
    try {
      const { data, error } = await supabase.functions.invoke("executar-ads-automacoes", {
        body: { estabelecimento_id: estabId, dry_run: dryRun, coletar_antes: !dryRun },
      });
      if (error) throw error;
      const n = (data as any)?.executadas ?? 0;
      toast.success(dryRun ? `Simulação: ${n} regra(s) seriam disparadas` : `Execução concluída: ${n} regra(s) processada(s)`);
    } catch (e: any) { toast.error(e?.message || "Falha na execução"); }
    finally { setRunningNow(false); }
  };

  const validCron = (s: string) => /^\S+\s+\S+\s+\S+\s+\S+\s+\S+$/.test(s.trim());

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Carregando…</div>;
  }

  return (
    <div className="container max-w-3xl py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Clock className="w-6 h-6" /> Agendamento das Automações Ads</h1>
        <p className="text-muted-foreground text-sm mt-1">Controle quando o motor de regras Ads roda automaticamente para coletar métricas e executar as ações configuradas.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração</CardTitle>
          <CardDescription>Defina a frequência do scheduler para este estabelecimento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-base">Ativo</Label>
              <p className="text-xs text-muted-foreground">Quando desligado, nenhuma automação de Ads roda automaticamente.</p>
            </div>
            <Switch checked={cfg.ativo} onCheckedChange={(v) => setCfg({ ...cfg, ativo: v })} />
          </div>

          <div>
            <Label className="text-base mb-2 block">Frequência</Label>
            <RadioGroup value={cfg.frequencia} onValueChange={(v) => setCfg({ ...cfg, frequencia: v as Freq })} className="space-y-2">
              {(Object.keys(FREQ_LABEL) as Freq[]).map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <RadioGroupItem value={f} id={`freq-${f}`} />
                  <Label htmlFor={`freq-${f}`} className="cursor-pointer">{FREQ_LABEL[f]}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {cfg.frequencia === "custom" && (
            <div>
              <Label htmlFor="cron">Expressão cron (5 campos)</Label>
              <Input id="cron" value={cfg.cron_expr || ""} onChange={(e) => setCfg({ ...cfg, cron_expr: e.target.value })} placeholder="*/30 * * * *" />
              <p className="text-xs text-muted-foreground mt-1">
                Formato: <code>minuto hora dia mês diaSemana</code>. Ex.: <code>*/30 * * * *</code> = a cada 30 min · <code>0 */2 * * *</code> = a cada 2 horas · <code>0 9,18 * * *</code> = 9h e 18h.
                {cfg.cron_expr && !validCron(cfg.cron_expr) && <span className="text-destructive block mt-1">Expressão inválida — deve ter 5 campos separados por espaço.</span>}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={salvar} disabled={saving || (cfg.frequencia === "custom" && !validCron(cfg.cron_expr || ""))}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Salvar
            </Button>
            <Button variant="outline" onClick={() => executarAgora(false)} disabled={runningNow}>
              {runningNow ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Executar agora
            </Button>
            <Button variant="secondary" onClick={() => executarAgora(true)} disabled={runningNow} title="Simula sem executar ações reais">
              {runningNow ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              Simular (dry-run)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Telemetria</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Última execução</span><span>{cfg.ultima_execucao ? new Date(cfg.ultima_execucao).toLocaleString() : "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Próxima execução</span><span>{cfg.proxima_execucao ? new Date(cfg.proxima_execucao).toLocaleString() : "—"}</span></div>
          <div className="flex justify-between items-center"><span className="text-muted-foreground">Último status</span>
            {cfg.ultimo_status
              ? <Badge variant={cfg.ultimo_status === "ok" ? "default" : "destructive"}>{cfg.ultimo_status}</Badge>
              : <span>—</span>}
          </div>
          {cfg.ultimo_erro && <div className="text-destructive text-xs mt-2">{cfg.ultimo_erro}</div>}
        </CardContent>
      </Card>
    </div>
  );
}
