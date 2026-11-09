import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TIPOS_CAMPO, type CampoAgente } from "@/lib/voz/camposAgente";

/** Define os campos que o usuário preenche ao usar este agente (ex.: produto a ofertar). */
export function CamposAgenteEditor({ campos, onChange }: { campos: CampoAgente[]; onChange: (c: CampoAgente[]) => void }) {
  const mudar = (i: number, p: Partial<CampoAgente>) => onChange(campos.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <div className="space-y-2 rounded-md border p-3 md:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <Label>Campos para preencher ao usar o agente</Label>
          <p className="text-xs text-muted-foreground">Aparecem no disparo de Ligação com IA; as respostas viram instruções para o agente.</p>
        </div>
        <Button type="button" size="sm" variant="outline"
          onClick={() => onChange([...campos, { id: crypto.randomUUID(), rotulo: "", tipo: "texto", obrigatorio: false }])}>
          <Plus className="mr-1 h-4 w-4" /> Campo
        </Button>
      </div>
      {campos.length === 0 && <p className="text-xs text-muted-foreground">Ex.: "O que deseja ofertar" (Produto do sistema) ou "Prazo de entrega" (Texto livre).</p>}
      {campos.map((c, i) => (
        <div key={c.id} className="grid gap-2 rounded-md bg-muted/30 p-2 sm:grid-cols-[minmax(0,1fr)_11rem_auto_auto] sm:items-center">
          <Input value={c.rotulo} placeholder="Pergunta / rótulo do campo" onChange={(e) => mudar(i, { rotulo: e.target.value })} />
          <Select value={c.tipo} onValueChange={(v: any) => mudar(i, { tipo: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS_CAMPO.map((t) => <SelectItem key={t.id} value={t.id}>{t.rotulo}</SelectItem>)}</SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-xs"><Switch checked={c.obrigatorio} onCheckedChange={(v) => mudar(i, { obrigatorio: v })} />Obrigatório</label>
          <Button type="button" size="icon" variant="ghost" aria-label="Remover campo" onClick={() => onChange(campos.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
          {c.tipo === "opcoes" && (
            <Input className="sm:col-span-4" placeholder="Opções separadas por vírgula (ex.: Sim, Não)"
              value={(c.opcoes ?? []).join(", ")}
              onChange={(e) => mudar(i, { opcoes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          )}
        </div>
      ))}
    </div>
  );
}
