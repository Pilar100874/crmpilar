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
} from "lucide-react";
import { gerarRelatorioParadasPdf } from "@/lib/cv/relatorioParadasPdf";
import { CVPageHeader, CVKpiCard } from "./CVPageHeader";
import {
  carregarParadas, consolidarParada, darBaixaParada, imprimirFicha,
  PRIORIDADE_LABEL, type ParadaVeiculo, type Prioridade,
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

  const [baixa, setBaixa] = useState<ParadaVeiculo | null>(null);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ km: "", data: "", responsavel: "", custo: "" });
  const [salvando, setSalvando] = useState(false);

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

  const load = async () => {
    setLoading(true);
    try { setParadas(await carregarParadas()); }
    catch (e: any) { toast.error(e?.message ?? "Erro ao carregar paradas"); }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtradas = useMemo(() => paradas.filter(p => {
    const texto = `${p.vehicle.name ?? ""} ${p.vehicle.plate ?? ""}`.toLowerCase();
    return (!q || texto.includes(q.toLowerCase())) && (filtro === "todas" || p.prioridade === filtro);
  }), [paradas, q, filtro]);

  const quebras = paradas.filter(p => p.prioridade === "quebra").length;
  const preventivas = paradas.filter(p => p.prioridade === "preventiva").length;
  const aguardando = paradas.filter(p => p.prioridade === "aguardar").length;
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

  const abrirBaixa = (p: ParadaVeiculo) => {
    setBaixa(p);
    setMarcados(Object.fromEntries(p.itens.map(i => [i.id, i.feito === true])));
    setForm({
      km: String(p.vehicle.current_km ?? ""),
      data: new Date().toISOString().slice(0, 10),
      responsavel: "",
      custo: "",
    });
  };

  const confirmarBaixa = async () => {
    if (!baixa) return;
    if (!form.responsavel.trim()) return toast.error("Informe o mecânico responsável");
    const km = Number(form.km);
    if (!km || km <= 0) return toast.error("Informe o KM do veículo na execução");
    if (!form.data) return toast.error("Informe a data de execução");
    setSalvando(true);
    try {
      const r = await darBaixaParada({
        parada: baixa,
        marcados,
        km,
        data: new Date(`${form.data}T12:00:00`).toISOString(),
        responsavel: form.responsavel.trim().toUpperCase(),
        custo: form.custo ? Number(form.custo) : null,
      });
      toast[r.pendentes ? "warning" : "success"](
        r.pendentes
          ? `${r.feitos} item(ns) baixado(s) — ${r.pendentes} continua(m) pendente(s)`
          : `Parada concluída: ${r.feitos} item(ns) executado(s)`,
      );
      setBaixa(null);
      await load();
    } catch (e: any) { toast.error(e?.message ?? "Erro ao dar baixa"); }
    setSalvando(false);
  };

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={Wrench}
        title="Paradas de Manutenção"
        subtitle={`${paradas.length} veículo(s) com pendências • ${totalItens} serviço(s)`}
        actions={
          <Button size="sm" variant="outline" onClick={() => setExpOpen(true)}>
            <FileDown className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <CVKpiCard label="Quebras (parado)" value={quebras} icon={AlertOctagon} tone="warning" />
        <CVKpiCard label="Preventivas" value={preventivas} icon={Wrench} tone="info" />
        <CVKpiCard label="Podem aguardar" value={aguardando} icon={Clock} tone="primary" />
        <CVKpiCard label="Serviços pendentes" value={totalItens} icon={ClipboardCheck} tone="success" />
      </div>

      <Card>
        <CardContent className="p-3 flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input className="pl-10" placeholder="Buscar veículo ou placa..." value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {(["todas", "quebra", "preventiva", "aguardar"] as const).map(f => (
              <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f)}>
                {f === "todas" ? "Todas" : PRIORIDADE_LABEL[f]}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading && <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>}
      {!loading && !filtradas.length && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhuma parada pendente 🎉</CardContent></Card>
      )}

      <div className="space-y-4">
        {filtradas.map(p => (
          <Card key={p.vehicle.id} className={`border-l-4 ${p.prioridade === "quebra" ? "border-l-destructive" : p.prioridade === "preventiva" ? "border-l-primary" : "border-l-muted-foreground/40"}`}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2 min-w-0">
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
                  <Button size="sm" variant="outline" disabled={!p.itens.length} onClick={() => imprimirFicha(p)}>
                    <Printer className="h-4 w-4 mr-1" /> Imprimir ficha
                  </Button>
                  <Button size="sm" disabled={!p.itens.length} onClick={() => abrirBaixa(p)}>
                    <ClipboardCheck className="h-4 w-4 mr-1" /> Dar baixa
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                KM atual: {(p.vehicle.current_km ?? 0).toLocaleString("pt-BR")} • {p.itens.length} serviço(s) na parada
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.itens.map(i => (
                <div key={i.id} className="flex items-start justify-between gap-2 rounded-md border bg-muted/40 px-2 py-1.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{i.descricao}</p>
                    {i.pecas && <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" /> {i.pecas}</p>}
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-[10px] ${tonePrioridade[i.prioridade]}`}>{PRIORIDADE_LABEL[i.prioridade]}</Badge>
                </div>
              ))}
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
        ))}
      </div>

      <Dialog open={!!baixa} onOpenChange={o => { if (!o) setBaixa(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Baixa da parada — {baixa?.vehicle.name} ({baixa?.vehicle.plate})</DialogTitle>
            <DialogDescription>
              Marque o que foi executado. O que não for marcado continua pendente para a próxima parada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {baixa?.itens.map(i => (
              <label key={i.id} className="flex items-start gap-2 rounded-md border p-2 cursor-pointer">
                <Checkbox checked={!!marcados[i.id]} onCheckedChange={c => setMarcados(m => ({ ...m, [i.id]: !!c }))} />
                <span className="min-w-0">
                  <span className="text-sm font-medium block">{i.descricao}</span>
                  {i.pecas && <span className="text-[11px] text-muted-foreground">{i.pecas}</span>}
                </span>
              </label>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Data de execução *</Label><Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
            <div><Label>KM do veículo *</Label><Input type="number" value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} /></div>
            <div><Label>Mecânico responsável *</Label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></div>
            <div><Label>Custo total (R$)</Label><Input type="number" value={form.custo} onChange={e => setForm({ ...form, custo: e.target.value })} /></div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixa(null)}>Cancelar</Button>
            <Button onClick={confirmarBaixa} disabled={salvando}>
              {salvando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Confirmar baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
