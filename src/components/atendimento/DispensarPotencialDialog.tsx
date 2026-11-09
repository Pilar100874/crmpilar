import { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { dispensarPotencial } from "@/lib/atendimento/potenciais";

const MOTIVOS = ["Já tem estoque", "Fechou com concorrente", "Sem verba neste mês", "Não atende / sem retorno", "Outro motivo"];
const PRAZOS = [15, 30, 60];

export function DispensarPotencialDialog({ alvo, usuarioId, onClose }: { alvo: { id: string; nome: string } | null; usuarioId: string | null; onClose: () => void }) {
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [dias, setDias] = useState(30);
  const [salvando, setSalvando] = useState(false);
  const confirmar = async () => {
    if (!alvo) return;
    setSalvando(true);
    try {
      const e = await getEstabelecimentoId();
      if (!e) throw new Error("sem empresa");
      await dispensarPotencial(e, alvo.id, usuarioId, motivo, dias);
      toast.success(`${alvo.nome} volta aos potenciais em ${dias} dias`);
      onClose();
    } catch { toast.error("Não foi possível registrar"); }
    finally { setSalvando(false); }
  };
  const chip = (ativo: boolean) => cn("rounded-full border px-3 py-1 text-xs", ativo ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted");
  return (
    <Dialog open={!!alvo} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Sem interesse agora</DialogTitle>
          <DialogDescription>{alvo?.nome} sai da lista de potenciais pelo prazo escolhido.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">{MOTIVOS.map((m) => <button key={m} type="button" className={chip(m === motivo)} onClick={() => setMotivo(m)}>{m}</button>)}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs"><span className="text-muted-foreground">Voltar em</span>{PRAZOS.map((p) => <button key={p} type="button" className={chip(p === dias)} onClick={() => setDias(p)}>{p} dias</button>)}</div>
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => void confirmar()} disabled={salvando}>Confirmar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
