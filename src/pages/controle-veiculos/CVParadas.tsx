import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Wrench, Printer, AlertOctagon, Clock, Layers, Loader2, ClipboardCheck, Package, Search, FileDown,
  ListTree, ChevronRight, Plus,
} from "lucide-react";
import { gerarRelatorioParadasPdf } from "@/lib/cv/relatorioParadasPdf";
import { CVPageHeader, CVKpiCard } from "./CVPageHeader";
import CVBaixaDialog from "@/components/cv/CVBaixaDialog";
import CVNovoLancamentoDialog from "@/components/cv/CVNovoLancamentoDialog";
import {
  carregarParadas, consolidarParada, darBaixaParada, imprimirFicha,
  PRIORIDADE_LABEL, TIPO_LABEL, TIPO_TONE,
  type ParadaVeiculo, type Prioridade, type TipoServico,
} from "@/lib/cv/ordens";


const tonePrioridade: Record<Prioridade, string> = {
  quebra: "border-destructive bg-destructive/10 text-destructive",
  preventiva: "border-primary/50 bg-primary/10 text-primary",
  aguardar: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

export default function CVParadas() {
  const [paradas, setParadas] = useState<ParadaVeiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todas" | Prioridade>("todas");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | TipoServico>("todos");

  const [baixa, setBaixa] = useState<ParadaVeiculo | null>(null);
  const [preSelecionados, setPreSelecionados] = useState<string[] | undefined>();
  const [detalhe, setDetalhe] = useState<ParadaVeiculo | null>(null);
  const [selecao, setSelecao] = useState<Record<string, boolean>>({});
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoVeiculo, setNovoVeiculo] = useState<string | undefined>();


  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const [expOpen, setExpOpen] = useState(false);
  const [expGerando, setExpGerando] = useState(false);
  const [exp, setExp] = useState({
    inicio: primeiroDia.toISOString().slice(0, 10),
    fim: hoje.toISOString().slice(0, 10),
    veiculo: "todos",
    incluirPendentes: true,
  });

  const exportarPdf = async () => {
    if (!exp.inicio || !exp.fim) return toast.error("Informe o período");
    if (exp.inicio > exp.fim) return toast.error("Data inicial maior que a final");
    setExpGerando(true);
    try {
      const r = await gerarRelatorioParadasPdf({
        inicio: exp.inicio,
        fim: exp.fim,
        vehicleIds: exp.veiculo === "todos" ? [] : [exp.veiculo],
        incluirPendentes: exp.incluirPendentes,
      });
      toast.success(`PDF gerado: ${r.ordens} ordem(ns) em ${r.veiculos} veículo(s)`);
      setExpOpen(false);
    } catch (e: any) { toast.error(e?.message ?? "Erro ao gerar PDF"); }
    setExpGerando(false);
  };

  const load = async (autoGerar = true) => {
    setLoading(true);
    try {
      let lista = await carregarParadas();
      // Ordens de serviço são geradas automaticamente para as preventivas pendentes
      if (autoGerar && lista.some(p => p.alertasSemOrdem.length)) {
        for (const p of lista.filter(x => x.alertasSemOrdem.length)) {
          try { await consolidarParada(p); } catch { /* ignora */ }
        }
        lista = await carregarParadas();
      }
      setParadas(lista);
    }
    catch (e: any) { toast.error(e?.message ?? "Erro ao carregar paradas"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtradas = useMemo(() => paradas
    .map(p => filtroTipo === "todos" ? p : { ...p, itens: p.itens.filter(i => i.tipo === filtroTipo) })
    .filter(p => {
      const texto = `${p.vehicle.name ?? ""} ${p.vehicle.plate ?? ""}`.toLowerCase();
      const okTexto = !q || texto.includes(q.toLowerCase());
      const okPrio = filtro === "todas" || p.prioridade === filtro;
      const okTipo = filtroTipo === "todos" || p.itens.length > 0;
      return okTexto && okPrio && okTipo;
    }), [paradas, q, filtro, filtroTipo]);

  const totalManutencao = paradas.reduce((s, p) => s + p.totalManutencao, 0);
  const totalDefeito = paradas.reduce((s, p) => s + p.totalDefeito, 0);
  const quebras = paradas.filter(p => p.prioridade === "quebra").length;
  const totalItens = paradas.reduce((s, p) => s + p.itens.length, 0);

  const agrupar = async (p: ParadaVeiculo) => {
    setBusy(p.vehicle.id);
    try {
      const r = await consolidarParada(p);
      toast[r.criado ? "success" : "info"](
        r.criado ? `Ordem única gerada com ${r.itens} item(ns)` : "Nada novo para agrupar",
      );
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Erro ao agrupar"); }
    setBusy(null);
  };

  const abrirBaixa = (p: ParadaVeiculo, apenasSelecionados = false) => {
    const sel = p.itens.filter(i => selecao[i.id]).map(i => i.id);
    setPreSelecionados(apenasSelecionados && sel.length ? sel : undefined);
    setBaixa(p);
  };

  const confirmarBaixa = async (payload: {
    marcados: Record<string, boolean>; km: number; data: string;
    responsavel: string; custo: number | null; observacao: string;
  }) => {
    if (!baixa) return;
    const r = await darBaixaParada({ parada: baixa, ...payload });
    toast[r.pendentes ? "warning" : "success"](
      r.pendentes
        ? `${r.feitos} item(ns) baixado(s) — ${r.pendentes} continua(m) pendente(s)`
        : `Parada concluída: ${r.feitos} item(ns) executado(s)`,
    );
    setBaixa(null);
    setSelecao({});
    await load();
  };

  const renderItens = (p: ParadaVeiculo, tipo: TipoServico) => {
    const lista = p.itens.filter(i => i.tipo === tipo);
    if (!lista.length) return null;
    const Icon = tipo === "manutencao" ? Wrench : AlertOctagon;
    return (
      <div className="rounded-lg border">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <Icon className="h-3.5 w-3.5" /> {TIPO_LABEL[tipo]}
            <Badge variant="outline" className={`text-[10px] ${TIPO_TONE[tipo]}`}>{lista.length}</Badge>
          </span>
          <Button
            size="sm" variant="ghost" className="h-6 text-[11px]"
            onClick={() => {
              const todos = lista.every(i => selecao[i.id]);
              setSelecao(s => ({ ...s, ...Object.fromEntries(lista.map(i => [i.id, !todos])) }));
            }}
          >
            {lista.every(i => selecao[i.id]) ? "Desmarcar" : "Selecionar"}
          </Button>
        </div>
        <div className="divide-y">
          {lista.map(i => (
            <label key={i.id} className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted/30">
              <Checkbox checked={!!selecao[i.id]} onCheckedChange={c => setSelecao(s => ({ ...s, [i.id]: !!c }))} />
              <span className="min-w-0 flex-1">
                <span className="text-sm font-medium block">{i.descricao}</span>
                {i.pecas && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" /> {i.pecas}
                  </span>
                )}
              </span>
              <Badge variant="outline" className={`shrink-0 text-[10px] ${tonePrioridade[i.prioridade]}`}>
                {PRIORIDADE_LABEL[i.prioridade]}
              </Badge>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={Wrench}
        title="Manutenções & Defeitos"
        subtitle={`${paradas.length} veículo(s) com pendências • ${totalManutencao} manutenção(ões) • ${totalDefeito} defeito(s)`}
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setExpOpen(true)}>
              <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
            </Button>
            <Button size="sm" className="bg-white text-primary hover:bg-white/90" onClick={() => { setNovoVeiculo(undefined); setNovoOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Novo lançamento
            </Button>
          </div>
        }

      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <CVKpiCard label="Manutenções pendentes" value={totalManutencao} icon={Wrench} tone="info" />
        <CVKpiCard label="Defeitos pendentes" value={totalDefeito} icon={AlertOctagon} tone="warning" />
        <CVKpiCard label="Veículos parados (quebra)" value={quebras} icon={Clock} tone="primary" />
        <CVKpiCard label="Total de serviços" value={totalItens} icon={ClipboardCheck} tone="success" />
      </div>

      <Card>
        <CardContent className="p-3 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="Buscar veículo ou placa..." value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {(["todos", "manutencao", "defeito"] as const).map(t => (
                <Button key={t} size="sm" variant={filtroTipo === t ? "default" : "outline"} onClick={() => setFiltroTipo(t)}>
                  {t === "todos" ? "Tudo" : TIPO_LABEL[t]}
                </Button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["todas", "quebra", "preventiva", "aguardar"] as const).map(f => (
              <Button key={f} size="sm" variant={filtro === f ? "secondary" : "ghost"} onClick={() => setFiltro(f)}>
                {f === "todas" ? "Todas as prioridades" : PRIORIDADE_LABEL[f]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>}
      {!loading && !filtradas.length && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma pendência 🎉</CardContent></Card>
      )}

      <div className="space-y-4">
        {filtradas.map(p => {
          const selecionados = p.itens.filter(i => selecao[i.id]).length;
          return (
            <Card key={p.vehicle.id} className={`border-l-4 ${p.prioridade === "quebra" ? "border-l-destructive" : p.prioridade === "preventiva" ? "border-l-primary" : "border-l-muted-foreground/40"}`}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle
                    className="text-base flex items-center gap-2 min-w-0 cursor-pointer hover:underline"
                    onClick={() => setDetalhe(p)}
                  >
                    <span className="truncate">{p.vehicle.name} — {p.vehicle.plate}</span>
                    <Badge variant="outline" className={tonePrioridade[p.prioridade]}>{PRIORIDADE_LABEL[p.prioridade]}</Badge>
                  </CardTitle>

                  <div className="flex flex-wrap gap-2">
                    {!!p.alertasSemOrdem.length && (
                      <Button size="sm" variant="secondary" disabled={busy === p.vehicle.id} onClick={() => agrupar(p)}>
                        {busy === p.vehicle.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Layers className="h-4 w-4 mr-1" />}
                        Agrupar {p.alertasSemOrdem.length} preventiva(s)
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => { setExp(v => ({ ...v, veiculo: p.vehicle.id })); setExpOpen(true); }}>
                      <FileDown className="h-4 w-4 mr-1" /> PDF
                    </Button>
                    <Button size="sm" variant="outline" disabled={!p.itens.length} onClick={() => imprimirFicha(p)}>
                      <Printer className="h-4 w-4 mr-1" /> Ficha
                    </Button>
                    <Button size="sm" disabled={!p.itens.length} onClick={() => abrirBaixa(p, selecionados > 0)}>
                      <ClipboardCheck className="h-4 w-4 mr-1" />
                      {selecionados > 0 ? `Dar baixa (${selecionados})` : "Dar baixa"}
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  KM atual: {(p.vehicle.current_km ?? 0).toLocaleString("pt-BR")} • {p.totalManutencao} manutenção(ões) • {p.totalDefeito} defeito(s)
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {renderItens(p, "manutencao")}
                {renderItens(p, "defeito")}

                <Button variant="ghost" size="sm" className="w-full justify-between" onClick={() => setDetalhe(p)}>
                  <span className="flex items-center gap-2"><ListTree className="h-4 w-4" /> Ver ordens de serviço ({p.itens.length})</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {!!p.alertasSemOrdem.length && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {p.alertasSemOrdem.length} preventiva(s) vencida(s)/próxima(s) ainda sem ordem — agrupe para incluir nesta parada.
                  </p>
                )}
                {!!p.pecas.length && (
                  <div className="rounded-md border border-dashed p-2">
                    <p className="text-xs font-semibold flex items-center gap-1 mb-1"><Package className="h-3.5 w-3.5" /> Peças e insumos da parada</p>
                    <div className="flex flex-wrap gap-1">
                      {p.pecas.map(x => <Badge key={x} variant="secondary" className="text-[10px]">{x}</Badge>)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!detalhe} onOpenChange={o => { if (!o) setDetalhe(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTree className="h-4 w-4" /> {detalhe?.vehicle.name} — {detalhe?.vehicle.plate}
            </DialogTitle>
            <DialogDescription>
              Ordens de serviço abertas — manutenções programadas e defeitos/avarias na mesma parada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {Array.from(new Set((detalhe?.itens ?? []).map(i => i.ordemId))).map((ordemId, idx) => {
              const itens = (detalhe?.itens ?? []).filter(i => i.ordemId === ordemId);
              return (
                <div key={ordemId} className="rounded-md border">
                  <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-2">
                    <p className="text-sm font-semibold">Ordem #{idx + 1}</p>
                    <Badge variant="outline" className={`text-[10px] ${TIPO_TONE[itens[0].tipo]}`}>{TIPO_LABEL[itens[0].tipo]}</Badge>
                  </div>
                  <div className="p-2 space-y-1.5">
                    {itens.map(i => (
                      <div key={i.id} className="flex items-start justify-between gap-2 rounded-md border bg-background px-2 py-1.5">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{i.descricao}</p>
                          {i.pecas && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> {i.pecas}</p>}
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <Badge variant="outline" className={`text-[10px] ${TIPO_TONE[i.tipo]}`}>{TIPO_LABEL[i.tipo]}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${tonePrioridade[i.prioridade]}`}>{PRIORIDADE_LABEL[i.prioridade]}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {!detalhe?.itens.length && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma ordem aberta para este veículo.</p>
            )}
          </div>

          <DialogFooter>
            {!!detalhe?.itens.length && (
              <Button variant="outline" onClick={() => detalhe && imprimirFicha(detalhe)}>
                <Printer className="h-4 w-4 mr-1" /> Imprimir ficha
              </Button>
            )}
            <Button onClick={() => { const d = detalhe; setDetalhe(null); if (d?.itens.length) abrirBaixa(d); }} disabled={!detalhe?.itens.length}>
              <ClipboardCheck className="h-4 w-4 mr-1" /> Dar baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CVBaixaDialog
        open={!!baixa}
        onOpenChange={o => { if (!o) setBaixa(null); }}
        titulo={`${baixa?.vehicle.name ?? ""} (${baixa?.vehicle.plate ?? ""})`}
        itens={(baixa?.itens ?? []).map(i => ({ id: i.id, descricao: i.descricao, pecas: i.pecas, tipo: i.tipo }))}
        preSelecionados={preSelecionados}
        kmAtual={baixa?.vehicle.current_km ?? null}
        onConfirm={confirmarBaixa}
      />

      <Dialog open={expOpen} onOpenChange={setExpOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileDown className="h-4 w-4" /> Exportar relatório de paradas</DialogTitle>
            <DialogDescription>
              Gera um PDF com as ordens, o checklist executado/pendente e as peças/insumos, por veículo e período.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Veículo</Label>
              <select
                className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={exp.veiculo}
                onChange={e => setExp(v => ({ ...v, veiculo: e.target.value }))}
              >
                <option value="todos">Todos os veículos</option>
                {paradas.map(p => (
                  <option key={p.vehicle.id} value={p.vehicle.id}>
                    {p.vehicle.name} — {p.vehicle.plate}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data inicial</Label>
                <Input type="date" value={exp.inicio} onChange={e => setExp(v => ({ ...v, inicio: e.target.value }))} />
              </div>
              <div>
                <Label>Data final</Label>
                <Input type="date" value={exp.fim} onChange={e => setExp(v => ({ ...v, fim: e.target.value }))} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={exp.incluirPendentes}
                onCheckedChange={c => setExp(v => ({ ...v, incluirPendentes: c === true }))}
              />
              Incluir ordens ainda pendentes (mesmo fora do período)
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpOpen(false)}>Cancelar</Button>
            <Button onClick={exportarPdf} disabled={expGerando}>
              {expGerando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
              Gerar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
