import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProdutoBusca } from "@/components/envio-massa/ProdutoBusca";
import { TIPOS_CAMPO, type CampoAgente } from "@/lib/voz/camposAgente";

const novoId = () => (globalThis.crypto?.randomUUID?.() ?? `c${Date.now()}${Math.random().toString(36).slice(2)}`);

/** Campos do agente: fixos (definidos aqui) ou que o usuário preenche obrigatoriamente no disparo. */
export function CamposAgenteEditor({ campos, onChange }: { campos: CampoAgente[]; onChange: (c: CampoAgente[]) => void }) {
  const mudar = (i: number, p: Partial<CampoAgente>) => onChange(campos.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <div className="space-y-2 rounded-md border p-3 md:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <Label>Campos da ligação</Label>
          <p className="text-xs text-muted-foreground">
            <strong>Fixo</strong>: você define o valor agora. <strong>Usuário preenche</strong>: obrigatório no disparo em massa antes de ligar.
          </p>
        </div>
        <Button type="button" size="sm" variant="outline"
          onClick={() => onChange([...campos, { id: novoId(), rotulo: "", tipo: "texto", fixo: false }])}>
          <Plus className="mr-1 h-4 w-4" /> Campo
        </Button>
      </div>
      {campos.length === 0 && <p className="text-xs text-muted-foreground">Ex.: "O que deseja ofertar" (Produto do sistema, usuário preenche).</p>}
      {campos.map((c, i) => (
        <div key={c.id} className="grid gap-2 rounded-md bg-muted/30 p-2 sm:grid-cols-[minmax(0,1fr)_10rem_10rem_auto] sm:items-center">
          <Input value={c.rotulo} placeholder="Pergunta / rótulo do campo" autoFocus={!c.rotulo} onChange={(e) => mudar(i, { rotulo: e.target.value })} />
          <Select value={c.tipo} onValueChange={(v: any) => mudar(i, { tipo: v, valor: null })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIPOS_CAMPO.map((t) => <SelectItem key={t.id} value={t.id}>{t.rotulo}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={c.fixo ? "fixo" : "usuario"} onValueChange={(v) => mudar(i, { fixo: v === "fixo" })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="usuario">Usuário preenche</SelectItem>
              <SelectItem value="fixo">Fixo</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" size="icon" variant="ghost" aria-label="Remover campo" onClick={() => onChange(campos.filter((_, j) => j !== i))}>
            <Trash2 className="h-4 w-4" />
          </Button>
          {c.tipo === "opcoes" && (
            <Input className="sm:col-span-4" placeholder="Opções separadas por vírgula (ex.: Sim, Não)"
              value={(c.opcoes ?? []).join(", ")}
              onChange={(e) => mudar(i, { opcoes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          )}
          {c.fixo && (
            <div className="sm:col-span-4 space-y-1">
              <span className="text-xs text-muted-foreground">Valor fixo</span>
              {c.tipo === "produto" ? (
                <ProdutoBusca valor={typeof c.valor === "object" ? c.valor : null} onChange={(p) => mudar(i, { valor: p })} />
              ) : c.tipo === "opcoes" ? (
                <div className="flex flex-wrap gap-2">
                  {(c.opcoes ?? []).map((o) => (
                    <Button key={o} type="button" size="sm" variant={c.valor === o ? "default" : "outline"} onClick={() => mudar(i, { valor: o })}>{o}</Button>
                  ))}
                </div>
              ) : (
                <Input type={c.tipo === "numero" ? "number" : "text"} value={typeof c.valor === "string" ? c.valor : ""}
                  onChange={(e) => mudar(i, { valor: e.target.value })} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
