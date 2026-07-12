import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2, Circle, ArrowRight, ArrowLeft, ExternalLink, Loader2,
  Key, Link2, Zap, Clock, PlayCircle, Sparkles, Info,
} from "lucide-react";
import { toast } from "sonner";

type Step = {
  id: string;
  title: string;
  subtitle: string;
  icon: any;
  check: (estabId: string) => Promise<boolean>;
  goto: string;
  cta: string;
  body: React.ReactNode;
};

const steps: Step[] = [
  {
    id: "apps",
    title: "1. Apps das Plataformas",
    subtitle: "Cadastre uma vez as chaves de desenvolvedor",
    icon: Key,
    goto: "/ads/platform-apps",
    cta: "Abrir Apps das Plataformas",
    check: async (estabId) => {
      const { data } = await supabase.from("ads_platform_apps" as any).select("meta_app_id, google_client_id, tiktok_app_id").eq("estabelecimento_id", estabId).maybeSingle() as any;
      return !!(data && (data.meta_app_id || data.google_client_id || data.tiktok_app_id));
    },
    body: (
      <div className="space-y-2 text-sm">
        <p>Cadastre pelo menos uma das plataformas de anúncio. Você precisa criar um <b>app de desenvolvedor</b> em cada portal e copiar as credenciais:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li><b>Meta Ads:</b> <a className="underline" target="_blank" href="https://developers.facebook.com/apps/" rel="noreferrer">developers.facebook.com</a> → criar App → adicionar <i>Marketing API</i> → copiar App ID e App Secret.</li>
          <li><b>Google Ads:</b> Client ID/Secret em <a className="underline" target="_blank" href="https://console.cloud.google.com/apis/credentials" rel="noreferrer">console.cloud.google.com</a> + Developer Token em <a className="underline" target="_blank" href="https://ads.google.com" rel="noreferrer">ads.google.com</a> → Ferramentas → API Center.</li>
          <li><b>TikTok Ads:</b> <a className="underline" target="_blank" href="https://business-api.tiktok.com/portal" rel="noreferrer">business-api.tiktok.com/portal</a> → criar App → copiar App ID e App Secret.</li>
        </ul>
        <p className="text-xs text-muted-foreground">Sem essa etapa o sistema ainda funciona, mas não renova tokens sozinho.</p>
      </div>
    ),
  },
  {
    id: "credentials",
    title: "2. Credenciais das Contas de Anúncio",
    subtitle: "Conecte cada conta que quer monitorar",
    icon: Link2,
    goto: "/ads/hub",
    cta: "Abrir Credenciais",
    check: async (estabId) => {
      const { count } = await supabase.from("ad_accounts").select("id", { count: "exact", head: true }).eq("estabelecimento_id", estabId);
      return (count || 0) > 0;
    },
    body: (
      <div className="space-y-2 text-sm">
        <p>Adicione as contas de anúncio que serão monitoradas. Para cada uma preencha:</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li><b>Meta:</b> Access Token de longa duração + Ad Account ID (ex: <code>act_123...</code>).</li>
          <li><b>Google Ads:</b> Refresh Token OAuth + Customer ID (sem hífens).</li>
          <li><b>TikTok:</b> Access Token + Advertiser ID.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "automation",
    title: "3. Criar uma Automação",
    subtitle: "Defina gatilhos, condições e ações",
    icon: Zap,
    goto: "/ads/automation",
    cta: "Criar Automação",
    check: async (estabId) => {
      const { count } = await supabase.from("ads_automacoes").select("id", { count: "exact", head: true }).eq("estabelecimento_id", estabId).eq("ativo", true);
      return (count || 0) > 0;
    },
    body: (
      <div className="space-y-2 text-sm">
        <p>No editor visual arraste blocos: <b>Gatilho</b> (ex: ROAS &lt; 1) → <b>Condição</b> (ex: plataforma = Meta) → <b>Ação</b> (pausar, aumentar orçamento, alertar por e-mail/SMS/push).</p>
        <p className="text-muted-foreground">Marque a automação como <b>Ativa</b> para ser executada pelo scheduler.</p>
      </div>
    ),
  },
  {
    id: "scheduler",
    title: "4. Configurar Agendamento",
    subtitle: "Escolha a frequência de execução",
    icon: Clock,
    goto: "/ads/scheduler",
    cta: "Abrir Agendamento",
    check: async (estabId) => {
      const { data } = await supabase.from("ads_scheduler_config" as any).select("ativo").eq("estabelecimento_id", estabId).maybeSingle();
      return !!(data && (data as any).ativo);
    },
    body: (
      <div className="space-y-2 text-sm">
        <p>Ative o agendador e escolha: <b>15 min</b>, <b>1 hora</b>, <b>1x ao dia</b> ou cron customizado.</p>
        <p className="text-muted-foreground">O sistema roda um verificador global a cada minuto e dispara sua execução no horário certo.</p>
      </div>
    ),
  },
  {
    id: "test",
    title: "5. Testar Execução",
    subtitle: "Rode manualmente para validar",
    icon: PlayCircle,
    goto: "/ads/scheduler",
    cta: "Executar Agora",
    check: async (estabId) => {
      const { count } = await supabase.from("ads_logs_coleta").select("id", { count: "exact", head: true }).eq("estabelecimento_id", estabId).in("tipo", ["execucao", "acao_executada"]);
      return (count || 0) > 0;
    },
    body: (
      <div className="space-y-2 text-sm">
        <p>Na tela de Agendamento clique em <b>Executar Agora</b>. O sistema vai:</p>
        <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
          <li>Renovar tokens expirados;</li>
          <li>Coletar métricas Meta/Google/TikTok;</li>
          <li>Avaliar suas automações e disparar ações reais.</li>
        </ol>
        <p>Confira os resultados em <b>Ads &gt; Logs de Coleta</b>.</p>
      </div>
    ),
  },
];

export default function AdsSetupWizard() {
  const navigate = useNavigate();
  const [estabId, setEstabId] = useState<string | null>(null);
  const [current, setCurrent] = useState(0);
  const [status, setStatus] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(true);

  const recheck = async () => {
    if (!estabId) return;
    setChecking(true);
    try {
      const results: Record<string, boolean> = {};
      for (const s of steps) results[s.id] = await s.check(estabId);
      setStatus(results);
      const firstOpen = steps.findIndex((s) => !results[s.id]);
      if (firstOpen >= 0) setCurrent(firstOpen);
    } catch (e: any) {
      toast.error("Erro ao verificar: " + e.message);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { (async () => { try { setEstabId(await getEstabelecimentoId()); } catch { /* noop */ } })(); }, []);
  useEffect(() => { if (estabId) recheck(); /* eslint-disable-next-line */ }, [estabId]);

  const done = Object.values(status).filter(Boolean).length;
  const pct = Math.round((done / steps.length) * 100);
  const step = steps[current];
  const StepIcon = step.icon;

  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-primary shrink-0" />
            <span className="truncate">Wizard de Configuração Ads</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">Siga os 5 passos para deixar o sistema de anúncios rodando ponta-a-ponta.</p>
        </div>
        <Button variant="outline" onClick={recheck} disabled={checking} className="w-full sm:w-auto shrink-0">
          {checking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Reverificar
        </Button>
      </div>


      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progresso</span>
            <Badge variant={done === steps.length ? "default" : "secondary"}>
              {done} de {steps.length} concluídos
            </Badge>
          </div>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 md:gap-6">
        <div className="space-y-2">
          {steps.map((s, i) => {
            const ok = status[s.id];
            const active = i === current;
            return (
              <button
                key={s.id}
                onClick={() => setCurrent(i)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${active ? "bg-primary/10 border-primary" : "hover:bg-muted border-border"}`}
              >
                <div className="flex items-start gap-2">
                  {ok ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" /> : <Circle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.subtitle}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <div className="p-2 rounded-md bg-primary/10">
                <StepIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle>{step.title}</CardTitle>
                <CardDescription>{step.subtitle}</CardDescription>
              </div>
              {status[step.id] && <Badge className="bg-green-500/20 text-green-600 border-green-500/30">Concluído</Badge>}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {step.body}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Após terminar esta etapa, clique em <b>Reverificar</b> no topo para atualizar o progresso.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Anterior
              </Button>
              <div className="flex gap-2">
                <Button onClick={() => navigate(step.goto)}>
                  {step.cta} <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                <Button variant="secondary" disabled={current === steps.length - 1} onClick={() => setCurrent(current + 1)}>
                  Próximo <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {done === steps.length && (
        <Alert className="border-green-500/30 bg-green-500/10">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700 dark:text-green-400">
            <b>Tudo pronto!</b> Suas automações Ads estão configuradas e rodando conforme o agendamento.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
