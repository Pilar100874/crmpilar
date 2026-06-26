import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { CalendarDays, Scale, Plus, Trash2, CheckCircle2, FileSignature, Users, Info } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { format, addDays, eachDayOfInterval, isWeekend, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Acordo = {
  id: string;
  empresa_id: string;
  titulo: string;
  motivo: string;
  feriado_data: string | null;
  data_inicio_compensacao: string;
  data_fim_compensacao: string;
  dias_dispensados: string[];
  dias_compensacao: string[];
  minutos_por_dia: number;
  total_minutos_a_compensar: number;
  usa_banco_horas: boolean;
  modalidade: string;
  base_legal: string | null;
  status: string;
  observacoes: string | null;
  aprovado_em: string | null;
  created_at: string;
};

type Empresa = { id: string; razao_social: string };
type Funcionario = { id: string; nome: string; matricula: string | null; empresa_id: string };

const MOTIVOS = [
  { v: "emenda_feriado", l: "Emenda de feriado / ponte" },
  { v: "ponte_recesso", l: "Recesso / fim de ano" },
  { v: "evento_extraordinario", l: "Evento extraordinário (clima, manutenção)" },
  { v: "outro", l: "Outro" },
];

const MODALIDADES = [
  { v: "acordo_individual", l: "Acordo individual (assinatura do empregado)" },
  { v: "acordo_coletivo", l: "Acordo coletivo / convenção (sindicato)" },
  { v: "decisao_empresa", l: "Decisão da empresa (regime de compensação)" },
];

export default function PontoCompensacao() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState<string>("");
  const [acordos, setAcordos] = useState<Acordo[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(false);
  const [openNovo, setOpenNovo] = useState(false);
  const [openPart, setOpenPart] = useState<Acordo | null>(null);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [selFuncs, setSelFuncs] = useState<Set<string>>(new Set());
  const [delId, setDelId] = useState<string | null>(null);

  // form
  const [form, setForm] = useState({
    titulo: "",
    motivo: "emenda_feriado",
    modalidade: "acordo_individual",
    feriado_data: "",
    data_inicio_compensacao: "",
    data_fim_compensacao: "",
    minutos_por_dia: 60,
    usa_banco_horas: false,
    observacoes: "",
    dias_dispensados: "" as string,
    excluir_fds: true,
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("ponto_empresas").select("id,razao_social").order("razao_social");
      setEmpresas(data || []);
      if (data?.[0]) setEmpresaId(data[0].id);
    })();
  }, []);

  useEffect(() => { if (empresaId) { loadAcordos(); loadFuncs(); } }, [empresaId]);

  async function loadAcordos() {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("ponto_compensacao_acordos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) return toast.error(error.message);
    setAcordos((data as any) || []);
  }
  async function loadFuncs() {
    const { data } = await supabase
      .from("ponto_funcionarios")
      .select("id,nome,matricula,empresa_id")
      .eq("empresa_id", empresaId)
      .eq("ativo", true)
      .order("nome");
    setFuncionarios((data as any) || []);
  }

  const previa = useMemo(() => {
    if (!form.data_inicio_compensacao || !form.data_fim_compensacao) return null;
    try {
      const dias = eachDayOfInterval({
        start: parseISO(form.data_inicio_compensacao),
        end: parseISO(form.data_fim_compensacao),
      }).filter((d) => !form.excluir_fds || !isWeekend(d));
      const totalMin = dias.length * Number(form.minutos_por_dia || 0);
      const dispCount = (form.dias_dispensados || "").split(",").map((s) => s.trim()).filter(Boolean).length;
      const necessario = dispCount * 8 * 60; // 8h/dia padrão
      return { diasUteis: dias.length, totalMin, necessario, dispCount, datas: dias.map((d) => format(d, "yyyy-MM-dd")) };
    } catch { return null; }
  }, [form]);

  async function salvarAcordo() {
    if (!empresaId) return toast.error("Selecione a empresa");
    if (!form.titulo || !form.data_inicio_compensacao || !form.data_fim_compensacao)
      return toast.error("Preencha título e período de compensação");
    const dispensados = (form.dias_dispensados || "").split(",").map((s) => s.trim()).filter(Boolean);
    const { error } = await (supabase as any).from("ponto_compensacao_acordos").insert({
      empresa_id: empresaId,
      titulo: form.titulo,
      motivo: form.motivo,
      modalidade: form.modalidade,
      feriado_data: form.feriado_data || null,
      data_inicio_compensacao: form.data_inicio_compensacao,
      data_fim_compensacao: form.data_fim_compensacao,
      minutos_por_dia: Number(form.minutos_por_dia),
      total_minutos_a_compensar: (previa?.totalMin) || 0,
      usa_banco_horas: form.usa_banco_horas,
      dias_dispensados: dispensados,
      dias_compensacao: previa?.datas || [],
      observacoes: form.observacoes,
      status: "rascunho",
    });
    if (error) return toast.error(error.message);
    toast.success("Acordo criado");
    setOpenNovo(false);
    setForm({ ...form, titulo: "", observacoes: "", dias_dispensados: "" });
    loadAcordos();
  }

  async function ativar(a: Acordo) {
    const { error } = await (supabase as any)
      .from("ponto_compensacao_acordos")
      .update({ status: "ativo", aprovado_em: new Date().toISOString() })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    toast.success("Acordo ativado");
    loadAcordos();
  }
  async function concluir(a: Acordo) {
    const { error } = await (supabase as any).from("ponto_compensacao_acordos").update({ status: "concluido" }).eq("id", a.id);
    if (error) return toast.error(error.message);
    loadAcordos();
  }
  async function cancelar(a: Acordo) {
    const { error } = await (supabase as any).from("ponto_compensacao_acordos").update({ status: "cancelado" }).eq("id", a.id);
    if (error) return toast.error(error.message);
    loadAcordos();
  }
  async function excluir() {
    if (!delId) return;
    const { error } = await (supabase as any).from("ponto_compensacao_acordos").delete().eq("id", delId);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    setDelId(null);
    loadAcordos();
  }

  async function openParticipantes(a: Acordo) {
    setOpenPart(a);
    setSelFuncs(new Set());
    const { data } = await supabase
      .from("ponto_compensacao_participantes")
      .select("*")
      .eq("acordo_id", a.id);
    setParticipantes(data || []);
  }
  async function addParticipantes() {
    if (!openPart) return;
    const rows = Array.from(selFuncs).map((funcionario_id) => ({
      acordo_id: openPart.id,
      funcionario_id,
      status: "pendente",
    }));
    if (!rows.length) return toast.error("Selecione funcionários");
    const { error } = await (supabase as any).from("ponto_compensacao_participantes").upsert(rows, { onConflict: "acordo_id,funcionario_id" });
    if (error) return toast.error(error.message);
    toast.success(`${rows.length} adicionado(s)`);
    openParticipantes(openPart);
  }
  async function removerPart(id: string) {
    await (supabase as any).from("ponto_compensacao_participantes").delete().eq("id", id);
    if (openPart) openParticipantes(openPart);
  }
  async function marcarAceito(id: string) {
    await supabase
      .from("ponto_compensacao_participantes")
      .update({ status: "aceito", aceito_em: new Date().toISOString() })
      .eq("id", id);
    if (openPart) openParticipantes(openPart);
  }

  const statusColor = (s: string) =>
    s === "ativo" ? "default" : s === "concluido" ? "secondary" : s === "cancelado" ? "destructive" : "outline";

  return (
    <div className="space-y-4 p-4 max-w-full overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Scale className="h-6 w-6" /> Compensação de Jornada</h1>
          <p className="text-sm text-muted-foreground">Acordos para emendar feriados, pontes e recessos dentro da CLT.</p>
        </div>
        <div className="flex gap-2">
          <Select value={empresaId} onValueChange={setEmpresaId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>{empresas.map((e) => <SelectItem key={e.id} value={e.id}>{e.razao_social}</SelectItem>)}</SelectContent>
          </Select>
          <Dialog open={openNovo} onOpenChange={setOpenNovo}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Novo acordo</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo acordo de compensação</DialogTitle>
                <DialogDescription>Compense dia(s) dispensados trabalhando alguns minutos a mais em outros dias.</DialogDescription>
              </DialogHeader>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Base legal</AlertTitle>
                <AlertDescription className="text-xs">
                  CLT art. 59 e 59-B (regime de compensação), CF art. 7º XIII e Súmula 85 TST. Acordo individual escrito é válido para compensação dentro do mesmo mês. Para período superior, use acordo coletivo / convenção.
                </AlertDescription>
              </Alert>

              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div className="md:col-span-2">
                  <Label>Título</Label>
                  <Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ex.: Emenda Corpus Christi 2026" />
                </div>
                <div>
                  <Label>Motivo</Label>
                  <Select value={form.motivo} onValueChange={(v) => setForm({ ...form, motivo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MOTIVOS.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Modalidade</Label>
                  <Select value={form.modalidade} onValueChange={(v) => setForm({ ...form, modalidade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MODALIDADES.map((m) => <SelectItem key={m.v} value={m.v}>{m.l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Feriado/data referência</Label>
                  <Input type="date" value={form.feriado_data} onChange={(e) => setForm({ ...form, feriado_data: e.target.value })} />
                </div>
                <div>
                  <Label>Dias dispensados (datas separadas por vírgula)</Label>
                  <Input value={form.dias_dispensados} onChange={(e) => setForm({ ...form, dias_dispensados: e.target.value })} placeholder="2026-06-05" />
                </div>
                <div>
                  <Label>Início da compensação</Label>
                  <Input type="date" value={form.data_inicio_compensacao} onChange={(e) => setForm({ ...form, data_inicio_compensacao: e.target.value })} />
                </div>
                <div>
                  <Label>Fim da compensação</Label>
                  <Input type="date" value={form.data_fim_compensacao} onChange={(e) => setForm({ ...form, data_fim_compensacao: e.target.value })} />
                </div>
                <div>
                  <Label>Minutos extras por dia útil</Label>
                  <Input type="number" min={5} max={120} value={form.minutos_por_dia} onChange={(e) => setForm({ ...form, minutos_por_dia: Number(e.target.value) })} />
                  <p className="text-xs text-muted-foreground mt-1">Máx. 2h/dia (CLT art. 59).</p>
                </div>
                <div className="flex items-center gap-2 mt-6">
                  <Switch checked={form.excluir_fds} onCheckedChange={(v) => setForm({ ...form, excluir_fds: v })} />
                  <Label>Excluir sábados e domingos</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.usa_banco_horas} onCheckedChange={(v) => setForm({ ...form, usa_banco_horas: v })} />
                  <Label>Lançar como banco de horas</Label>
                </div>
                <div className="md:col-span-2">
                  <Label>Observações</Label>
                  <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} />
                </div>
              </div>

              {previa && (
                <Card className="mt-3 bg-muted/40">
                  <CardContent className="pt-4 text-sm space-y-1">
                    <div><b>{previa.diasUteis}</b> dias úteis × <b>{form.minutos_por_dia}</b> min = <b>{Math.floor(previa.totalMin/60)}h{previa.totalMin%60 ? `${previa.totalMin%60}m`:""}</b></div>
                    <div>Necessário compensar: <b>{Math.floor(previa.necessario/60)}h</b> ({previa.dispCount} dia(s) × 8h)</div>
                    {previa.totalMin < previa.necessario && previa.dispCount > 0 && (
                      <div className="text-destructive">⚠ Saldo insuficiente — aumente os minutos/dia ou estenda o período.</div>
                    )}
                    {form.minutos_por_dia > 120 && <div className="text-destructive">⚠ Acima do limite legal de 2h extras/dia.</div>}
                  </CardContent>
                </Card>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpenNovo(false)}>Cancelar</Button>
                <Button onClick={salvarAcordo}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="ativos">
        <TabsList>
          <TabsTrigger value="ativos">Ativos / Rascunho</TabsTrigger>
          <TabsTrigger value="concluidos">Concluídos / Cancelados</TabsTrigger>
        </TabsList>
        {(["ativos","concluidos"] as const).map((tab) => (
          <TabsContent key={tab} value={tab} className="space-y-3 mt-3">
            {loading && <p className="text-sm text-muted-foreground">Carregando...</p>}
            {acordos
              .filter((a) => tab === "ativos" ? ["rascunho","ativo"].includes(a.status) : ["concluido","cancelado"].includes(a.status))
              .map((a) => (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {a.titulo} <Badge variant={statusColor(a.status) as any}>{a.status}</Badge>
                        {a.usa_banco_horas && <Badge variant="outline">Banco de horas</Badge>}
                      </CardTitle>
                      <CardDescription className="flex flex-wrap gap-3 mt-1 text-xs">
                        <span><CalendarDays className="inline h-3 w-3 mr-1" />{format(parseISO(a.data_inicio_compensacao),"dd/MM/yy")} → {format(parseISO(a.data_fim_compensacao),"dd/MM/yy")}</span>
                        <span>+{a.minutos_por_dia} min/dia</span>
                        <span>Total: {Math.floor((a.total_minutos_a_compensar||0)/60)}h</span>
                        <span>{MOTIVOS.find(m=>m.v===a.motivo)?.l}</span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openParticipantes(a)}><Users className="h-4 w-4 mr-1" />Funcionários</Button>
                      {a.status === "rascunho" && <Button size="sm" onClick={() => ativar(a)}><CheckCircle2 className="h-4 w-4 mr-1" />Ativar</Button>}
                      {a.status === "ativo" && <Button size="sm" variant="secondary" onClick={() => concluir(a)}>Concluir</Button>}
                      {["rascunho","ativo"].includes(a.status) && <Button size="sm" variant="ghost" onClick={() => cancelar(a)}>Cancelar</Button>}
                      <Button size="sm" variant="ghost" onClick={() => setDelId(a.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </CardHeader>
                {a.observacoes && <CardContent className="text-xs text-muted-foreground pt-0">{a.observacoes}</CardContent>}
              </Card>
            ))}
            {!loading && acordos.filter((a) => tab === "ativos" ? ["rascunho","ativo"].includes(a.status) : ["concluido","cancelado"].includes(a.status)).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum acordo.</p>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={!!openPart} onOpenChange={(v) => !v && setOpenPart(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Funcionários — {openPart?.titulo}</DialogTitle>
            <DialogDescription>Vincule e colete a adesão dos empregados.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label>Adicionar funcionários</Label>
            <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-1">
              {funcionarios.map((f) => {
                const checked = selFuncs.has(f.id);
                const ja = participantes.some((p) => p.funcionario_id === f.id);
                return (
                  <label key={f.id} className={`flex items-center gap-2 text-sm p-1 rounded ${ja ? "opacity-50" : "hover:bg-muted"}`}>
                    <input type="checkbox" disabled={ja} checked={checked} onChange={(e) => {
                      const n = new Set(selFuncs);
                      e.target.checked ? n.add(f.id) : n.delete(f.id);
                      setSelFuncs(n);
                    }} />
                    {f.nome} {f.matricula && <span className="text-xs text-muted-foreground">#{f.matricula}</span>}
                    {ja && <span className="text-xs ml-auto">já vinculado</span>}
                  </label>
                );
              })}
            </div>
            <Button size="sm" onClick={addParticipantes}><Plus className="h-4 w-4 mr-1" />Vincular selecionados</Button>
          </div>

          <div className="mt-4 space-y-1">
            <Label>Participantes ({participantes.length})</Label>
            <div className="max-h-64 overflow-y-auto border rounded">
              {participantes.length === 0 && <p className="text-xs p-3 text-muted-foreground">Nenhum participante ainda.</p>}
              {participantes.map((p) => {
                const f = funcionarios.find((x) => x.id === p.funcionario_id);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 p-2 text-sm border-b last:border-0">
                    <div>
                      <div>{f?.nome || p.funcionario_id}</div>
                      <Badge variant={p.status === "aceito" ? "default" : "outline"} className="text-[10px] mt-1">{p.status}</Badge>
                    </div>
                    <div className="flex gap-1">
                      {p.status !== "aceito" && <Button size="sm" variant="outline" onClick={() => marcarAceito(p.id)}><FileSignature className="h-3 w-3 mr-1" />Marcar assinado</Button>}
                      <Button size="sm" variant="ghost" onClick={() => removerPart(p.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!delId}
        onOpenChange={(v) => !v && setDelId(null)}
        onConfirm={excluir}
        title="Excluir acordo?"
        description="Esta ação removerá o acordo e seus participantes."
      />
    </div>
  );
}
