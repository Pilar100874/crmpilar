import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Phone, PhoneForwarded, ListOrdered } from "lucide-react";
import { useState } from "react";
import { Switch } from "@/components/ui/switch";

export const CHAVE_PARAR_AO_RECEBER = "discador.pararAoReceber";
export const lerPararAoReceber = () => localStorage.getItem(CHAVE_PARAR_AO_RECEBER) !== "0";

interface DiscadorModoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Quantidade de contatos com telefone na lista atual da agenda. */
  totalContatos: number;
  onSelect: (modo: 'previa' | 'sequencial') => void;
}

/**
 * Popup de escolha do modo de discagem. Ao escolher, o Fluxo de Atendimento
 * abre com a sequência de contatos da lista e o discador integrado:
 * a próxima ligação só sai depois de Finalizar ou Pular o atendimento atual.
 */
export function DiscadorModoDialog({ open, onOpenChange, totalContatos, onSelect }: DiscadorModoDialogProps) {
  const [pararAoReceber, setPararAoReceber] = useState(lerPararAoReceber);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Discador
          </DialogTitle>
          <DialogDescription>
            {totalContatos === 1
              ? 'Como deseja ligar para o contato com telefone da lista?'
              : `Como deseja ligar para os ${totalContatos} contatos com telefone da lista?`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <button
            onClick={() => onSelect('previa')}
            className="w-full text-left p-4 rounded-xl border border-border/60 bg-muted/40 hover:border-primary/50 hover:bg-primary/5 transition-all space-y-1"
          >
            <div className="flex items-center gap-2 font-medium text-sm">
              <PhoneForwarded className="h-4 w-4 text-primary" />
              Aprovação uma a uma
            </div>
            <p className="text-xs text-muted-foreground">
              Mostra a próxima ligação e você decide: <strong>Ligar agora</strong> ou <strong>Pular</strong>.
            </p>
          </button>

          <button
            onClick={() => onSelect('sequencial')}
            className="w-full text-left p-4 rounded-xl border border-border/60 bg-muted/40 hover:border-primary/50 hover:bg-primary/5 transition-all space-y-1"
          >
            <div className="flex items-center gap-2 font-medium text-sm">
              <ListOrdered className="h-4 w-4 text-primary" />
              Discagem sequencial
            </div>
            <p className="text-xs text-muted-foreground">
              Acabou uma, liga para outra: ao <strong>Finalizar</strong> ou <strong>Pular</strong>, a próxima ligação sai automaticamente.
            </p>
          </button>

          <label className="flex items-center justify-between gap-2 rounded-lg border border-border/60 p-3 text-sm">
            <span>Parar o discador ao receber uma ligação</span>
            <Switch checked={pararAoReceber} onCheckedChange={(v) => { setPararAoReceber(v); localStorage.setItem(CHAVE_PARAR_AO_RECEBER, v ? "1" : "0"); }} />
          </label>

          <p className="text-[11px] text-muted-foreground text-center">
            Nos dois modos, a próxima ligação só acontece depois de Finalizar ou Pular o atendimento atual.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
