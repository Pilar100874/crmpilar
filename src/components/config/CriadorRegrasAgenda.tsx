import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Lock, Network, Pencil, Plus, Trash2, Wand2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FluxoVisualRegrasAgenda } from "@/components/config/FluxoVisualRegrasAgenda";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";
import {
  ACOES, CANAIS_REGRA, DIAS_SEMANA, GATILHOS, MODOS_RELACAO, analisarInterferencias, relacaoEntre,
  rotuloAcao, rotuloGatilho, telaDoGatilho, type Interferencia, type RegraBase,
} from "@/lib/calendario/regrasAutomacao";

interface Regra extends RegraBase { descricao: string | null; execucoes: number; chave: string | null; tela: string | null }

const lista = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const vazio = () => ({
  id: "", nome: "", descricao: "", gatilho: "atendimento_finalizado", acao: "criar_tarefa", prioridade: 100,
  canais: [] as string[], status: "", texto: "", diasSem: 30, valorMin: "", tipos: "", estados: "", cidades: "", tags: "",
  usuarios: [] as string[], diasSemana: [] as string[], horaDe: "", horaAte: "", pendente: "qualquer",
  dias: 3, diasUteis: false, hora: "", titulo: "Retornar contato com {cliente}", responsavel: "vinculado", usuarioFixo: "",
  evitar: true, canalTarefa: "", relacoes: {} as Record<string, string>, sistema: false, executor: "banco", chave: null as string | null,
});
type Form = ReturnType<typeof vazio>;
const corNivel = { alto: "border-destructive/50 bg-destructive/5", medio: "border-warning/50 bg-warning/5", baixo: "border-border bg-muted/30" };
const rotNivel = { alto: "Alto", medio: "Médio", baixo: "Baixo" };

