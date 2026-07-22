import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Pencil, Trash2, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";

type Escala = any;

const DIAS = [
  { key: "dom", label: "Domingo" },
  { key: "seg", label: "Segunda" },
  { key: "ter", label: "Terça" },
  { key: "qua", label: "Quarta" },
  { key: "qui", label: "Quinta" },
  { key: "sex", label: "Sexta" },
  { key: "sab", label: "Sábado" },
];

type JornadaDia = {
  classificacao: "trabalho" | "descanso";
  entrada1: string;
  saida1: string;
  entrada2: string;
  saida2: string;
  intervalo_principal: string;
  horario_virada: string;
  limite_he50: string;
};

const diaPadrao = (trabalho = true): JornadaDia => ({
  classificacao: trabalho ? "trabalho" : "descanso",
  entrada1: trabalho ? "08:00" : "",
  saida1: trabalho ? "12:00" : "",
  entrada2: trabalho ? "13:00" : "",
  saida2: trabalho ? "17:00" : "",
  intervalo_principal: "",
  horario_virada: "23:59",
  limite_he50: "02:00",
});

const jornadaDefault = (): Record<string, JornadaDia> => ({
  dom: diaPadrao(false),
  seg: diaPadrao(true),
  ter: diaPadrao(true),
  qua: diaPadrao(true),
  qui: diaPadrao(true),
  sex: diaPadrao(true),
  sab: diaPadrao(false),
});

const intervaloPreDefault = () => ({
  ativo: false,
  aplicar_todos: false,
  aplicar_diferente_previsto: false,
  aplicar_sem_jornada: false,
  gerar_intervalo: "",
  quando_exceder: "",
  aplicar_periodo: false,
  gerar_intervalo_periodo: "",
  quando_exceder_periodo: "",
});

const intrajornadaDefault = () => ({
  tempo_faltante: "nao_utilizar",
  lancar_he: false,
  considerar_limite: "nenhum",
  limite_contratado: "",
  dias_considerar: [] as string[],
});

const feriadosDefault = () => ({
  classificacao: "descanso",
  entrada1: "",
  saida1: "",
  entrada2: "",
  saida2: "",
});

const emptyForm = () => ({
  codigo: "",
  nome: "",
  descricao: "",
  tipo: "semanal",
  intervalo: "60",
  carga_semanal: "44",
  noturna: false,
  ativo: true,
  hora_desconto_dsr: "",
  marcacao_excecao: false,
  ignorar_feriados: false,
  ignorar_afastamento_ciclico: false,
  jornada_flexivel: false,
  aplicar_tolerancia_flexivel: false,
  intervalo_flexivel: false,
  controlar_nr17: false,
  jornada: jornadaDefault(),
  intervalo_preassinalado: intervaloPreDefault(),
  intrajornada_config: intrajornadaDefault(),
  jornada_feriados: feriadosDefault(),
});

