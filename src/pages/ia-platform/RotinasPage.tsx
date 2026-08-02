import { useEffect, useMemo, useState } from "react";
import { useAipTable, db } from "@/lib/aip/db";
import { AipToolbar } from "@/components/ia-platform/AipToolbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarClock, History, Loader2, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  FUSOS,
  PRESETS_CRON,
  cronValido,
  descreverCron,
  proximaExecucao,
} from "@/lib/aip/cron";
import { CATALOGO_RECURSOS } from "@/lib/aip/catalog";

interface Rotina {
  id: string;
  nome: string;
  descricao: string | null;
  tipo_alvo: string;
  workflow_id: string | null;
  agent_id: string | null;
  prompt: string | null;
  modelo: string | null;
  input: Record<string, unknown>;
  conectores: { tipo: string; ref: string; nome: string }[];
  cron_expressao: string;
  fuso: string;
  timeout_ms: number;
  retry_max: number;
  ativo: boolean;
  proxima_execucao: string | null;
  ultima_execucao: string | null;
  ultimo_status: string | null;
  ultimo_erro: string | null;
  ultima_execution_id: string | null;
  created_at: string;
}

const TIPOS = [
  { valor: "workflow", label: "Workflow (motor visual)" },
  { valor: "agente", label: "Agente IA (Claude Agent SDK)" },
  { valor: "claude_code", label: "Claude Code (prompt livre)" },
];

const vazio = (): Partial<Rotina> => ({
  nome: "",
  descricao: "",
  tipo_alvo: "workflow",
  workflow_id: null,
  agent_id: null,
  prompt: "",
  modelo: "",
  input: {},
  conectores: [],
  cron_expressao: "0 8 * * *",
  fuso: "America/Sao_Paulo",
  timeout_ms: 120000,
  retry_max: 1,
  ativo: true,
});

const dt = (v?: string | null) => (v ? new Date(v).toLocaleString("pt-BR") : "—");

