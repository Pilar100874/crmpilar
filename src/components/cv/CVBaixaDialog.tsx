import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ClipboardCheck, Package, Wrench, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { TIPO_LABEL, TIPO_TONE, type TipoServico } from "@/lib/cv/ordens";

export interface BaixaItem {
  id: string;
  descricao: string;
  pecas?: string | null;
  tipo: TipoServico;
}

export interface BaixaPayload {
  marcados: Record<string, boolean>;
  km: number;
  data: string; // ISO
  responsavel: string;
  custo: number | null;
  observacao: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  titulo: string;
  subtitulo?: string;
  itens: BaixaItem[];
  /** ids pré-marcados */
  preSelecionados?: string[];
  kmAtual?: number | null;
  /** exige descrição da solução (defeitos) */
  exigirObservacao?: boolean;
  onConfirm: (p: BaixaPayload) => Promise<void>;
}

/** Diálogo padrão de BAIXA — usado em manutenções e defeitos. Sempre exige data e KM. */
export default function CVBaixaDialog({
  open, onOpenChange, titulo, subtitulo, itens, preSelecionados, kmAtual, exigirObservacao, onConfirm,
}: Props) {
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ km: "", data: "", responsavel: "", custo: "", observacao: "" });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    const pre = new Set(preSelecionados ?? itens.map(i => i.id));
    setMarcados(Object.fromEntries(itens.map(i => [i.id, pre.has(i.id)])));
    setForm({
      km: kmAtual ? String(kmAtual) : "",
      data: new Date().toISOString().slice(0, 10),
      responsavel: "",
      custo: "",
      observacao: "",
    });
  }, [open]);

  const grupos = useMemo(() => ({
    manutencao: itens.filter(i => i.tipo === "manutencao"),
    defeito: itens.filter(i => i.tipo === "defeito"),
  }), [itens]);

  const selecionados = Object.values(marcados).filter(Boolean).length;

  const toggleGrupo = (tipo: TipoServico, valor: boolean) =>
    setMarcados(m => ({ ...m, ...Object.fromEntries(grupos[tipo].map(i => [i.id, valor])) }));

  const confirmar = async () => {
    const km = Number(form.km);
    if (!form.data) return toast.error("Informe a data da execução");
    if (!km || km <= 0) return toast.error("Informe o KM do veículo na execução");
    if (!form.responsavel.trim()) return toast.error("Informe o responsável pela execução");
    if (exigirObservacao && !form.observacao.trim()) return toast.error("Descreva o serviço executado");
    if (!selecionados) return toast.error("Marque ao menos um item executado");
    setSalvando(true);
    try {
      await onConfirm({
        marcados,
        km,
        data: new Date(`${form.data}T12:00:00`).toISOString(),
        responsavel: form.responsavel.trim().toUpperCase(),
        custo: form.custo ? Number(form.custo) : null,
        observacao: form.observacao.trim(),
      });
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao dar baixa");
    }
    setSalvando(false);
  };

  const renderGrupo = (tipo: TipoServico) => {
    const lista = grupos[tipo];
    if (!lista.length) return null;
    const todos = lista.every(i => marcados[i.id]);
    const Icon = tipo === "manutencao" ? Wrench : AlertOctagon;
    return (
      <div className="rounded-lg border">
        <div className="flex items-center justify-between gap-2 border-b bg-muted/50 px-3 py-2">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4" />
            {TIPO_LABEL[tipo]}
            <Badge variant="outline" className={`text-[10px] ${TIPO_TONE[tipo]}`}>{lista.length}</Badge>
          </span>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleGrupo(tipo, !todos)}>
            {todos ? "Desmarcar todos" : "Marcar todos"}
          </Button>
        </div>
        <div className="p-2 space-y-1.5">
          {lista.map(i => (
            <label key={i.id} className="flex items-start gap-2 rounded-md border bg-background p-2 cursor-pointer">
              <Checkbox checked={!!marcados[i.id]} onCheckedChange={c => setMarcados(m => ({ ...m, [i.id]: !!c }))} />
              <span className="min-w-0">
                <span className="text-sm font-medium block">{i.descricao}</span>
                {i.pecas && (
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" /> {i.pecas}
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" /> Baixa de serviços — {titulo}
          </DialogTitle>
          <DialogDescription>
            {subtitulo ?? "Marque o que foi executado. O que não for marcado continua pendente para a próxima parada."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {renderGrupo("manutencao")}
          {renderGrupo("defeito")}
          {!itens.length && <p className="text-sm text-muted-foreground text-center py-4">Nenhum item para baixa.</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div><Label>Data da execução *</Label><Input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} /></div>
          <div><Label>KM do veículo *</Label><Input type="number" placeholder="Ex.: 45230" value={form.km} onChange={e => setForm({ ...form, km: e.target.value })} /></div>
          <div><Label>Responsável / mecânico *</Label><Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></div>
          <div><Label>Custo total (R$)</Label><Input type="number" value={form.custo} onChange={e => setForm({ ...form, custo: e.target.value })} /></div>
          <div className="sm:col-span-2">
            <Label>Serviço executado / observação {exigirObservacao && "*"}</Label>
            <Textarea rows={2} value={form.observacao} onChange={e => setForm({ ...form, observacao: e.target.value })} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <span className="mr-auto text-xs text-muted-foreground self-center">{selecionados} de {itens.length} item(ns) marcado(s)</span>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-1" />}
            Confirmar baixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
