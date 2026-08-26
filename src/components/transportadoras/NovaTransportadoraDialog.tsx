import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { criarTransportadora, type TranspEmpresa } from "@/lib/transportadoras/dados";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Chamado com a transportadora recém-criada. */
  onCreated: (empresa: TranspEmpresa) => void;
}

export function NovaTransportadoraDialog({ open, onOpenChange, onCreated }: Props) {
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  const salvar = async () => {
    setBusy(true);
    try {
      const empresa = await criarTransportadora(nome);
      toast.success("Transportadora cadastrada");
      setNome("");
      onCreated(empresa);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao cadastrar transportadora");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Nova Transportadora</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Nome da transportadora</Label>
          <Input
            autoFocus
            value={nome}
            onChange={(e) => setNome(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter" && !busy) salvar(); }}
            placeholder="EX: TRANSPORTES SILVA"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