export default function PontoEscalas() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<Escala[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Escala | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleting, setDeleting] = useState<Escala | null>(null);
  const [tab, setTab] = useState("geral");

  const load = async () => {
    if (!empresaId) return;
    const { data } = await (supabase as any)
      .from("ponto_escalas")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome");
    setItems((data as Escala[]) || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const openCreate = () => { setEditing(null); setForm(emptyForm()); setOpen(true); };
  const openEdit = (x: Escala) => {
    setEditing(x);
    const j = (x.jornada && typeof x.jornada === "object" && !Array.isArray(x.jornada)) ? x.jornada : {};
    const mergedJornada: Record<string, JornadaDia> = { ...jornadaDefault() };
    for (const k of Object.keys(mergedJornada)) {
      mergedJornada[k] = { ...mergedJornada[k], ...(j[k] || {}) };
    }
    setForm({
      codigo: x.codigo ?? "",
      nome: x.nome ?? "",
      descricao: x.descricao ?? "",
      tipo: x.tipo || "semanal",
      intervalo: x.intervalo_minutos != null ? String(x.intervalo_minutos) : "60",
      carga_semanal: x.carga_semanal_minutos != null ? String(Math.round(x.carga_semanal_minutos / 60)) : "44",
      noturna: !!x.noturna,
      ativo: !!x.ativo,
      hora_desconto_dsr: x.hora_desconto_dsr ?? "",
      marcacao_excecao: !!x.marcacao_excecao,
      ignorar_feriados: !!x.ignorar_feriados,
      ignorar_afastamento_ciclico: !!x.ignorar_afastamento_ciclico,
      jornada_flexivel: !!x.jornada_flexivel,
      aplicar_tolerancia_flexivel: !!x.aplicar_tolerancia_flexivel,
      intervalo_flexivel: !!x.intervalo_flexivel,
      controlar_nr17: !!x.controlar_nr17,
      jornada: mergedJornada,
      intervalo_preassinalado: { ...intervaloPreDefault(), ...(x.intervalo_preassinalado || {}) },
      intrajornada_config: { ...intrajornadaDefault(), ...(x.intrajornada_config || {}) },
      jornada_feriados: { ...feriadosDefault(), ...(x.jornada_feriados || {}) },
    });
    setOpen(true);
  };

  const save = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa");
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    const payload: any = {
      empresa_id: empresaId,
      codigo: form.codigo.trim() || null,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      tipo: form.tipo,
      jornada: form.jornada,
      intervalo_minutos: Number(form.intervalo) || 0,
      carga_semanal_minutos: (Number(form.carga_semanal) || 0) * 60,
      noturna: form.noturna,
      ativo: form.ativo,
      hora_desconto_dsr: form.hora_desconto_dsr || null,
      marcacao_excecao: form.marcacao_excecao,
      ignorar_feriados: form.ignorar_feriados,
      ignorar_afastamento_ciclico: form.ignorar_afastamento_ciclico,
      jornada_flexivel: form.jornada_flexivel,
      aplicar_tolerancia_flexivel: form.aplicar_tolerancia_flexivel,
      intervalo_flexivel: form.intervalo_flexivel,
      controlar_nr17: form.controlar_nr17,
      intervalo_preassinalado: form.intervalo_preassinalado,
      intrajornada_config: form.intrajornada_config,
      jornada_feriados: form.jornada_feriados,
    };
    const { error } = editing
      ? await (supabase as any).from("ponto_escalas").update(payload).eq("id", editing.id)
      : await (supabase as any).from("ponto_escalas").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await (supabase as any).from("ponto_escalas").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Excluída");
    setDeleting(null);
    load();
  };

  // helpers
  const setJ = (dia: string, patch: Partial<JornadaDia>) =>
    setForm({ ...form, jornada: { ...form.jornada, [dia]: { ...form.jornada[dia], ...patch } } });
  const setPre = (patch: any) =>
    setForm({ ...form, intervalo_preassinalado: { ...form.intervalo_preassinalado, ...patch } });
  const setIntra = (patch: any) =>
    setForm({ ...form, intrajornada_config: { ...form.intrajornada_config, ...patch } });
  const setFer = (patch: any) =>
    setForm({ ...form, jornada_feriados: { ...form.jornada_feriados, ...patch } });

  const preencherSemana = () => {
    // copia segunda em todos os dias úteis
    const base = form.jornada.seg;
    const next = { ...form.jornada };
    for (const d of ["ter", "qua", "qui", "sex"]) next[d] = { ...next[d], ...base };
    setForm({ ...form, jornada: next });
  };

  const cargaSemanaCalc = (() => {
    let min = 0;
    for (const k of Object.keys(form.jornada)) {
      const d = form.jornada[k];
      if (d.classificacao !== "trabalho") continue;
      const calc = (a: string, b: string) => {
        if (!a || !b) return 0;
        const [ah, am] = a.split(":").map(Number);
        const [bh, bm] = b.split(":").map(Number);
        return Math.max(0, (bh * 60 + bm) - (ah * 60 + am));
      };
      min += calc(d.entrada1, d.saida1) + calc(d.entrada2, d.saida2);
    }
    return min;
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Escalas / Jornadas</h2>
          <p className="text-sm text-muted-foreground">
            Defina turno, jornada, intervalo pré-assinalado, intrajornada e jornada em feriados.
          </p>
        </div>
        <Button onClick={openCreate} disabled={!empresaId} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Nova escala
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CalendarClock className="h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {empresaId ? "Nenhuma escala cadastrada." : "Selecione uma empresa primeiro."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => (
            <Card key={x.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {x.codigo ? `${x.codigo} · ` : ""}{x.nome}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="secondary" className="text-xs">{x.tipo}</Badge>
                      {x.jornada_flexivel && <Badge variant="outline" className="text-xs">Flexível</Badge>}
                      {x.noturna && <Badge variant="outline" className="text-xs">Noturna</Badge>}
                      {x.controlar_nr17 && <Badge variant="outline" className="text-xs">NR-17</Badge>}
                      {!x.ativo && <Badge variant="destructive" className="text-xs">Inativa</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(x)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleting(x)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  Carga semanal: {x.carga_semanal_minutos != null ? `${Math.round(x.carga_semanal_minutos / 60)}h` : "—"} ·
                  Intervalo: {x.intervalo_minutos ?? 0}min
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl w-[97vw] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar escala" : "Nova escala"}</DialogTitle>
          </DialogHeader>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <div className="sm:hidden mb-2">
              <Select value={tab} onValueChange={setTab}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="geral">Geral</SelectItem>
                  <SelectItem value="jornada">Jornada</SelectItem>
                  <SelectItem value="pre">Intervalo pré-assinalado</SelectItem>
                  <SelectItem value="intra">Intrajornada</SelectItem>
                  <SelectItem value="feriados">Feriados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <TabsList className="hidden sm:grid w-full grid-cols-3 md:grid-cols-5 h-auto">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="jornada">Jornada</TabsTrigger>
              <TabsTrigger value="pre" className="text-xs md:text-sm">Intervalo pré</TabsTrigger>
              <TabsTrigger value="intra">Intrajornada</TabsTrigger>
              <TabsTrigger value="feriados">Feriados</TabsTrigger>
            </TabsList>

            {/* GERAL */}
            <TabsContent value="geral" className="mt-3">
              <div className="grid gap-3 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <Label>Código</Label>
                  <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="0010" />
                </div>
                <div className="sm:col-span-4">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Comercial 44h" />
                </div>
                <div className="sm:col-span-6">
                  <Label>Descrição do turno</Label>
                  <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="DAS 08:00 AS 17:00" />
                </div>
                <div className="sm:col-span-2">
                  <Label>Tipo do turno</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="ciclico">Cíclico</SelectItem>
                      <SelectItem value="flexivel">Flexível</SelectItem>
                      <SelectItem value="12x36">12x36</SelectItem>
                      <SelectItem value="6x1">6x1</SelectItem>
                      <SelectItem value="5x2">5x2</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Hora padrão desconto DSR</Label>
                  <Input type="time" value={form.hora_desconto_dsr} onChange={(e) => setForm({ ...form, hora_desconto_dsr: e.target.value })} />
                </div>
                <div className="sm:col-span-1">
                  <Label>Carga semanal (h)</Label>
                  <Input type="number" value={form.carga_semanal} onChange={(e) => setForm({ ...form, carga_semanal: e.target.value })} />
                </div>
                <div className="sm:col-span-1">
                  <Label>Intervalo (min)</Label>
                  <Input type="number" value={form.intervalo} onChange={(e) => setForm({ ...form, intervalo: e.target.value })} />
                </div>

                <div className="sm:col-span-6 mt-2 grid grid-cols-2 gap-2 rounded-md border p-3 md:grid-cols-3">
                  {[
                    ["marcacao_excecao", "Marcação por exceção"],
                    ["ignorar_feriados", "Ignorar feriados"],
                    ["ignorar_afastamento_ciclico", "Ignorar afastamento/férias em turno cíclico"],
                    ["jornada_flexivel", "Usar jornada flexível"],
                    ["aplicar_tolerancia_flexivel", "Aplicar tolerância em jornada flexível"],
                    ["intervalo_flexivel", "Usar intervalo flexível"],
                    ["controlar_nr17", "Controlar NR 17"],
                    ["noturna", "Jornada noturna"],
                    ["ativo", "Ativa"],
                  ].map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={(form as any)[k]}
                        onCheckedChange={(v) => setForm({ ...form, [k]: !!v } as any)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* JORNADA */}
            <TabsContent value="jornada" className="mt-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  Carga calculada: <strong>{Math.floor(cargaSemanaCalc / 60)}h{(cargaSemanaCalc % 60).toString().padStart(2, "0")}</strong>
                </div>
                <Button size="sm" variant="outline" onClick={preencherSemana}>
                  Preencher Ter-Sex com Segunda
                </Button>
              </div>
              {/* Desktop/tablet table */}
              <div className="hidden md:block overflow-x-auto rounded-md border">
                <table className="w-full table-fixed text-sm">
                  <thead className="bg-muted/50">
                    <tr className="text-left">
                      <th className="p-2">Dia</th>
                      <th className="p-2">Classificação</th>
                      <th className="p-2">1ª entrada</th>
                      <th className="p-2">1ª saída</th>
                      <th className="p-2">2ª entrada</th>
                      <th className="p-2">2ª saída</th>
                      <th className="p-2">Intervalo</th>
                      <th className="p-2">Virada</th>
                      <th className="p-2">Limite HE 50%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIAS.map((d) => {
                      const j = form.jornada[d.key];
                      const disabled = j.classificacao !== "trabalho";
                      return (
                        <tr key={d.key} className="border-t">
                          <td className="p-2 font-medium">{d.label}</td>
                          <td className="p-2">
                            <Select value={j.classificacao} onValueChange={(v: any) => setJ(d.key, { classificacao: v })}>
                              <SelectTrigger className="h-8 w-[140px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="trabalho">Dia de trabalho</SelectItem>
                                <SelectItem value="descanso">Dia de descanso</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-2"><Input className="h-8 w-24" type="time" disabled={disabled} value={j.entrada1} onChange={(e) => setJ(d.key, { entrada1: e.target.value })} /></td>
                          <td className="p-2"><Input className="h-8 w-24" type="time" disabled={disabled} value={j.saida1} onChange={(e) => setJ(d.key, { saida1: e.target.value })} /></td>
                          <td className="p-2"><Input className="h-8 w-24" type="time" disabled={disabled} value={j.entrada2} onChange={(e) => setJ(d.key, { entrada2: e.target.value })} /></td>
                          <td className="p-2"><Input className="h-8 w-24" type="time" disabled={disabled} value={j.saida2} onChange={(e) => setJ(d.key, { saida2: e.target.value })} /></td>
                          <td className="p-2"><Input className="h-8 w-24" type="time" disabled={disabled} value={j.intervalo_principal} onChange={(e) => setJ(d.key, { intervalo_principal: e.target.value })} placeholder="hh:mm" /></td>
                          <td className="p-2"><Input className="h-8 w-24" type="time" value={j.horario_virada} onChange={(e) => setJ(d.key, { horario_virada: e.target.value })} /></td>
                          <td className="p-2"><Input className="h-8 w-24" type="time" value={j.limite_he50} onChange={(e) => setJ(d.key, { limite_he50: e.target.value })} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {DIAS.map((d) => {
                  const j = form.jornada[d.key];
                  const disabled = j.classificacao !== "trabalho";
                  return (
                    <div key={d.key} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm">{d.label}</span>
                        <Select value={j.classificacao} onValueChange={(v: any) => setJ(d.key, { classificacao: v })}>
                          <SelectTrigger className="h-8 w-[150px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trabalho">Trabalho</SelectItem>
                            <SelectItem value="descanso">Descanso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label className="text-xs">1ª entrada</Label><Input className="h-9" type="time" disabled={disabled} value={j.entrada1} onChange={(e) => setJ(d.key, { entrada1: e.target.value })} /></div>
                        <div><Label className="text-xs">1ª saída</Label><Input className="h-9" type="time" disabled={disabled} value={j.saida1} onChange={(e) => setJ(d.key, { saida1: e.target.value })} /></div>
                        <div><Label className="text-xs">2ª entrada</Label><Input className="h-9" type="time" disabled={disabled} value={j.entrada2} onChange={(e) => setJ(d.key, { entrada2: e.target.value })} /></div>
                        <div><Label className="text-xs">2ª saída</Label><Input className="h-9" type="time" disabled={disabled} value={j.saida2} onChange={(e) => setJ(d.key, { saida2: e.target.value })} /></div>
                        <div><Label className="text-xs">Intervalo</Label><Input className="h-9" type="time" disabled={disabled} value={j.intervalo_principal} onChange={(e) => setJ(d.key, { intervalo_principal: e.target.value })} /></div>
                        <div><Label className="text-xs">Virada</Label><Input className="h-9" type="time" value={j.horario_virada} onChange={(e) => setJ(d.key, { horario_virada: e.target.value })} /></div>
                        <div className="col-span-2"><Label className="text-xs">Limite HE 50%</Label><Input className="h-9" type="time" value={j.limite_he50} onChange={(e) => setJ(d.key, { limite_he50: e.target.value })} /></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>

            {/* INTERVALO PRÉ-ASSINALADO */}
            <TabsContent value="pre" className="mt-3 space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={form.intervalo_preassinalado.ativo}
                  onCheckedChange={(v) => setPre({ ativo: v })}
                />
                Usar intervalo pré-assinalado
              </label>
              <div className={form.intervalo_preassinalado.ativo ? "" : "pointer-events-none opacity-50"}>
                <div className="space-y-2 rounded-md border p-3">
                  {[
                    ["aplicar_todos", "Aplicar em todos os intervalos"],
                    ["aplicar_diferente_previsto", "Aplicar em dias com pontos diferentes do previsto"],
                    ["aplicar_sem_jornada", "Aplicar em dias sem jornada estabelecida"],
                  ].map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={(form.intervalo_preassinalado as any)[k]}
                        onCheckedChange={(v) => setPre({ [k]: !!v })}
                      />
                      {label}
                    </label>
                  ))}
                  <div className="grid gap-3 pt-2 sm:grid-cols-2">
                    <div>
                      <Label>Gerar um intervalo de</Label>
                      <Input type="time" value={form.intervalo_preassinalado.gerar_intervalo} onChange={(e) => setPre({ gerar_intervalo: e.target.value })} />
                    </div>
                    <div>
                      <Label>Quando a jornada exceder</Label>
                      <Input type="time" value={form.intervalo_preassinalado.quando_exceder} onChange={(e) => setPre({ quando_exceder: e.target.value })} />
                    </div>
                  </div>
                  <label className="mt-2 flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.intervalo_preassinalado.aplicar_periodo}
                      onCheckedChange={(v) => setPre({ aplicar_periodo: !!v })}
                    />
                    Aplicar para dias com jornada estabelecida para um período
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Gerar um intervalo de (período)</Label>
                      <Input type="time" value={form.intervalo_preassinalado.gerar_intervalo_periodo} onChange={(e) => setPre({ gerar_intervalo_periodo: e.target.value })} />
                    </div>
                    <div>
                      <Label>Quando a jornada exceder (período)</Label>
                      <Input type="time" value={form.intervalo_preassinalado.quando_exceder_periodo} onChange={(e) => setPre({ quando_exceder_periodo: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* INTRAJORNADA */}
            <TabsContent value="intra" className="mt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>O que fazer com o tempo faltante</Label>
                  <Select value={form.intrajornada_config.tempo_faltante} onValueChange={(v) => setIntra({ tempo_faltante: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nao_utilizar">Não utilizar</SelectItem>
                      <SelectItem value="descontar_jornada">Descontar da jornada</SelectItem>
                      <SelectItem value="lancar_falta">Lançar como falta</SelectItem>
                      <SelectItem value="abonar">Abonar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.intrajornada_config.lancar_he}
                      onCheckedChange={(v) => setIntra({ lancar_he: !!v })}
                    />
                    Lançar como horas extras
                  </label>
                </div>
                <div>
                  <Label>Considerar limite</Label>
                  <Select value={form.intrajornada_config.considerar_limite} onValueChange={(v) => setIntra({ considerar_limite: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nenhum">Nenhum</SelectItem>
                      <SelectItem value="diario">Diário</SelectItem>
                      <SelectItem value="semanal">Semanal</SelectItem>
                      <SelectItem value="mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Limite contratado</Label>
                  <Input type="time" value={form.intrajornada_config.limite_contratado} onChange={(e) => setIntra({ limite_contratado: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Dias a considerar</Label>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {DIAS.map((d) => {
                      const checked = form.intrajornada_config.dias_considerar.includes(d.key);
                      return (
                        <label key={d.key} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) => {
                              const set = new Set(form.intrajornada_config.dias_considerar);
                              v ? set.add(d.key) : set.delete(d.key);
                              setIntra({ dias_considerar: Array.from(set) });
                            }}
                          />
                          {d.label}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* FERIADOS */}
            <TabsContent value="feriados" className="mt-3">
              <div className="grid gap-3 sm:grid-cols-5">
                <div className="sm:col-span-1">
                  <Label>Classificação</Label>
                  <Select value={form.jornada_feriados.classificacao} onValueChange={(v) => setFer({ classificacao: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="descanso">Descanso</SelectItem>
                      <SelectItem value="trabalho">Trabalho normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>1ª entrada</Label><Input type="time" value={form.jornada_feriados.entrada1} onChange={(e) => setFer({ entrada1: e.target.value })} /></div>
                <div><Label>1ª saída</Label><Input type="time" value={form.jornada_feriados.saida1} onChange={(e) => setFer({ saida1: e.target.value })} /></div>
                <div><Label>2ª entrada</Label><Input type="time" value={form.jornada_feriados.entrada2} onChange={(e) => setFer({ entrada2: e.target.value })} /></div>
                <div><Label>2ª saída</Label><Input type="time" value={form.jornada_feriados.saida2} onChange={(e) => setFer({ saida2: e.target.value })} /></div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={remove}
        itemName={deleting?.nome ?? ""}
        title="Excluir escala"
      />
    </div>
  );
}