export function CriadorRegrasAgenda({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string }[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [aviso, setAviso] = useState<{ itens: Interferencia[]; escolhas: Record<string, string> } | null>(null);
  const [excluir, setExcluir] = useState<Regra | null>(null);
  const [salvando, setSalvando] = useState(false);
  const db = supabase as any;

  const carregar = async () => {
    const { data } = await db.from("calendario_regras_automacao").select("*").eq("estabelecimento_id", estabelecimentoId).order("prioridade").order("created_at");
    setRegras(data || []);
  };
  useEffect(() => {
    (async () => {
      await db.rpc("semear_minhas_regras_sistema");
      await carregar();
      const { data } = await db.from("usuarios").select("id,nome").eq("estabelecimento_id", estabelecimentoId).order("nome");
      setUsuarios(data || []);
    })();
  }, [estabelecimentoId]);

  const set = (p: Partial<Form>) => setForm((f) => (f ? { ...f, ...p } : f));
  const gat = useMemo(() => GATILHOS.find((g) => g.valor === form?.gatilho), [form?.gatilho]);
  const telas = useMemo(() => Array.from(new Set([...GATILHOS.map((g) => g.tela), ...regras.map((r) => r.tela || telaDoGatilho(r.gatilho))])), [regras]);
  const telaDe = (r: Regra) => r.tela || telaDoGatilho(r.gatilho);
  const nomeUsuario = (id: string) => usuarios.find((u) => u.id === id)?.nome || "usuário";

  const editar = (r: Regra) => {
    const c = r.condicoes || {}, a = r.acao_config || {};
    setForm({
      ...vazio(), id: r.id, nome: r.nome, descricao: r.descricao || "", gatilho: r.gatilho, acao: r.acao, prioridade: r.prioridade,
      canais: c.canais || [], status: (c.status || []).join(", "), texto: c.texto_contem || "", diasSem: c.dias_sem_contato ?? 30,
      valorMin: c.valor_minimo ?? "", tipos: (c.tipos_cliente || []).join(", "), estados: (c.estados || []).join(", "),
      cidades: (c.cidades || []).join(", "), tags: (c.tags || []).join(", "), usuarios: c.usuarios || [], diasSemana: c.dias_semana || [],
      horaDe: c.hora_de || "", horaAte: c.hora_ate || "", pendente: c.tem_tarefa_pendente || "qualquer",
      dias: typeof a.dias === "number" ? a.dias : Number(a.dias) || 0, diasUteis: !!a.dias_uteis, hora: a.hora || "", titulo: a.titulo || "",
      responsavel: a.usuario_fixo ? "fixo" : a.responsavel || "vinculado", usuarioFixo: a.usuario_fixo || "", evitar: a.evitar_duplicada ?? true,
      canalTarefa: a.canal || "", relacoes: r.relacoes || {}, sistema: r.sistema, executor: r.executor, chave: r.chave,
    });
  };

  const montar = (f: Form) => {
    const condicoes: any = {};
    if (f.canais.length) condicoes.canais = f.canais;
    if (lista(f.status).length) condicoes.status = lista(f.status);
    if (f.texto.trim()) condicoes.texto_contem = f.texto.trim();
    if (gat?.condicoes.includes("dias")) condicoes.dias_sem_contato = Number(f.diasSem) || 30;
    if (String(f.valorMin).trim()) condicoes.valor_minimo = Number(f.valorMin);
    if (lista(f.tipos).length) condicoes.tipos_cliente = lista(f.tipos);
    if (lista(f.estados).length) condicoes.estados = lista(f.estados).map((s) => s.toUpperCase());
    if (lista(f.cidades).length) condicoes.cidades = lista(f.cidades);
    if (lista(f.tags).length) condicoes.tags = lista(f.tags);
    if (f.usuarios.length) condicoes.usuarios = f.usuarios;
    if (f.diasSemana.length) condicoes.dias_semana = f.diasSemana;
    if (f.horaDe) condicoes.hora_de = f.horaDe;
    if (f.horaAte) condicoes.hora_ate = f.horaAte;
    if (f.pendente !== "qualquer") condicoes.tem_tarefa_pendente = f.pendente;
    const acao_config: any = { dias: Number(f.dias) || 0, dias_uteis: f.diasUteis, responsavel: f.responsavel === "fixo" ? "vinculado" : f.responsavel };
    if (f.responsavel === "fixo" && f.usuarioFixo) acao_config.usuario_fixo = f.usuarioFixo;
    if (f.acao === "criar_tarefa") Object.assign(acao_config, { titulo: f.titulo, hora: f.hora, evitar_duplicada: f.evitar, canal: f.canalTarefa });
    return { condicoes, acao_config };
  };

  const pedirSalvar = () => {
    if (!form) return;
    if (!form.nome.trim()) return toast.error("Informe o nome da regra");
    const { condicoes } = montar(form);
    const itens = analisarInterferencias({ id: form.id || "nova", gatilho: form.gatilho, acao: form.acao, condicoes }, regras);
    if (itens.length) {
      const escolhas: Record<string, string> = {};
      itens.forEach((i) => { escolhas[i.regra.id] = form.relacoes[i.regra.id] || "junto"; });
      setAviso({ itens, escolhas });
    } else void salvar({});
  };

  const salvar = async (escolhas: Record<string, string>) => {
    if (!form) return;
    const { condicoes, acao_config } = montar(form);
    const relacoes: Record<string, string> = { ...form.relacoes };
    const desativar: string[] = [];
    Object.entries(escolhas).forEach(([id, m]) => { if (m === "desativar") { desativar.push(id); delete relacoes[id]; } else relacoes[id] = m; });
    const linha: any = form.sistema
      ? { descricao: form.descricao || null, prioridade: form.prioridade, relacoes, ...(form.executor === "banco" ? { acao_config } : {}) }
      : { estabelecimento_id: estabelecimentoId, nome: form.nome.trim(), descricao: form.descricao || null, gatilho: form.gatilho, acao: form.acao,
          condicoes, acao_config, prioridade: form.prioridade, relacoes, tela: telaDoGatilho(form.gatilho) };
    setSalvando(true);
    const { error } = form.id
      ? await db.from("calendario_regras_automacao").update(linha).eq("id", form.id)
      : await db.from("calendario_regras_automacao").insert(linha);
    if (!error && desativar.length) await db.from("calendario_regras_automacao").update({ ativa: false }).in("id", desativar);
    setSalvando(false);
    if (error) return toast.error("Não foi possível salvar a regra");
    toast.success(desativar.length ? `Regra salva e ${desativar.length} regra(s) desativada(s)` : "Regra salva");
    setAviso(null); setForm(null); void carregar();
  };

  const podeAlternar = (r: Regra) => !r.sistema || r.executor === "banco" || !!r.chave?.startsWith("cal_");
  const alternar = async (r: Regra, v: boolean) => {
    setRegras((rs) => rs.map((x) => (x.id === r.id ? { ...x, ativa: v } : x)));
    await db.from("calendario_regras_automacao").update({ ativa: v }).eq("id", r.id);
    if (r.chave?.startsWith("cal_")) await db.from("calendario_regras").update({ ativa: v }).eq("estabelecimento_id", estabelecimentoId).eq("tipo", r.chave.slice(4));
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    await db.from("calendario_regras_automacao").delete().eq("id", excluir.id);
    setExcluir(null); void carregar();
  };

  const resumo = (r: Regra) => {
    const c = r.condicoes || {}, a = r.acao_config || {};
    const p: string[] = [];
    if (c.canais?.length) p.push(`canal ${c.canais.join("/")}`);
    if (c.status?.length) p.push(`status ${c.status.join("/")}`);
    if (c.texto_contem) p.push(`contém "${c.texto_contem}"`);
    if (c.dias_sem_contato) p.push(`${c.dias_sem_contato} dias sem contato`);
    if (c.valor_minimo) p.push(`valor ≥ ${c.valor_minimo}`);
    if (c.tipos_cliente?.length) p.push(`tipo ${c.tipos_cliente.join("/")}`);
    if (c.estados?.length) p.push(`UF ${c.estados.join("/")}`);
    if (c.cidades?.length) p.push(`cidade ${c.cidades.join("/")}`);
    if (c.tags?.length) p.push(`tags ${c.tags.join("/")}`);
    if (c.usuarios?.length) p.push(`vendedor ${c.usuarios.map(nomeUsuario).join("/")}`);
    if (c.dias_semana?.length) p.push(c.dias_semana.map((d: string) => DIAS_SEMANA[+d]).join("/"));
    if (c.hora_de || c.hora_ate) p.push(`${c.hora_de || "00:00"}–${c.hora_ate || "23:59"}`);
    if (c.tem_tarefa_pendente) p.push(c.tem_tarefa_pendente === "sim" ? "com tarefa pendente" : "sem tarefa pendente");
    const quando = `Quando: ${rotuloGatilho(r.gatilho)}${p.length ? ` (${p.join(" · ")})` : ""}`;
    const em = ["criar_tarefa", "remarcar_tarefa"].includes(r.acao) && a.dias !== undefined ? ` em ${a.dias}${typeof a.dias === "number" ? ` dia(s)${a.dias_uteis ? " úteis" : ""}` : ""}` : "";
    return `${quando} → ${rotuloAcao(r.acao)}${em}`;
  };

  const interferenciasDe = (r: Regra) => analisarInterferencias(r, regras);

  const cartaoRegra = (r: Regra) => {
    const n = interferenciasDe(r).filter((i) => i.nivel !== "baixo").length;
    return (
      <div key={r.id} className={cn("mb-2 flex items-start gap-3 rounded-md border bg-background p-3", !r.ativa && "opacity-60")}>
        <Zap className={cn("mt-0.5 h-4 w-4 shrink-0", r.ativa ? "text-primary" : "text-muted-foreground")} />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
            {r.nome}
            {r.sistema && <Badge variant="secondary" className="text-[10px]">Sistema</Badge>}
            {r.executor === "tela" && <Badge variant="outline" className="text-[10px]">Executada pela tela</Badge>}
            <Badge variant="outline" className="text-[10px]">Prioridade {r.prioridade}</Badge>
            {!r.sistema && <Badge variant="outline" className="text-[10px]">{r.execucoes} execuções</Badge>}
            {n > 0 && <Badge variant="outline" className="border-warning/60 text-[10px]"><AlertTriangle className="mr-1 h-3 w-3" />{n} interferência(s)</Badge>}
          </p>
          <p className="text-xs text-muted-foreground">{resumo(r)}</p>
          {r.descricao && <p className="text-xs text-muted-foreground/80">{r.descricao}</p>}
        </div>
        {podeAlternar(r) ? <Switch checked={r.ativa} onCheckedChange={(v) => alternar(r, v)} />
          : <span title="Regra fixa da tela — ajuste prioridade e relações"><Lock className="mt-1 h-4 w-4 text-muted-foreground" /></span>}
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => editar(r)}><Pencil className="h-4 w-4" /></Button>
        {!r.sistema && <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setExcluir(r)}><Trash2 className="h-4 w-4" /></Button>}
      </div>
    );
  };

  const travado = !!form?.sistema;
  const camposAcao = !form?.sistema || form.executor === "banco";

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold"><Wand2 className="h-5 w-5 text-primary" /> Regras da agenda</h2>
          <p className="text-xs text-muted-foreground">Todas as regras que criam ou mexem na agenda, do sistema e criadas por você, no formato "quando X → faça Y".</p>
        </div>
        <Button size="sm" onClick={() => setForm(vazio())}><Plus className="h-4 w-4" /> Nova regra</Button>
      </div>

      <Tabs defaultValue="regras" className="mt-3">
        <TabsList>
          <TabsTrigger value="regras">Regras por tela</TabsTrigger>
          <TabsTrigger value="fluxo"><Network className="mr-1 h-4 w-4" /> Fluxo visual</TabsTrigger>
          <TabsTrigger value="mapa"><Network className="mr-1 h-4 w-4" /> Interferências</TabsTrigger>
        </TabsList>

        <TabsContent value="regras">
          {telas.filter((t) => regras.some((r) => telaDe(r) === t)).map((t) => (
            <div key={t}>
              <p className="mb-1 mt-3 text-xs font-semibold uppercase text-muted-foreground">{t}</p>
              {regras.filter((r) => telaDe(r) === t).map(cartaoRegra)}
            </div>
          ))}
        </TabsContent>

        <TabsContent value="fluxo">
          <FluxoVisualRegrasAgenda regras={regras} onEditar={editar} />
        </TabsContent>

        <TabsContent value="mapa" className="space-y-3">
          <p className="text-xs text-muted-foreground">Para cada regra ativa, as regras que podem interferir nela e a relação escolhida entre elas.</p>
          {regras.filter((r) => r.ativa).map((r) => {
            const itens = interferenciasDe(r);
            if (!itens.length) return null;
            return (
              <div key={r.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{r.nome} <span className="text-xs font-normal text-muted-foreground">· {rotuloGatilho(r.gatilho)}</span></p>
                  <Button size="sm" variant="ghost" onClick={() => editar(r)}><Pencil className="h-3.5 w-3.5" /> Ajustar</Button>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {itens.map((i) => (
                    <li key={i.regra.id} className={cn("rounded border p-2 text-xs", corNivel[i.nivel])}>
                      <span className="font-medium">{i.regra.nome}</span> <Badge variant="outline" className="ml-1 text-[10px]">{rotNivel[i.nivel]}</Badge>
                      <span className="block text-muted-foreground">{i.motivos.join(" · ")}</span>
                      <span className="block">{relacaoEntre(r, i.regra) || "Sem relação definida (executam as duas, na ordem de prioridade)"}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar regra" : "Nova regra"}</DialogTitle>
            {travado && <DialogDescription>Regra do sistema: {form?.executor === "banco" ? "você pode ajustar a ação, prioridade e relações." : "executada pela própria tela; ajuste prioridade, descrição e relações."}</DialogDescription>}
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <div className="space-y-1"><Label>Nome</Label><Input disabled={travado} value={form.nome} onChange={(e) => set({ nome: e.target.value })} placeholder="Ex.: Retorno após orçamento perdido" /></div>
                <div className="space-y-1"><Label>Prioridade</Label><Input type="number" value={form.prioridade} onChange={(e) => set({ prioridade: Number(e.target.value) })} title="Menor número roda primeiro" /></div>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <p className="text-xs font-semibold uppercase text-primary">Quando</p>
                <Select disabled={travado} value={form.gatilho} onValueChange={(v) => set({ gatilho: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set(GATILHOS.map((g) => g.tela))).map((t) => (
                      <SelectGroup key={t}><SelectLabel>{t}</SelectLabel>
                        {GATILHOS.filter((g) => g.tela === t && (travado || !g.somenteSistema)).map((g) => <SelectItem key={g.valor} value={g.valor}>{g.rotulo}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>

                {!travado && (
                  <>
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Condições (todas opcionais)</p>
                    {gat?.condicoes.includes("dias") && (
                      <div className="space-y-1"><Label className="text-xs">Dias sem contato</Label><Input type="number" min={1} value={form.diasSem} onChange={(e) => set({ diasSem: Number(e.target.value) })} /></div>
                    )}
                    <div className="space-y-1"><Label className="text-xs">Canais</Label>
                      <div className="flex flex-wrap gap-3">{CANAIS_REGRA.map((c) => (
                        <label key={c.valor} className="flex items-center gap-1.5 text-sm">
                          <Checkbox checked={form.canais.includes(c.valor)} onCheckedChange={(v) => set({ canais: v ? [...form.canais, c.valor] : form.canais.filter((x) => x !== c.valor) })} />{c.rotulo}
                        </label>))}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className="text-xs">Status (vírgula)</Label><Input value={form.status} onChange={(e) => set({ status: e.target.value })} placeholder="fechado, perdido" /></div>
                      <div className="space-y-1"><Label className="text-xs">Texto contém</Label><Input value={form.texto} onChange={(e) => set({ texto: e.target.value })} placeholder="orçamento" /></div>
                      <div className="space-y-1"><Label className="text-xs">Valor mínimo (orçamento)</Label><Input type="number" value={form.valorMin} onChange={(e) => set({ valorMin: e.target.value })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Tipo de cliente (vírgula)</Label><Input value={form.tipos} onChange={(e) => set({ tipos: e.target.value })} placeholder="cliente, prospect" /></div>
                      <div className="space-y-1"><Label className="text-xs">Estados (UF)</Label><Input value={form.estados} onChange={(e) => set({ estados: e.target.value })} placeholder="SP, PR" /></div>
                      <div className="space-y-1"><Label className="text-xs">Cidades</Label><Input value={form.cidades} onChange={(e) => set({ cidades: e.target.value })} placeholder="Sorocaba" /></div>
                      <div className="space-y-1"><Label className="text-xs">Tags do contato</Label><Input value={form.tags} onChange={(e) => set({ tags: e.target.value })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Tarefa pendente</Label>
                        <Select value={form.pendente} onValueChange={(v) => set({ pendente: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="qualquer">Tanto faz</SelectItem><SelectItem value="sim">Só se tiver</SelectItem><SelectItem value="nao">Só se não tiver</SelectItem></SelectContent>
                        </Select></div>
                      <div className="space-y-1"><Label className="text-xs">Das</Label><Input type="time" value={form.horaDe} onChange={(e) => set({ horaDe: e.target.value })} /></div>
                      <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="time" value={form.horaAte} onChange={(e) => set({ horaAte: e.target.value })} /></div>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Dias da semana</Label>
                      <div className="flex flex-wrap gap-3">{DIAS_SEMANA.map((d, i) => (
                        <label key={d} className="flex items-center gap-1.5 text-sm">
                          <Checkbox checked={form.diasSemana.includes(String(i))} onCheckedChange={(v) => set({ diasSemana: v ? [...form.diasSemana, String(i)] : form.diasSemana.filter((x) => x !== String(i)) })} />{d}
                        </label>))}</div>
                    </div>
                    {usuarios.length > 0 && (
                      <div className="space-y-1"><Label className="text-xs">Só para clientes destes vendedores</Label>
                        <div className="grid max-h-28 grid-cols-2 gap-1 overflow-y-auto rounded border p-2">{usuarios.map((u) => (
                          <label key={u.id} className="flex items-center gap-1.5 text-xs">
                            <Checkbox checked={form.usuarios.includes(u.id)} onCheckedChange={(v) => set({ usuarios: v ? [...form.usuarios, u.id] : form.usuarios.filter((x) => x !== u.id) })} />{u.nome}
                          </label>))}</div>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <p className="text-xs font-semibold uppercase text-primary">Faça na agenda</p>
                <Select disabled={travado} value={form.acao} onValueChange={(v) => set({ acao: v })}>
                  <SelectTrigger><SelectValue placeholder={rotuloAcao(form.acao)} /></SelectTrigger>
                  <SelectContent>{ACOES.filter((a) => travado || !a.somenteSistema).map((a) => <SelectItem key={a.valor} value={a.valor}>{a.rotulo}</SelectItem>)}</SelectContent>
                </Select>
                {camposAcao && (form.acao === "criar_tarefa" || form.acao === "remarcar_tarefa") && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Daqui a quantos dias</Label><Input type="number" min={0} value={form.dias} onChange={(e) => set({ dias: Number(e.target.value) })} /></div>
                    <label className="flex items-end gap-2 pb-2 text-sm"><Checkbox checked={form.diasUteis} onCheckedChange={(v) => set({ diasUteis: !!v })} /> Dias úteis</label>
                    {form.acao === "criar_tarefa" && (
                      <div className="space-y-1"><Label className="text-xs">Horário (vazio = dia todo)</Label><Input type="time" value={form.hora} onChange={(e) => set({ hora: e.target.value })} /></div>
                    )}
                  </div>
                )}
                {camposAcao && form.acao === "criar_tarefa" && (
                  <>
                    <div className="space-y-1"><Label className="text-xs">Título (use {"{cliente}"} e {"{empresa}"})</Label><Input value={form.titulo} onChange={(e) => set({ titulo: e.target.value })} /></div>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.evitar} onCheckedChange={(v) => set({ evitar: !!v })} /> Não criar se o cliente já tiver tarefa pendente</label>
                  </>
                )}
                {camposAcao && (form.acao === "criar_tarefa" || form.acao === "transferir_tarefas") && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1"><Label className="text-xs">Responsável</Label>
                      <Select value={form.responsavel} onValueChange={(v) => set({ responsavel: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vinculado">Usuário vinculado ao cliente</SelectItem>
                          <SelectItem value="executor">Quem fez a ação</SelectItem>
                          <SelectItem value="fixo">Usuário específico</SelectItem>
                        </SelectContent>
                      </Select></div>
                    {form.responsavel === "fixo" ? (
                      <div className="space-y-1"><Label className="text-xs">Usuário</Label>
                        <Select value={form.usuarioFixo} onValueChange={(v) => set({ usuarioFixo: v })}>
                          <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                          <SelectContent>{usuarios.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                        </Select></div>
                    ) : form.acao === "criar_tarefa" && (
                      <div className="space-y-1"><Label className="text-xs">Canal da tarefa</Label>
                        <Select value={form.canalTarefa || "regra"} onValueChange={(v) => set({ canalTarefa: v === "regra" ? "" : v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="regra">Sem canal</SelectItem>{CANAIS_REGRA.map((c) => <SelectItem key={c.valor} value={c.valor}>{c.rotulo}</SelectItem>)}</SelectContent>
                        </Select></div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-1"><Label>Descrição (opcional)</Label><Input value={form.descricao} onChange={(e) => set({ descricao: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={pedirSalvar} disabled={salvando}>Salvar regra</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aviso} onOpenChange={(o) => !o && setAviso(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Aviso: regras relacionadas</DialogTitle>
            <DialogDescription>Estas regras podem interferir na regra "{form?.nome}". Escolha o que fazer com cada uma.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {aviso?.itens.map((i) => (
              <div key={i.regra.id} className={cn("rounded-md border p-3", corNivel[i.nivel])}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{i.regra.nome} <Badge variant="outline" className="ml-1 text-[10px]">Risco {rotNivel[i.nivel]}</Badge>
                      {i.regra.executor === "tela" && <Badge variant="outline" className="ml-1 text-[10px]">Executada pela tela</Badge>}</p>
                    <p className="text-xs text-muted-foreground">{rotuloGatilho(i.regra.gatilho)} → {rotuloAcao(i.regra.acao)}</p>
                    <p className="text-xs">{i.motivos.join(" · ")}</p>
                  </div>
                  <Select value={aviso.escolhas[i.regra.id]} onValueChange={(v) => setAviso((a) => a && { ...a, escolhas: { ...a.escolhas, [i.regra.id]: v } })}>
                    <SelectTrigger className="w-56 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>{MODOS_RELACAO.filter((m) => m.valor !== "desativar" || (!i.regra.sistema || i.regra.executor === "banco")).map((m) => <SelectItem key={m.valor} value={m.valor}>{m.rotulo}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">"Sobrepor" e "Ignorar" valem quando as duas disparam no mesmo momento. Regras executadas pela tela seguem o próprio funcionamento; a relação fica registrada no mapa.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAviso(null)}>Voltar e editar</Button>
            <Button onClick={() => aviso && salvar(aviso.escolhas)} disabled={salvando}>Salvar com estas escolhas</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)} onConfirm={confirmarExclusao} itemName={excluir?.nome} />
    </section>
  );
}
