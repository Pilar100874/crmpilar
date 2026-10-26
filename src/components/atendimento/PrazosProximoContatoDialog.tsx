import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  lerPrazos, salvarPrazos, PRAZOS_PADRAO, ROTULOS_PRAZO,
  type OrigemPrazo, type PrazosProximoContato,
} from "@/lib/atendimento/prazosProximoContato";

export function PrazosProximoContatoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [prazos, setPrazos] = useState<PrazosProximoContato>(lerPrazos);
  useEffect(() => { if (open) setPrazos(lerPrazos()); }, [open]);

  const origens = Object.keys(ROTULOS_PRAZO) as OrigemPrazo[];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Datas dos próximos contatos</DialogTitle>
          <DialogDescription>Quantos dias depois de cada ação o próximo contato é sugerido. Você ainda pode mudar a data na hora.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {origens.map((o) => (
            <label key={o} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0">{ROTULOS_PRAZO[o]}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                <Input
                  type="number" min={0} max={365} className="h-8 w-20"
                  value={prazos[o]}
                  onChange={(e) => setPrazos((p) => ({ ...p, [o]: Math.max(0, Math.min(365, Number(e.target.value) || 0)) }))}
                />
                <span className="text-muted-foreground">dias</span>
              </span>
            </label>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setPrazos({ ...PRAZOS_PADRAO })}>Restaurar padrão</Button>
          <Button onClick={() => { salvarPrazos(prazos); toast.success("Datas dos próximos contatos salvas"); onOpenChange(false); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
