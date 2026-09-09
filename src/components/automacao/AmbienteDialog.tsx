import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ambiente, salvarAmbiente } from "@/lib/automacao/api";

interface Props {
  ambiente: Partial<Ambiente> | null;
  onChange: (a: Partial<Ambiente> | null) => void;
  onSalvo: () => void;
}

export default function AmbienteDialog({ ambiente, onChange, onSalvo }: Props) {
  const gravar = async () => {
    if (!ambiente?.nome?.trim()) { toast.error("Informe o nome do ambiente."); return; }
    await salvarAmbiente(ambiente);
    onChange(null);
    toast.success("Ambiente salvo.");
    onSalvo();
  };

  return (
    <Dialog open={!!ambiente} onOpenChange={(o) => !o && onChange(null)}>
      <DialogContent>
        <DialogHeader><DialogTitle>{ambiente?.id ? "Editar ambiente" : "Novo ambiente"}</DialogTitle></DialogHeader>
        <div>
          <Label>Nome</Label>
          <Input
            value={ambiente?.nome ?? ""}
            placeholder="Sala, Garagem, Portaria..."
            onChange={(e) => onChange({ ...ambiente, nome: e.target.value })}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onChange(null)}>Cancelar</Button>
          <Button onClick={gravar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
