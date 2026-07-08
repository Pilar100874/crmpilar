import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormInput } from "lucide-react";
import { serializeFillable, type FillableTipo } from "@/lib/editores/mergeEngine";

interface Props {
  onInsert: (token: string) => void;
  triggerClassName?: string;
  triggerLabel?: string;
  asIcon?: boolean;
}


const TIPOS: { value: FillableTipo; label: string; hasOpcoes?: boolean }[] = [
  { value: "texto", label: "Texto curto" },
  { value: "textarea", label: "Texto longo (parágrafo)" },
  { value: "data", label: "Data" },
  { value: "numero", label: "Número" },
  { value: "check", label: "Caixa de seleção (checkbox)" },
  { value: "lista", label: "Lista suspensa (select)", hasOpcoes: true },
  { value: "radio", label: "Opções (radio)", hasOpcoes: true },
];

export function FormFieldPicker({ onInsert, triggerClassName, triggerLabel = "Inserir campo de formulário", asIcon }: Props) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<FillableTipo>("texto");
  const [label, setLabel] = useState("");
  const [opcoes, setOpcoes] = useState("");

  const cfg = TIPOS.find(t => t.value === tipo)!;

  const inserir = () => {
    if (!label.trim()) return;
    const opcoesArr = cfg.hasOpcoes ? opcoes.split(",").map(s => s.trim()).filter(Boolean) : undefined;
    const token = serializeFillable({ tipo, label: label.trim(), opcoes: opcoesArr });
    const payload = JSON.stringify({ tipo, token, label: label.trim(), opcoes: (opcoesArr ?? []).join(",") });
    onInsert(`__FIELD__:${payload}`);
    setOpen(false);
    setLabel(""); setOpcoes(""); setTipo("texto");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {asIcon ? (
          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title={triggerLabel}>
            <FormInput className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className={triggerClassName}>
            <FormInput className="h-3.5 w-3.5 mr-1" /> {triggerLabel}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inserir campo de formulário</DialogTitle>
          <DialogDescription>
            Cria uma lacuna que o usuário preenche no momento da geração. Se o modo "formulário travado" estiver ativo, apenas estes campos poderão ser editados.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <Select value={tipo} onValueChange={(v: FillableTipo) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Rótulo</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex.: Nome do responsável" autoFocus />
          </div>
          {cfg.hasOpcoes && (
            <div>
              <label className="text-xs text-muted-foreground">Opções (separadas por vírgula)</label>
              <Input value={opcoes} onChange={e => setOpcoes(e.target.value)} placeholder="SP, RJ, MG" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={inserir}>Inserir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
