import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { usePontoEmpresa } from "./usePontoEmpresa";
import { toast } from "sonner";
import { Save, Shield, Scale, Moon, Clock, AlertTriangle, Bell, Plane } from "lucide-react";

const ACOES = [
  { v: "bloquear", l: "🚫 Bloquear" },
  { v: "alertar", l: "⚠️ Apenas alertar" },
  { v: "ignorar", l: "Ignorar" },
];

export default function PontoCltConfig() {
  const { empresaId } = usePontoEmpresa();
  const [cfg, setCfg] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("jornada");

  const load = async () => {
    if (!empresaId) return;
    const { data } = await supabase.from("ponto_clt_config").select("*").eq("empresa_id", empresaId).maybeSingle();
    if (data) { setCfg(data); return; }
    const { data: created } = await supabase.from("ponto_clt_config").insert({ empresa_id: empresaId }).select().single();
    setCfg(created);
  };
  useEffect(() => { load(); }, [empresaId]);

  const set = (k: string, v: any) => setCfg((c: any) => ({ ...c, [k]: v }));

  const save = async () => {
    if (!cfg?.id) return;
    setSaving(true);
    const { id, empresa_id, created_at, updated_at, ...rest } = cfg;
    const { error } = await supabase.from("ponto_clt_config").update(rest).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Configuração salva");
  };

  if (!cfg) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  const Num = ({ field, label, suffix }: { field: string; label: string; suffix?: string }) => (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input type="number" value={cfg[field] ?? 0} onChange={(e) => set(field, parseFloat(e.target.value))} />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );
  const Tog = ({ field, label, desc }: { field: string; label: string; desc?: string }) => (
    <div className="flex items-start gap-3 rounded-md border p-3">
      <Switch checked={!!cfg[field]} onCheckedChange={(v) => set(field, v)} />
      <div className="flex-1">
        <Label className="cursor-pointer">{label}</Label>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </div>
  );
  const Acao = ({ field, label }: { field: string; label: string }) => (
    <div>
      <Label>{label}</Label>
      <Select value={cfg[field]} onValueChange={(v) => set(field, v)}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{ACOES.map(a => <SelectItem key={a.v} value={a.v}>{a.l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );

  const TABS = [
    { v: "jornada", l: "Jornada (CLT)", icon: Scale },
    { v: "noturno", l: "Noturno", icon: Moon },
    { v: "banco", l: "Banco / Anti-dup", icon: Clock },
    { v: "aprovacao", l: "Aprovação", icon: Shield },
    { v: "acoes", l: "Ações por violação", icon: AlertTriangle },
    { v: "fraude", l: "Anti-fraude", icon: AlertTriangle },
    { v: "notif", l: "Notificações", icon: Bell },
    { v: "ferias", l: "Férias", icon: Plane },
  ];
  const [tab, setTab] = useState("jornada");

  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-2xl">
            <Shield className="h-5 w-5 shrink-0" />
            <span className="truncate">Configuração CLT / Portaria 671</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Todos os limites legais são parametrizáveis. Acordo coletivo pode alterar valores padrão da CLT.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" /> Salvar
        </Button>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Aviso jurídico</AlertTitle>
        <AlertDescription className="text-xs sm:text-sm">
          Valores padrão são os mínimos legais da CLT. Mudanças devem ser respaldadas por acordo coletivo, convenção
          ou acordo individual escrito. Bloqueios servem como camada de proteção; alertas geram anomalias para revisão.
        </AlertDescription>
      </Alert>

      <Tabs value={tab} onValueChange={setTab}>
        {/* Mobile: Select. Tablet/Desktop: tabs em grade */}
        <div className="sm:hidden">
          <Select value={tab} onValueChange={setTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TABS.map((t) => (
                <SelectItem key={t.v} value={t.v}>
                  <span className="flex items-center gap-2">
                    <t.icon className="h-4 w-4" /> {t.l}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TabsList className="hidden sm:grid h-auto w-full grid-cols-4 gap-1 lg:grid-cols-8">
          {TABS.map((t) => (
            <TabsTrigger key={t.v} value={t.v} className="text-xs lg:text-sm">
              <t.icon className="mr-1 h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t.l}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="jornada">
          <Card><CardHeader><CardTitle>Limites de jornada (CLT art. 59, 66, 71)</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Num field="max_horas_extras_dia_min" label="Máx. horas extras por dia" suffix="min (120 = 2h)" />
              <Num field="max_jornada_total_dia_min" label="Máx. jornada total por dia" suffix="min (600 = 10h)" />
              <Num field="intervalo_intra_min_obrigatorio" label="Intervalo intrajornada (jornada > 6h)" suffix="min" />
              <Num field="intervalo_intra_min_curto" label="Intervalo intrajornada (jornada 4-6h)" suffix="min" />
              <Num field="horas_trabalho_para_intra_longo" label="Jornada que exige intervalo longo" suffix="min" />
              <Num field="horas_trabalho_para_intra_curto" label="Jornada que exige intervalo curto" suffix="min" />
              <Num field="interjornada_min_horas" label="Interjornada mínima entre turnos" suffix="horas" />
              <Num field="dsr_max_dias_seguidos" label="Máx. dias seguidos sem folga" suffix="dias (CLT = 6)" />
              <Num field="menor_jornada_max_dia_min" label="Jornada máx. menor aprendiz" suffix="min (360 = 6h)" />
              <Tog field="menor_proibir_extras" label="Proibir HE para menor aprendiz" desc="CLT art. 432" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="noturno">
          <Card><CardHeader><CardTitle>Adicional noturno (CLT art. 73)</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div><Label>Início do horário noturno</Label>
                <Input type="time" value={cfg.adic_noturno_inicio || "22:00"} onChange={(e) => set("adic_noturno_inicio", e.target.value)} />
              </div>
              <div><Label>Fim do horário noturno</Label>
                <Input type="time" value={cfg.adic_noturno_fim || "05:00"} onChange={(e) => set("adic_noturno_fim", e.target.value)} />
              </div>
              <Num field="adic_noturno_hora_ficta_min" label="Hora ficta noturna" suffix="min (52'30'' = 53)" />
              <Num field="adic_noturno_percentual" label="Adicional noturno %" suffix="% (mín 20)" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banco">
          <Card><CardHeader><CardTitle>Banco de horas + anti-duplicidade + time-lock</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Num field="banco_horas_prazo_dias" label="Prazo compensação banco horas" suffix="dias (180=6m, 365=1a, 540=18m)" />
              <Tog field="banco_horas_auto_expirar" label="Expirar automaticamente saldos vencidos" />
              <Num field="intervalo_min_entre_batidas_min" label="Intervalo mínimo entre batidas" suffix="min (Portaria 671)" />
              <Num field="time_lock_ajuste_horas" label="Time-lock ajuste após batida" suffix="horas (0 = desligado)" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aprovacao">
          <Card><CardHeader><CardTitle>Regras de aprovação segura</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Num field="exigir_motivo_he_acima_min" label="Exigir motivo em HE >=" suffix="min" />
              <Num field="exigir_anexo_he_acima_min" label="Exigir anexo em HE >=" suffix="min" />
              <Num field="exigir_dupla_aprovacao_acima_min" label="Dupla aprovação em HE >=" suffix="min" />
              <Num field="max_aprovacoes_em_lote" label="Máx. aprovações em lote por usuário" />
              <Tog field="proibir_auto_aprovacao" label="Proibir funcionário aprovar próprio ponto" desc="Segregação de função (recomendado)" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="acoes">
          <Card><CardHeader><CardTitle>Ação ao detectar violação</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Acao field="acao_he_acima_limite" label="HE acima do limite CLT" />
              <Acao field="acao_jornada_acima_limite" label="Jornada total acima do limite" />
              <Acao field="acao_intervalo_violado" label="Intervalo intrajornada violado" />
              <Acao field="acao_interjornada_violada" label="Interjornada violada" />
              <Acao field="acao_dsr_violado" label="DSR violado (>6 dias seguidos)" />
              <Alert className="sm:col-span-2">
                <AlertDescription className="text-xs">
                  <strong>Bloquear</strong>: rejeita o ajuste/batida. <strong>Alertar</strong>: grava anomalia para revisão.
                  <strong> Ignorar</strong>: nada acontece (não recomendado para auditoria).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fraude">
          <Card><CardHeader><CardTitle>Detecção de anomalias / fraude</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Tog field="detectar_batida_simultanea" label="Detectar batida do mesmo CPF em 2 locais simultâneos" />
              <Tog field="detectar_padrao_suspeito" label="Detectar padrões suspeitos (sempre 8h00 exatas)" />
              <Tog field="geofence_violado_marca_revisao" label="Geofence violado → marcar para revisão" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notif">
          <Card><CardHeader><CardTitle>Notificações ao funcionário (Portaria 671 art. 78)</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Tog field="notificar_funcionario_alteracao" label="Notificar funcionário quando seu ponto é alterado" desc="Obrigatório por lei" />
              <Tog field="notificar_email" label="Enviar por email" />
              <Tog field="notificar_push" label="Enviar push (mobile)" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ferias">
          <Card><CardHeader><CardTitle>Férias (Lei 13.467/17)</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Num field="ferias_aviso_dias_minimo" label="Aviso prévio mínimo" suffix="dias (30)" />
              <Num field="ferias_fracionamento_max" label="Máx. períodos de fracionamento" suffix="(até 3)" />
              <Num field="ferias_periodo_minimo_dias" label="Período principal mínimo" suffix="dias (14)" />
              <Num field="ferias_periodo_secundario_min_dias" label="Período secundário mínimo" suffix="dias (5)" />
              <Num field="ferias_abono_max_dias" label="Abono pecuniário máximo" suffix="dias (1/3 = 10)" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
