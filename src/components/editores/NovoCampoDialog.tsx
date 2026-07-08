import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sigma, Plus } from "lucide-react";

interface Props {
  estabelecimentoId: string | null;
  triggerAsIcon?: boolean;
}

/**
 * Dialog reutilizável para criar campos personalizados.
 * Suporta tipo="calculo": expressão referenciando outros campos numéricos com {{chave}}.
 * A fórmula é gravada em `doc_campos.formato`.
 */
export function NovoCampoDialog({ estabelecimentoId, triggerAsIcon }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    chave: "",
    rotulo: "",
    categoria: "Personalizado",
    tipo: "texto",
    descricao: "",
    formula: "",
  });
  const [numericos, setNumericos] = useState<{ chave: string; rotulo: string }[]>([]);

  const carregarNumericos = async () => {
    if (!estabelecimentoId) return;
    const { data } = await supabase
      .from("doc_campos")
      .select("chave, rotulo, tipo")
      .eq("estabelecimento_id", estabelecimentoId)
      .in("tipo", ["numero", "moeda", "calculo"]);
    setNumericos((data ?? []).map(d => ({ chave: d.chave, rotulo: d.rotulo })));
  };

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) void carregarNumericos();
  };

  const inserirTokenFormula = (chave: string) => {
    setForm(f => ({ ...f, formula: `${f.formula}{{${chave}}}` }));
  };

  const criar = async () => {
    if (!estabelecimentoId) return;
    const chave = form.chave.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!chave || !form.rotulo.trim()) { toast.error("Informe chave e rótulo"); return; }
    if (form.tipo === "calculo" && !form.formula.trim()) {
      toast.error("Informe a fórmula do cálculo"); return;
    }
    const { error } = await supabase.from("doc_campos").insert({
      estabelecimento_id: estabelecimentoId,
      chave,
      rotulo: form.rotulo.trim(),
      categoria: form.categoria.trim() || "Personalizado",
      tipo: form.tipo,
      descricao: form.descricao.trim() || null,
      formato: form.tipo === "calculo" ? form.formula.trim() : null,
      personalizado: true,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Campo criado");
    setOpen(false);
    setForm({ chave: "", rotulo: "", categoria: "Personalizado", tipo: "texto", descricao: "", formula: "" });
    // Notifica outras telas para recarregar
    window.dispatchEvent(new CustomEvent("doc-campos:changed"));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {triggerAsIcon ? (
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Novo campo personalizado / cálculo">
            <Sigma className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="w-full h-8">
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo campo personalizado
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo campo personalizado</DialogTitle>
          <DialogDescription>Ficará disponível para todos os modelos deste estabelecimento.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Chave</label>
              <Input value={form.chave} onChange={e => setForm({ ...form, chave: e.target.value })} placeholder="ex: total_com_juros" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Rótulo</label>
              <Input value={form.rotulo} onChange={e => setForm({ ...form, rotulo: e.target.value })} placeholder="ex: Total com juros" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Categoria</label>
              <Input value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Tipo</label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="texto">Texto</SelectItem>
                  <SelectItem value="data">Data</SelectItem>
                  <SelectItem value="moeda">Moeda</SelectItem>
                  <SelectItem value="numero">Número</SelectItem>
                  <SelectItem value="booleano">Booleano</SelectItem>
                  <SelectItem value="calculo">🧮 Cálculo (fórmula)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Instrução de preenchimento (opcional)</label>
            <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Dica exibida ao preencher" />
          </div>

          {form.tipo === "calculo" && (
            <div className="space-y-2 border rounded p-3 bg-muted/20">
              <label className="text-xs font-semibold">Fórmula</label>
              <Textarea
                value={form.formula}
                onChange={e => setForm({ ...form, formula: e.target.value })}
                placeholder="ex: {{valor}} * 1.1 + {{taxa}}"
                className="font-mono text-xs min-h-[80px]"
              />
              <p className="text-[11px] text-muted-foreground">
                Use <code className="bg-background px-1 rounded">{"{{chave}}"}</code> para referenciar campos numéricos.
                Operadores permitidos: <code>+ - * / ( )</code> e funções <code>Math.round / min / max / abs</code>.
              </p>
              {numericos.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {numericos.map(n => (
                    <button
                      key={n.chave}
                      type="button"
                      onClick={() => inserirTokenFormula(n.chave)}
                      className="text-[11px] px-2 py-0.5 rounded border bg-background hover:bg-primary/10 font-mono"
                      title={`Inserir {{${n.chave}}}`}
                    >
                      {n.rotulo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={criar}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
