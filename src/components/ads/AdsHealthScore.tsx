import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

type Signal = { label: string; ok: boolean; hint?: string };
type Action = { title: string; desc: string; goto: string };

export default function AdsHealthScore() {
  const navigate = useNavigate();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const estabId = await getEstabelecimentoId();
        if (!estabId) return;

        const [accounts, autos, sched, insights] = await Promise.all([
          supabase.from("ad_accounts").select("id, platform_id", { count: "exact" }).eq("estabelecimento_id", estabId),
          supabase.from("ads_automacoes").select("id", { count: "exact", head: true }).eq("estabelecimento_id", estabId).eq("ativo", true),
          supabase.from("ads_scheduler_config" as any).select("ativo").eq("estabelecimento_id", estabId).maybeSingle(),
          supabase.from("ad_insights").select("spend, revenue, ctr").eq("estabelecimento_id", estabId).order("date", { ascending: false }).limit(30),
        ]);

        const accountsCount = accounts.count || 0;
        const autosCount = autos.count || 0;
        const schedActive = !!(sched.data as any)?.ativo;
        const rows = (insights.data as any[]) || [];
        const spend = rows.reduce((s, r) => s + (Number(r.spend) || 0), 0);
        const revenue = rows.reduce((s, r) => s + (Number(r.revenue) || 0), 0);
        const roas = spend > 0 ? revenue / spend : 0;
        const avgCtr = rows.length ? rows.reduce((s, r) => s + (Number(r.ctr) || 0), 0) / rows.length : 0;

        const sig: Signal[] = [
          { label: "Contas conectadas", ok: accountsCount > 0, hint: `${accountsCount} conta(s)` },
          { label: "Automação ativa", ok: autosCount > 0, hint: `${autosCount} regra(s)` },
          { label: "Agendamento ativo", ok: schedActive },
          { label: "ROAS saudável (>1)", ok: roas > 1, hint: roas ? roas.toFixed(2) : "sem dados" },
          { label: "CTR aceitável (>1%)", ok: avgCtr > 1, hint: avgCtr ? avgCtr.toFixed(2) + "%" : "sem dados" },
        ];
        setSignals(sig);

        const acts: Action[] = [];
        if (accountsCount === 0) acts.push({ title: "Conecte sua primeira conta de anúncio", desc: "Sem contas não há métricas para analisar.", goto: "/ads/hub?tab=connections" });
        if (autosCount === 0 && accountsCount > 0) acts.push({ title: "Crie sua primeira automação", desc: "Deixe o sistema pausar/ajustar campanhas automaticamente.", goto: "/ads/hub?tab=automation" });
        if (!schedActive && autosCount > 0) acts.push({ title: "Ative o agendamento", desc: "Suas automações só rodam com o scheduler ativo.", goto: "/ads/hub?tab=scheduler" });
        if (roas > 0 && roas < 1) acts.push({ title: "ROAS abaixo de 1", desc: `Você está gastando mais do que faturando (${roas.toFixed(2)}x). Revise campanhas.`, goto: "/ads/hub?tab=campaigns" });
        if (avgCtr > 0 && avgCtr < 1) acts.push({ title: "CTR baixo", desc: `Média ${avgCtr.toFixed(2)}%. Teste novos criativos.`, goto: "/ads/hub?tab=campaigns" });
        setActions(acts);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return null;
  const score = signals.length ? Math.round((signals.filter((s) => s.ok).length / signals.length) * 100) : 0;
  const color = score >= 80 ? "text-green-500" : score >= 50 ? "text-amber-500" : "text-red-500";
  const bar = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="p-6">
        <div className="grid md:grid-cols-[220px_1fr] gap-6">
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <Activity className="h-4 w-4" /> Saúde da conta
            </div>
            <div className={`text-5xl font-bold ${color}`}>{score}<span className="text-2xl text-muted-foreground">/100</span></div>
            <Progress value={score} className={`mt-3 h-2 [&>div]:${bar}`} />
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {signals.map((s) => (
                <div key={s.label} className="flex items-start gap-2 text-xs">
                  {s.ok ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.label}</div>
                    {s.hint && <div className="text-muted-foreground truncate">{s.hint}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {actions.length > 0 && (
          <div className="mt-6 pt-4 border-t space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Próximas ações sugeridas
              <Badge variant="secondary">{actions.length}</Badge>
            </div>
            <div className="grid md:grid-cols-2 gap-2">
              {actions.slice(0, 4).map((a, i) => (
                <button
                  key={i}
                  onClick={() => navigate(a.goto)}
                  className="text-left p-3 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{a.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{a.desc}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
