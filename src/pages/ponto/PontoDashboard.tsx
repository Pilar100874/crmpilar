import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, UserX, Calendar, Wallet, Shield, Activity, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";

type Stat = { label: string; value: string | number; icon: any; tone?: string };

export default function PontoDashboard() {
  const { empresaId } = usePontoEmpresa();
  const [stats, setStats] = useState({
    pendencias: 0, extras: 0, faltas: 0, atrasos: 0, banco: 0, alertas: 0, ativosAgora: 0,
  });
  const [ultimosRegistros, setUltimosRegistros] = useState<any[]>([]);
  const [alertasAbertos, setAlertasAbertos] = useState<any[]>([]);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    if (!empresaId) return;
    const today = new Date().toISOString().slice(0, 10);
    const inicioHoje = `${today}T00:00:00Z`;
    const [funcsRes, ajustesRes, alertasRes, espelhoRes, registrosRes, alertasAbRes] = await Promise.all([
      supabase.from("ponto_funcionarios").select("id").eq("empresa_id", empresaId).eq("status", "ativo"),
      supabase.from("ponto_ajustes").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      supabase.from("ponto_alertas").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId).eq("resolvido", false),
      supabase.from("ponto_espelho_diario").select("atraso_min, extra_min, falta, saldo_banco_min").eq("data", today),
      supabase.from("ponto_registros")
        .select("id, data_hora, tipo, funcionario_id, score_confianca, ponto_funcionarios!inner(nome, empresa_id)")
        .eq("ponto_funcionarios.empresa_id", empresaId)
        .gte("data_hora", inicioHoje)
        .order("data_hora", { ascending: false }).limit(15),
      supabase.from("ponto_alertas")
        .select("id, nivel, categoria, descricao, created_at, ponto_funcionarios(nome)")
        .eq("empresa_id", empresaId).eq("resolvido", false)
        .order("created_at", { ascending: false }).limit(10),
    ]);
    const espelho = (espelhoRes.data || []) as any[];
    const funcIds = (funcsRes.data || []).map((f: any) => f.id);
    // ativos agora = funcionarios com entrada hoje sem saída final
    let ativos = 0;
    if (funcIds.length) {
      const { data: regsHoje } = await supabase.from("ponto_registros")
        .select("funcionario_id, tipo, data_hora")
        .in("funcionario_id", funcIds).gte("data_hora", inicioHoje)
        .order("data_hora", { ascending: true });
      const status: Record<string, string> = {};
      for (const r of regsHoje || []) status[r.funcionario_id] = r.tipo;
      ativos = Object.values(status).filter(t => t === "entrada" || t === "retorno_intervalo").length;
    }
    setStats({
      pendencias: ajustesRes.count || 0,
      extras: espelho.reduce((s, r) => s + (r.extra_min || 0), 0),
      faltas: espelho.filter((r) => r.falta).length,
      atrasos: espelho.filter((r) => (r.atraso_min || 0) > 0).length,
      banco: espelho.reduce((s, r) => s + (r.saldo_banco_min || 0), 0),
      alertas: alertasRes.count || 0,
      ativosAgora: ativos,
    });
    setUltimosRegistros(registrosRes.data || []);
    setAlertasAbertos(alertasAbRes.data || []);
  }, [empresaId]);

  useEffect(() => { load(); }, [load]);

  // Realtime: re-carrega quando há registro ou alerta novo
  useEffect(() => {
    if (!empresaId) return;
    const ch = supabase
      .channel(`ponto-dashboard-${empresaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ponto_registros" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ponto_alertas", filter: `empresa_id=eq.${empresaId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "ponto_ajustes" }, () => load())
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { supabase.removeChannel(ch); };
  }, [empresaId, load]);

  const fmt = (m: number) => {
    const h = Math.floor(Math.abs(m) / 60);
    const mm = Math.abs(m) % 60;
    return `${m < 0 ? "-" : ""}${h}h${String(mm).padStart(2, "0")}`;
  };

  const cards: Stat[] = [
    { label: "Ativos agora", value: stats.ativosAgora, icon: Activity, tone: "text-primary" },
    { label: "Pendências de ajuste", value: stats.pendencias, icon: Clock },
    { label: "Horas extras hoje", value: fmt(stats.extras), icon: Wallet },
    { label: "Faltas hoje", value: stats.faltas, icon: UserX, tone: "text-destructive" },
    { label: "Atrasos hoje", value: stats.atrasos, icon: Calendar },
    { label: "Saldo banco (dia)", value: fmt(stats.banco), icon: Wallet },
    { label: "Alertas abertos", value: stats.alertas, icon: Shield, tone: "text-destructive" },
  ];

  const tone = (n: string) => n === "alto" ? "destructive" : n === "medio" ? "default" : "secondary";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Dashboard RH</h2>
          <p className="text-sm text-muted-foreground">Visão geral do dia</p>
        </div>
        <Badge variant={live ? "default" : "secondary"} className="gap-1">
          <Radio className={`h-3 w-3 ${live ? "animate-pulse" : ""}`} /> {live ? "Ao vivo" : "Conectando…"}
        </Badge>
      </div>

      {!empresaId ? (
        <Card>
          <CardContent className="flex items-center gap-3 py-8">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Cadastre uma empresa em <strong>Empresas</strong> para começar.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
            {cards.map((c, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
                  <c.icon className={`h-4 w-4 ${c.tone ?? "text-muted-foreground"}`} />
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold sm:text-2xl ${c.tone ?? ""}`}>{c.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Últimas marcações</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {ultimosRegistros.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem marcações hoje.</p>
                ) : ultimosRegistros.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b pb-1.5 text-sm">
                    <div>
                      <p className="font-medium">{(r.ponto_funcionarios as any)?.nome}</p>
                      <p className="text-xs text-muted-foreground capitalize">{r.tipo.replace("_", " ")}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs">{new Date(r.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                      {r.score_confianca != null && (
                        <Badge variant={r.score_confianca < 60 ? "destructive" : "secondary"} className="text-[10px] h-4">
                          {r.score_confianca}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Alertas em aberto</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-y-auto">
                {alertasAbertos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum alerta aberto. 🎉</p>
                ) : alertasAbertos.map((a) => (
                  <div key={a.id} className="flex items-start gap-2 border-b pb-1.5 text-sm">
                    <Badge variant={tone(a.nivel) as any} className="text-[10px]">{a.nivel}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{a.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {(a.ponto_funcionarios as any)?.nome} · {a.categoria}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