export default function RotinasPage() {
  const { items, loading, create, update, remove, refetch } = useAipTable<any>("aip_rotinas" as any, {
    orderBy: "created_at",
  });
  const { items: workflows } = useAipTable<any>("aip_workflows");
  const { items: agentes } = useAipTable<any>("aip_agents");
  const { items: tools } = useAipTable<any>("aip_tools");
  const { items: mcps } = useAipTable<any>("aip_mcps");

  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<Partial<Rotina> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [executando, setExecutando] = useState<string | null>(null);
  const [excluir, setExcluir] = useState<Rotina | null>(null);
  const [historico, setHistorico] = useState<{ rotina: Rotina; runs: any[] } | null>(null);

  useEffect(() => {
    const t = setInterval(refetch, 30000);
    return () => clearInterval(t);
  }, [refetch]);

  const filtrados = useMemo(
    () =>
      (items as Rotina[]).filter((r) =>
        `${r.nome} ${r.descricao ?? ""} ${r.tipo_alvo}`.toLowerCase().includes(busca.toLowerCase()),
      ),
    [items, busca],
  );

  const conectoresDisponiveis = useMemo(() => {
    const catalogo = CATALOGO_RECURSOS.flatMap((c) =>
      c.itens.map((x) => ({ tipo: "recurso", ref: `${c.slug}/${x.slug}`, nome: `${x.icone} ${x.nome}` })),
    );
    return [
      ...tools.map((t: any) => ({ tipo: "tool", ref: t.id, nome: `🔧 ${t.nome}` })),
      ...mcps.map((m: any) => ({ tipo: "mcp", ref: m.id, nome: `🔌 ${m.nome}` })),
      ...catalogo,
    ];
  }, [tools, mcps]);

  const salvar = async () => {
    if (!form) return;
    if (!form.nome?.trim()) return toast.error("Informe o nome da rotina");
    if (!cronValido(form.cron_expressao ?? "")) return toast.error("Expressão de agendamento inválida");
    if (form.tipo_alvo === "workflow" && !form.workflow_id) return toast.error("Selecione o workflow");
    if (form.tipo_alvo === "agente" && !form.agent_id) return toast.error("Selecione o agente");
    if (form.tipo_alvo === "claude_code" && !form.prompt?.trim())
      return toast.error("Informe o prompt da rotina");

    setSalvando(true);
    const payload: Record<string, unknown> = {
      nome: form.nome.trim(),
      descricao: form.descricao || null,
      tipo_alvo: form.tipo_alvo,
      workflow_id: form.tipo_alvo === "workflow" ? form.workflow_id : null,
      agent_id: form.tipo_alvo === "agente" ? form.agent_id : null,
      prompt: form.prompt || null,
      modelo: form.modelo || null,
      input: form.input ?? {},
      conectores: form.conectores ?? [],
      cron_expressao: form.cron_expressao,
      fuso: form.fuso,
      timeout_ms: Number(form.timeout_ms ?? 120000),
      retry_max: Number(form.retry_max ?? 1),
      ativo: form.ativo ?? true,
      proxima_execucao:
        (form.ativo ?? true)
          ? proximaExecucao(form.cron_expressao!, form.fuso ?? "America/Sao_Paulo")?.toISOString() ?? null
          : null,
    };
    if (!form.id) {
      const { data: sessao } = await supabase.auth.getUser();
      payload.criado_por = sessao?.user?.id ?? null;
    }

    const ok = form.id ? await update(form.id, payload as any) : await create(payload as any);
    setSalvando(false);
    if (ok) setForm(null);
  };

  const alternarAtivo = async (r: Rotina, ativo: boolean) => {
    await update(r.id, {
      ativo,
      proxima_execucao: ativo
        ? proximaExecucao(r.cron_expressao, r.fuso)?.toISOString() ?? null
        : null,
    } as any);
  };

  const executarAgora = async (r: Rotina) => {
    setExecutando(r.id);
    try {
      const { data, error } = await supabase.functions.invoke("aip-rotinas-scheduler", {
        body: { rotina_id: r.id },
      });
      if (error) throw error;
      if ((data as any)?.status === "erro") toast.error((data as any).erro ?? "Falha na rotina");
      else toast.success("Rotina executada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExecutando(null);
      refetch();
    }
  };

  const abrirHistorico = async (r: Rotina) => {
    const { data } = await db
      .from("aip_rotina_runs")
      .select("*")
      .eq("rotina_id", r.id)
      .order("iniciado_em", { ascending: false })
      .limit(50);
    setHistorico({ rotina: r, runs: data ?? [] });
  };

  const alternarConector = (c: { tipo: string; ref: string; nome: string }) => {
    if (!form) return;
    const atuais = form.conectores ?? [];
    const existe = atuais.some((x) => x.tipo === c.tipo && x.ref === c.ref);
    setForm({
      ...form,
      conectores: existe ? atuais.filter((x) => !(x.tipo === c.tipo && x.ref === c.ref)) : [...atuais, c],
    });
  };

  return (
    <>
      <AipToolbar
        busca={busca}
        onBusca={setBusca}
        loading={loading}
        vazio={filtrados.length === 0}
        vazioTexto="Nenhuma rotina agendada. Crie a primeira para disparar workflows ou o Claude Code no horário."
        acoes={
          <Button size="sm" onClick={() => setForm(vazio())}>
            <Plus className="mr-1 h-4 w-4" /> Nova rotina
          </Button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((r) => (
            <Card key={r.id} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{r.nome}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {TIPOS.find((t) => t.valor === r.tipo_alvo)?.label ?? r.tipo_alvo}
                    </p>
                  </div>
                  <Switch checked={r.ativo} onCheckedChange={(v) => alternarAtivo(r, v)} />
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span className="truncate">{descreverCron(r.cron_expressao, r.fuso)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Próxima</p>
                    <p className="font-medium">{r.ativo ? dt(r.proxima_execucao) : "pausada"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Última</p>
                    <p className="font-medium">{dt(r.ultima_execucao)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {r.ultimo_status && (
                    <Badge variant={r.ultimo_status === "erro" ? "destructive" : "outline"}>
                      {r.ultimo_status}
                    </Badge>
                  )}
                  {(r.conectores ?? []).slice(0, 3).map((c) => (
                    <Badge key={`${c.tipo}-${c.ref}`} variant="secondary" className="text-[10px]">
                      {c.nome}
                    </Badge>
                  ))}
                  {(r.conectores ?? []).length > 3 && (
                    <Badge variant="secondary" className="text-[10px]">
                      +{(r.conectores ?? []).length - 3}
                    </Badge>
                  )}
                </div>

                {r.ultimo_erro && (
                  <p className="line-clamp-2 rounded bg-destructive/10 p-2 text-[11px] text-destructive">
                    {r.ultimo_erro}
                  </p>
                )}

                <div className="flex flex-nowrap gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={executando === r.id}
                    onClick={() => executarAgora(r)}
                  >
                    {executando === r.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => abrirHistorico(r)}>
                    <History className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setForm(r)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExcluir(r)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AipToolbar>

      {/* Formulário --------------------------------------------------- */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar rotina" : "Nova rotina agendada"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input
                    value={form.nome ?? ""}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Resumo diário de vendas"
                  />
                </div>
                <div className="space-y-1">
                  <Label>O que executar</Label>
                  <Select
                    value={form.tipo_alvo}
                    onValueChange={(v) => setForm({ ...form, tipo_alvo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS.map((t) => (
                        <SelectItem key={t.valor} value={t.valor}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label>Descrição</Label>
                <Input
                  value={form.descricao ?? ""}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>

              {form.tipo_alvo === "workflow" && (
                <div className="space-y-1">
                  <Label>Workflow</Label>
                  <Select
                    value={form.workflow_id ?? ""}
                    onValueChange={(v) => setForm({ ...form, workflow_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o workflow" />
                    </SelectTrigger>
                    <SelectContent>
                      {workflows.map((w: any) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.tipo_alvo === "agente" && (
                <div className="space-y-1">
                  <Label>Agente</Label>
                  <Select
                    value={form.agent_id ?? ""}
                    onValueChange={(v) => setForm({ ...form, agent_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o agente" />
                    </SelectTrigger>
                    <SelectContent>
                      {agentes.map((a: any) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.tipo_alvo !== "workflow" && (
                <div className="space-y-1">
                  <Label>Prompt / instrução da rotina</Label>
                  <Textarea
                    rows={4}
                    value={form.prompt ?? ""}
                    onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                    placeholder="Ex.: Gere o relatório de vendas do dia anterior e publique no WhatsApp do gestor."
                  />
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Agendamento (cron)</Label>
                  <Input
                    value={form.cron_expressao ?? ""}
                    onChange={(e) => setForm({ ...form, cron_expressao: e.target.value })}
                    placeholder="0 8 * * *"
                  />
                  <p className="text-xs text-muted-foreground">
                    {descreverCron(form.cron_expressao ?? "", form.fuso ?? "America/Sao_Paulo")}
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Fuso horário</Label>
                  <Select value={form.fuso} onValueChange={(v) => setForm({ ...form, fuso: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FUSOS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {PRESETS_CRON.map((p) => (
                  <Button
                    key={p.valor}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setForm({ ...form, cron_expressao: p.valor })}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Conectores disponíveis para a rotina</Label>
                <ScrollArea className="h-40 rounded-lg border border-border p-2">
                  <div className="flex flex-wrap gap-1">
                    {conectoresDisponiveis.map((c) => {
                      const ativo = (form.conectores ?? []).some(
                        (x) => x.tipo === c.tipo && x.ref === c.ref,
                      );
                      return (
                        <Button
                          key={`${c.tipo}-${c.ref}`}
                          size="sm"
                          variant={ativo ? "default" : "outline"}
                          className="h-7 text-xs"
                          onClick={() => alternarConector(c)}
                        >
                          {c.nome}
                        </Button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Modelo (opcional)</Label>
                  <Input
                    value={form.modelo ?? ""}
                    onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                    placeholder="google/gemini-3.6-flash"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Timeout por etapa (ms)</Label>
                  <Input
                    type="number"
                    value={form.timeout_ms ?? 120000}
                    onChange={(e) => setForm({ ...form, timeout_ms: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Tentativas</Label>
                  <Input
                    type="number"
                    value={form.retry_max ?? 1}
                    onChange={(e) => setForm({ ...form, retry_max: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={form.ativo ?? true}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
                <Label>Rotina ativa</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico ---------------------------------------------------- */}
      <Dialog open={!!historico} onOpenChange={(o) => !o && setHistorico(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico — {historico?.rotina.nome}</DialogTitle>
          </DialogHeader>
          {historico?.runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum disparo registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {historico?.runs.map((run) => (
                <li key={run.id} className="space-y-1 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm">{dt(run.iniciado_em)}</span>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-[10px]">{run.origem}</Badge>
                      {run.duracao_ms != null && (
                        <Badge variant="outline" className="text-[10px]">{run.duracao_ms} ms</Badge>
                      )}
                      <Badge variant={run.status === "erro" ? "destructive" : "outline"}>
                        {run.status}
                      </Badge>
                    </div>
                  </div>
                  {run.erro && <p className="text-xs text-destructive">{run.erro}</p>}
                  {run.detalhes?.resposta && (
                    <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded bg-muted p-2 text-[11px]">
                      {run.detalhes.resposta}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        itemName={excluir?.nome ?? ""}
        onConfirm={async () => {
          if (excluir) await remove(excluir.id);
          setExcluir(null);
        }}
      />
    </>
  );
}
