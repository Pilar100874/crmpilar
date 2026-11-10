import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/lib/toast-config";
import { MOTIVOS_PERDA, registrarPerda, validarMotivoPerda, type ItemPerda, type MotivoPerda } from "@/lib/orcamento/motivoPerda";

interface Props {
  orcamentoId: string | null;
  etapaAnterior?: string;
  onOpenChange: (open: boolean) => void;
  onSalvo: (orcamentoId: string, motivo: string) => void;
}

const VAZIO: MotivoPerda = { tipo: "", itens: [] };

export default function MotivoPerdaDialog({ orcamentoId, etapaAnterior, onOpenChange, onSalvo }: Props) {
  const [m, setM] = useState<MotivoPerda>(VAZIO);
  const [itens, setItens] = useState<ItemPerda[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [tentou, setTentou] = useState(false);

  useEffect(() => {
    setM(VAZIO); setTentou(false); setItens([]);
    if (!orcamentoId) return;
    void supabase.from("orcamento_itens").select("id, preco_unitario, produtos(nome)").eq("orcamento_id", orcamentoId)
      .then(({ data }) => setItens((data ?? []).map((i: any) => ({ itemId: i.id, nome: i.produtos?.nome ?? "Item", nossoPreco: Number(i.preco_unitario) || 0 }))));
  }, [orcamentoId]);

  const pend = validarMotivoPerda(m);
  const usaItens = m.tipo === "preco" || m.tipo === "estoque";
  const marcado = (id: string) => m.itens.find((i) => i.itemId === id);
  const alternar = (it: ItemPerda) => setM((s) => ({ ...s, itens: marcado(it.itemId) ? s.itens.filter((i) => i.itemId !== it.itemId) : [...s.itens, it] }));
  const precoCliente = (id: string, v: string) => setM((s) => ({ ...s, itens: s.itens.map((i) => i.itemId === id ? { ...i, precoCliente: Number(v.replace(",", ".")) } : i) }));

  const salvar = async () => {
    setTentou(true);
    if (!orcamentoId || pend.length) return;
    setSalvando(true);
    try { const texto = await registrarPerda(orcamentoId, m, etapaAnterior); toast.success("Orçamento marcado como perdido"); onSalvo(orcamentoId, texto); }
    catch (e: any) { toast.error(e?.message || "Não foi possível salvar"); }
    finally { setSalvando(false); }
  };

  return (
    <Dialog open={!!orcamentoId} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" />Motivo da perda</DialogTitle>
          <DialogDescription>Obrigatório para cancelar o orçamento. O cliente sai do acompanhamento diário.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2">
            {MOTIVOS_PERDA.map((o) => (
              <button key={o.id} type="button" aria-pressed={m.tipo === o.id}
                onClick={() => setM({ ...VAZIO, tipo: o.id })}
                className={cn("min-h-11 rounded-lg border px-3 text-left text-sm font-medium transition-colors", m.tipo === o.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/40")}>
                {o.rotulo}
              </button>
            ))}
          </div>

          {usaItens && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{m.tipo === "preco" ? "Quais itens e qual valor o cliente tinha?" : "Quais itens faltaram?"}</Label>
              {!itens.length && <p className="text-xs text-muted-foreground">Este orçamento não tem itens.</p>}
              {itens.map((it) => {
                const sel = marcado(it.itemId);
                return (
                  <div key={it.itemId} className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2">
                    <Checkbox checked={!!sel} onCheckedChange={() => alternar(it)} aria-label={it.nome} />
                    <span className="min-w-0 flex-1 truncate text-sm">{it.nome}</span>
                    <span className="text-xs text-muted-foreground">{it.nossoPreco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    {m.tipo === "preco" && sel && (
                      <Input inputMode="decimal" placeholder="Valor do cliente" className="h-8 w-32" onChange={(e) => precoCliente(it.itemId, e.target.value)} />
                    )}
                  </div>
                );
              })}
              {m.tipo === "preco" && <Input placeholder="Concorrente (opcional)" value={m.concorrente ?? ""} onChange={(e) => setM({ ...m, concorrente: e.target.value })} />}
            </div>
          )}

          {m.tipo === "prazo_entrega" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><Label className="text-sm font-semibold">Prazo pedido</Label><Input placeholder="Ex.: 2 dias" value={m.prazoSolicitado ?? ""} onChange={(e) => setM({ ...m, prazoSolicitado: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-sm font-semibold">Prazo ofertado</Label><Input placeholder="Ex.: 10 dias" value={m.prazoOfertado ?? ""} onChange={(e) => setM({ ...m, prazoOfertado: e.target.value })} /></div>
            </div>
          )}
          {m.tipo === "pagamento" && (
            <div className="space-y-1"><Label className="text-sm font-semibold">Condição exigida</Label><Input placeholder="Ex.: 30/60/90 no boleto" value={m.condicaoExigida ?? ""} onChange={(e) => setM({ ...m, condicaoExigida: e.target.value })} /></div>
          )}
          {m.tipo && (
            <div className="space-y-1">
              <Label className="text-sm font-semibold">Observação{m.tipo === "desistencia" || m.tipo === "outro" ? " (obrigatória)" : ""}</Label>
              <Textarea className="min-h-[90px]" value={m.observacao ?? ""} onChange={(e) => setM({ ...m, observacao: e.target.value })} />
            </div>
          )}
          {tentou && pend.length > 0 && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{pend[0]}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button variant="destructive" onClick={salvar} disabled={salvando}>Confirmar perda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
