import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Linha {
  id?: string;
  empresa_id: string;
  nome_comercial: string;
  sku_fornecedor: string;
  unidade_compra: string;
  fator_conversao: number;
  principal: boolean;
}

const UNIDADES = ["un", "cx", "pct", "fardo", "kg", "g", "t", "l", "ml", "m", "m2", "m3", "rolo", "saco"];

export function ProdutoFornecedoresTab({ produtoId, estabelecimentoId, unidadeProduto }: { produtoId?: string; estabelecimentoId?: string | null; unidadeProduto?: string | null }) {
  const [empresas, setEmpresas] = useState<{ id: string; nome: string }[]>([]);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [excluir, setExcluir] = useState<number | null>(null);

  useEffect(() => {
    if (!estabelecimentoId) return;
    (supabase.from("empresas").select("id, nome_fantasia, nome") as any)
      .eq("estabelecimento_id", estabelecimentoId).eq("eh_fornecedor", true).order("nome_fantasia")
      .then(({ data }: any) => setEmpresas((data || []).map((e: any) => ({ id: e.id, nome: e.nome_fantasia || e.nome || "—" }))));
  }, [estabelecimentoId]);

  useEffect(() => {
    if (!produtoId) return;
    supabase.from("produto_fornecedores").select("*").eq("produto_id", produtoId).order("created_at")
      .then(({ data }) => setLinhas((data || []).map((d: any) => ({ ...d, nome_comercial: d.nome_comercial || "", sku_fornecedor: d.sku_fornecedor || "", unidade_compra: d.unidade_compra || "", fator_conversao: Number(d.fator_conversao) || 1 }))));
  }, [produtoId]);

  if (!produtoId) {
    return <p className="py-6 text-sm text-muted-foreground">Salve o produto primeiro para vincular fornecedores.</p>;
  }

  const set = (i: number, campo: keyof Linha, v: any) =>
    setLinhas(ls => ls.map((l, j) => j === i ? { ...l, [campo]: v } : (campo === "principal" && v ? { ...l, principal: false } : l)));

  const salvar = async () => {
    if (linhas.some(l => !l.empresa_id)) return toast.error("Selecione a empresa fornecedora em todas as linhas");
    const ids = linhas.map(l => l.empresa_id);
    if (new Set(ids).size !== ids.length) return toast.error("O mesmo fornecedor está repetido");
    if (linhas.some(l => !(l.fator_conversao > 0))) return toast.error("O fator de conversão deve ser maior que zero");
    setSalvando(true);
    try {
      const manter = linhas.filter(l => l.id).map(l => l.id!);
      let del = supabase.from("produto_fornecedores").delete().eq("produto_id", produtoId);
      if (manter.length) del = del.not("id", "in", `(${manter.join(",")})`);
      const { error: e1 } = await del;
      if (e1) throw e1;
      const rows = linhas.map(l => ({
        ...(l.id ? { id: l.id } : {}),
        produto_id: produtoId, estabelecimento_id: estabelecimentoId!, empresa_id: l.empresa_id,
        nome_comercial: l.nome_comercial.trim() || null, sku_fornecedor: l.sku_fornecedor.trim() || null,
        unidade_compra: l.unidade_compra || null, fator_conversao: l.fator_conversao, principal: l.principal,
        updated_at: new Date().toISOString(),
      }));
      if (rows.length) {
        const { data, error } = await supabase.from("produto_fornecedores").upsert(rows as any).select("*");
        if (error) throw error;
        setLinhas((data || []).map((d: any) => ({ ...d, nome_comercial: d.nome_comercial || "", sku_fornecedor: d.sku_fornecedor || "", unidade_compra: d.unidade_compra || "", fator_conversao: Number(d.fator_conversao) || 1 })));
      }
      toast.success("Fornecedores salvos");
    } catch (e: any) {
      toast.error("Erro ao salvar fornecedores: " + (e?.message || ""));
    } finally { setSalvando(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Empresas marcadas como fornecedor que vendem este material.</p>
        <Button type="button" size="sm" variant="outline" onClick={() => setLinhas(ls => [...ls, { empresa_id: "", nome_comercial: "", sku_fornecedor: "", unidade_compra: unidadeProduto || "", fator_conversao: 1, principal: ls.length === 0 }])}>
          <Plus className="mr-1 h-4 w-4" />Adicionar fornecedor
        </Button>
      </div>
      {empresas.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma empresa marcada como Fornecedor. Marque em Listas → Empresas.</p>}
      {linhas.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Nenhum fornecedor vinculado.</p>}
      {linhas.map((l, i) => (
        <div key={l.id || i} className="grid min-w-0 grid-cols-1 gap-2 rounded-lg border border-border/60 bg-card p-3 sm:grid-cols-6">
          <div className="min-w-0 sm:col-span-2">
            <Label className="text-xs">Fornecedor</Label>
            <Select value={l.empresa_id} onValueChange={v => set(i, "empresa_id", v)}>
              <SelectTrigger className="h-9 whitespace-normal"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{empresas.map(e => <SelectItem key={e.id} value={e.id}><span className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />{e.nome}</span></SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-0 sm:col-span-2"><Label className="text-xs">Nome comercial no fornecedor</Label><Input className="h-9" value={l.nome_comercial} onChange={e => set(i, "nome_comercial", e.target.value)} /></div>
          <div className="min-w-0 sm:col-span-2"><Label className="text-xs">SKU do fornecedor</Label><Input className="h-9" value={l.sku_fornecedor} onChange={e => set(i, "sku_fornecedor", e.target.value)} /></div>
          <div className="min-w-0 sm:col-span-2">
            <Label className="text-xs">Unidade de compra</Label>
            <Select value={l.unidade_compra} onValueChange={v => set(i, "unidade_compra", v)}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>{UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="min-w-0 sm:col-span-2">
            <Label className="text-xs">1 {l.unidade_compra || "un. compra"} = quantos {unidadeProduto || "un"}</Label>
            <Input className="h-9" type="number" min={0} step="any" value={l.fator_conversao} onChange={e => set(i, "fator_conversao", Number(e.target.value))} />
          </div>
          <div className="flex items-end justify-between gap-2 sm:col-span-2">
            <label className="flex items-center gap-2 pb-2 text-sm"><Checkbox checked={l.principal} onCheckedChange={v => set(i, "principal", v === true)} />Principal</label>
            <Button type="button" size="icon" variant="ghost" aria-label="Remover fornecedor" onClick={() => setExcluir(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </div>
        </div>
      ))}
      <div className="flex justify-end"><Button type="button" size="sm" onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar fornecedores"}</Button></div>
      <DeleteConfirmDialog
        open={excluir !== null}
        onOpenChange={o => !o && setExcluir(null)}
        onConfirm={() => { setLinhas(ls => ls.filter((_, j) => j !== excluir)); setExcluir(null); }}
        title="Remover fornecedor?"
        description="O vínculo será removido ao clicar em Salvar fornecedores."
      />
    </div>
  );
}
