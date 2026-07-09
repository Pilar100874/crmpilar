import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { resolveProductPricesBatch } from "@/hooks/useProductPrice";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInsert: (html: string) => void;
}

function esc(v: any): string {
  if (v == null) return "";
  return String(v).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

function money(v: number | null | undefined): string {
  if (v == null) return "-";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface ProdutoRow {
  id: string;
  nome: string;
  codigo?: string | null;
  estoque?: number | null;
  precoMinimo: number | null;
  precoTabela: number | null;
}

function buildTableHtml(items: ProdutoRow[]): string {
  const rows = items.map(p => `
    <tr>
      <td style="border:1px solid #ccc;padding:6px;">${esc(p.nome)}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">${esc(p.codigo ?? "")}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:center;">${p.estoque ?? 0}</td>
      <td style="border:1px solid #ccc;padding:6px;text-align:right;">${money(p.precoTabela)}</td>
    </tr>
  `).join("");

  return `
    <table style="border-collapse:collapse;width:100%;margin:8px 0;">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:6px;background:#f4f4f5;text-align:left;">Produto</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f4f4f5;">Código</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f4f4f5;">Estoque</th>
          <th style="border:1px solid #ccc;padding:6px;background:#f4f4f5;">Preço</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function EstoqueSearchDialog({ open, onOpenChange, onInsert }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const runSearch = async () => {
    setSearching(true);
    try {
      const q = query.trim().replace(/[,()]/g, " ");
      let req = supabase
        .from("produtos")
        .select("id,nome,codigo,estoque,tipo_preco,preco_minimo,preco_tabela,categoria_id")
        .eq("ativo", true)
        .limit(40);
      if (q) {
        req = req.or(`nome.ilike.%${q}%,codigo.ilike.%${q}%`);
      }
      const { data, error } = await req;
      if (error) throw error;
      setResults(data || []);
      setSelected({});
    } catch (e: any) {
      toast.error("Erro ao buscar produtos: " + (e?.message ?? e));
    } finally {
      setSearching(false);
    }
  };

  const insertSelected = async () => {
    const chosen = results.filter(p => selected[p.id]);
    if (chosen.length === 0) {
      toast.error("Selecione ao menos um produto.");
      return;
    }
    const prices = await resolveProductPricesBatch(chosen as any);
    const rows: ProdutoRow[] = chosen.map(p => {
      const pr = prices.get(p.id) || { precoMinimo: null, precoTabela: null };
      return {
        id: p.id,
        nome: p.nome,
        codigo: p.codigo,
        estoque: p.estoque,
        precoMinimo: pr.precoMinimo,
        precoTabela: pr.precoTabela,
      };
    });
    onInsert(buildTableHtml(rows));
    onOpenChange(false);
    setResults([]);
    setSelected({});
    setQuery("");
    toast.success(`${rows.length} produto(s) inserido(s) no documento.`);
  };

  const toggle = (id: string) => setSelected(s => ({ ...s, [id]: !s[id] }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Consultar estoque / preços</DialogTitle>
          <DialogDescription>
            Pesquise produtos, selecione os desejados e insira como tabela no
            documento (nome, código, estoque e preço).
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Nome ou código do produto..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") runSearch(); }}
          />
          <Button type="button" onClick={runSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto border rounded divide-y">
          {results.length === 0 && !searching && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum resultado. Digite algo e pressione Enter.
            </p>
          )}
          {results.map(p => (
            <label
              key={p.id}
              className="flex items-center gap-3 py-2 px-3 hover:bg-muted cursor-pointer"
            >
              <Checkbox
                checked={!!selected[p.id]}
                onCheckedChange={() => toggle(p.id)}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{p.nome}</div>
                <div className="text-xs text-muted-foreground">
                  {p.codigo ? `Cód. ${p.codigo} • ` : ""}Estoque: {p.estoque ?? 0}
                </div>
              </div>
              <div className="text-xs text-right">
                {p.preco_tabela != null ? money(Number(p.preco_tabela)) : ""}
              </div>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={insertSelected}>Inserir no documento</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
