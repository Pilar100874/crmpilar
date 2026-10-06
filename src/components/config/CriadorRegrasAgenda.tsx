import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, ChevronDown, Network, Pencil, Plus, Search, Trash2, Wand2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { AjustesAlertaAgenda } from "@/components/config/AjustesAlertaAgenda";
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
  const [busca, setBusca] = useState("");
  const [telaFiltro, setTelaFiltro] = useState("todas");
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  const [ajusteAlerta, setAjusteAlerta] = useState<Regra | null>(null);
  const [carregando, setCarregando] = useState(true);
  const db = supabase as any;

  const carregar = async () => {
    const [automacoes, validacoes] = await Promise.all([
      db.from("calendario_regras_automacao").select("*").eq("estabelecimento_id", estabelecimentoId).order("prioridade").order("created_at"),
      db.from("calendario_regras").select("*").eq("estabelecimento_id", estabelecimentoId).order("ordem"),
    ]);
    setCarregando(false);
    if (automacoes.error || validacoes.error) { toast.error("Não foi possível carregar todas as regras"); return; }
    const catalogo: Regra[] = automacoes.data || [];
    for (const validacao of validacoes.data || []) {
      const chave = `cal_${validacao.tipo}`;
      const existente = catalogo.find((r) => r.chave === chave);
      if (existente) {
        existente.acao_config = validacao.configuracao || {};
        existente.ativa = validacao.ativa;
      } else {
        catalogo.push({ id: `validacao-${validacao.id}`, chave, nome: validacao.nome, descricao: validacao.descricao,
          tela: "Calendário", gatilho: "tarefa_criada_manual", acao: `validar_${validacao.tipo}`, ativa: validacao.ativa,
          condicoes: {}, acao_config: validacao.configuracao || {}, relacoes: {}, sistema: true, executor: "tela",
          prioridade: 20 + (validacao.ordem || 0), execucoes: 0 });
      }
    }
    setRegras(catalogo.sort((a, b) => a.prioridade - b.prioridade));
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
    if (["cal_alerta_urgente", "cal_alerta_tarefas_urgentes"].includes(r.chave || "")) { setAjusteAlerta(r); return; }
    if (r.id.startsWith("validacao-")) { toast.info("Esta validação faz parte do funcionamento do calendário"); return; }
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
    Object.entries(escolhas).forEach(([id, m]) => { if (m !== "desativar") relacoes[id] = m; });
    const linha: any = form.sistema
      ? { descricao: form.descricao || null, prioridade: form.prioridade, relacoes, ...(form.executor === "banco" ? { acao_config } : {}) }
      : { estabelecimento_id: estabelecimentoId, nome: form.nome.trim(), descricao: form.descricao || null, gatilho: form.gatilho, acao: form.acao,
          condicoes, acao_config, prioridade: form.prioridade, relacoes, tela: telaDoGatilho(form.gatilho) };
    setSalvando(true);
    const { error } = form.id
      ? await db.from("calendario_regras_automacao").update(linha).eq("id", form.id)
      : await db.from("calendario_regras_automacao").insert(linha);
    setSalvando(false);
    if (error) return toast.error("Não foi possível salvar a regra");
    toast.success("Regra salva");
    setAviso(null); setForm(null); void carregar();
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

  const alternarExpansao = (id: string) => setExpandidas((anteriores) => {
    const proximas = new Set(anteriores);
    if (proximas.has(id)) proximas.delete(id); else proximas.add(id);
    return proximas;
  });
  const cartaoRegra = (r: Regra) => {
    const itens = interferenciasDe(r);
    const aberta = expandidas.has(r.id);
    return (
      <article key={r.id} className="overflow-hidden rounded-md border bg-card">
        <div className="flex items-start gap-1 p-2 sm:p-3">
          <Button variant="ghost" className="h-auto min-w-0 flex-1 items-start justify-start gap-3 whitespace-normal p-2 text-left" aria-expanded={aberta} aria-controls={`detalhes-${r.id}`} onClick={() => alternarExpansao(r.id)}>
            <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 space-y-2">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                {r.nome}
                <Badge variant="secondary" className="text-[10px]">{r.sistema ? "Sistema" : "Personalizada"}</Badge>
                {!r.ativa && <Badge variant="outline" className="text-[10px]">Não está em execução</Badge>}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs font-normal text-muted-foreground">
                <span>{rotuloGatilho(r.gatilho)}</span><ArrowRight className="h-3 w-3 shrink-0" /><span>{rotuloAcao(r.acao)}</span>
              </span>
              {itens.length > 0 && <span className="flex items-center gap-1 text-xs font-normal text-warning"><AlertTriangle className="h-3.5 w-3.5" />{itens.length} {itens.length === 1 ? "regra relacionada" : "regras relacionadas"}</span>}
            </span>
            <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", aberta && "rotate-180")} />
          </Button>
          <div className="flex shrink-0 flex-col sm:flex-row">
            {!r.id.startsWith("validacao-") && <Button size="icon" variant="ghost" className="h-8 w-8" title={`Editar ${r.nome}`} aria-label={`Editar ${r.nome}`} onClick={() => editar(r)}><Pencil className="h-4 w-4" /></Button>}
            {!r.sistema && <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title={`Excluir ${r.nome}`} aria-label={`Excluir ${r.nome}`} onClick={() => setExcluir(r)}><Trash2 className="h-4 w-4" /></Button>}
          </div>
        </div>
        {aberta && <div id={`detalhes-${r.id}`} className="space-y-4 border-t bg-muted/20 p-4 sm:pl-12">
          <div className="space-y-2"><p className="text-sm">{r.descricao || resumo(r)}</p><p className="text-xs text-muted-foreground">{resumo(r)}</p>
            <div className="flex flex-wrap gap-2"><Badge variant="outline">Prioridade {r.prioridade}</Badge><Badge variant="outline">{r.executor === "tela" ? "Executada na tela" : "Automática"}</Badge>{!r.sistema && <Badge variant="outline">{r.execucoes} execuções</Badge>}</div>
          </div>
          {["cal_alerta_urgente", "cal_alerta_tarefas_urgentes"].includes(r.chave || "") && <Button variant="outline" size="sm" onClick={() => setAjusteAlerta(r)}><Pencil className="h-3.5 w-3.5" /> Ajustar níveis de alerta</Button>}
          <div><h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-warning" />Interferências e relações</h4>
            {itens.length === 0 ? <p className="text-xs text-muted-foreground">Nenhuma interferência identificada nas regras configuradas.</p> : <ul className="divide-y">
              {itens.map((i) => <li key={i.regra.id} className="space-y-1 py-3 text-xs">
                <p className="flex flex-wrap items-center gap-2 font-medium">{i.regra.nome}<Badge variant="outline" className={cn("text-[10px]", corNivel[i.nivel])}>Risco {rotNivel[i.nivel]}</Badge><span className="font-normal text-muted-foreground">{telaDe(i.regra as Regra)}</span></p>
                <p className="text-muted-foreground">{i.motivos.join(" · ")}</p>
                <p>{relacaoEntre(r, i.regra) || "Sem relação definida — seguem a configuração e a prioridade de cada regra."}</p>
              </li>)}
            </ul>}
            {itens.some((i) => i.regra.executor === "tela") && <p className="mt-2 text-xs text-muted-foreground">As relações com regras executadas pela tela são explicativas; não encadeiam nem alteram sua execução.</p>}
          </div>
        </div>}
      </article>
    );
  };
  const normalizar = (valor: string) => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visiveis = regras.filter((r) => (telaFiltro === "todas" || telaDe(r) === telaFiltro) && normalizar(`${r.nome} ${r.descricao || ""} ${telaDe(r)} ${resumo(r)}`).includes(normalizar(busca)));

  const travado = !!form?.sistema;
  const camposAcao = !form?.sistema || form.executor === "banco";

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold"><Wand2 className="h-5 w-5 text-primary" /> Regras do calendário e da agenda</h2>
          <p className="text-xs text-muted-foreground">{regras.length} regras · {telas.filter((t) => regras.some((r) => telaDe(r) === t)).length} telas e processos</p>
        </div>
        <Button size="sm" onClick={() => setForm(vazio())}><Plus className="h-4 w-4" /> Nova regra</Button>
      </div>

      <Tabs defaultValue="regras" className="mt-3">
        <TabsList>
          <TabsTrigger value="regras">Regras por tela</TabsTrigger>
          <TabsTrigger value="fluxo"><Network className="mr-1 h-4 w-4" /> Fluxo visual</TabsTrigger>
        </TabsList>

        <TabsContent value="regras" className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar regras" placeholder="Buscar regra, acontecimento ou tela" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" /></div>
            <Select value={telaFiltro} onValueChange={setTelaFiltro}><SelectTrigger className="w-full sm:w-64" aria-label="Filtrar por tela"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todas">Todas as telas</SelectItem>{telas.filter((t) => regras.some((r) => telaDe(r) === t)).map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </div>
          {carregando ? <p className="py-6 text-sm text-muted-foreground">Carregando regras...</p> : visiveis.length === 0 ? <p className="py-6 text-sm text-muted-foreground">Nenhuma regra encontrada.</p> : telas.filter((t) => visiveis.some((r) => telaDe(r) === t)).map((t) => (
            <section key={t} className="space-y-3">
              <div className="flex items-center gap-2 border-b pb-2"><h3 className="text-base font-semibold">{t}</h3><Badge variant="secondary">{visiveis.filter((r) => telaDe(r) === t).length} regras</Badge></div>
              <div className="space-y-2">{visiveis.filter((r) => telaDe(r) === t).map(cartaoRegra)}</div>
            </section>
          ))}
        </TabsContent>

        <TabsContent value="fluxo">
          <FluxoVisualRegrasAgenda regras={regras} onEditar={editar} />
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
                    <SelectContent>{MODOS_RELACAO.filter((m) => m.valor !== "desativar").map((m) => <SelectItem key={m.valor} value={m.valor}>{m.rotulo}</SelectItem>)}</SelectContent>
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

      {ajusteAlerta && <AjustesAlertaAgenda estabelecimentoId={estabelecimentoId} tipo={(ajusteAlerta.chave || "").slice(4)} configuracao={ajusteAlerta.acao_config || {}} onClose={() => setAjusteAlerta(null)} onSaved={() => void carregar()} />}
      <DeleteConfirmDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)} onConfirm={confirmarExclusao} itemName={excluir?.nome} />
    </section>
  );
}
