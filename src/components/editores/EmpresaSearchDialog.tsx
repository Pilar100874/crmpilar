import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInsert: (html: string) => void;
}

function esc(v: any): string {
  if (v == null) return "";
  return String(v).replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
}

function buildEmpresaHtml(emp: any): string {
  const nome = emp.nome_fantasia || emp.nome || "";
  const enderecoLinhas = [
    [emp.endereco, emp.bairro].filter(Boolean).join(", "),
    [emp.cidade, emp.estado].filter(Boolean).join(" - "),
    emp.cep ? `CEP: ${emp.cep}` : "",
  ].filter(Boolean);

  const linhas: string[] = [];
  linhas.push(`<p><strong>${esc(nome)}</strong></p>`);
  if (emp.cnpj) linhas.push(`<p>CNPJ: ${esc(emp.cnpj)}</p>`);
  enderecoLinhas.forEach(l => linhas.push(`<p>${esc(l)}</p>`));
  if (emp.telefone) linhas.push(`<p>Telefone: ${esc(emp.telefone)}</p>`);
  if (emp.email) linhas.push(`<p>E-mail: ${esc(emp.email)}</p>`);
  return linhas.join("");
}

export function EmpresaSearchDialog({ open, onOpenChange, onInsert }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const runSearch = async () => {
    setSearching(true);
    try {
      const q = query.trim().replace(/[,()]/g, " ");
      let req = supabase.from("empresas").select("*").limit(30);
      if (q) {
        req = req.or(`nome.ilike.%${q}%,nome_fantasia.ilike.%${q}%,cnpj.ilike.%${q}%`);
      }
      const { data, error } = await req;
      if (error) throw error;
      setResults(data || []);
    } catch (e: any) {
      toast.error("Erro ao buscar empresas: " + (e?.message ?? e));
    } finally {
      setSearching(false);
    }
  };

  const selectEmpresa = (emp: any) => {
    onInsert(buildEmpresaHtml(emp));
    onOpenChange(false);
    setResults([]);
    setQuery("");
    toast.success("Dados da empresa inseridos no documento.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buscar empresa</DialogTitle>
          <DialogDescription>
            Pesquise por nome, nome fantasia ou CNPJ. Ao selecionar, os dados
            serão inseridos no documento na posição do cursor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            autoFocus
            placeholder="Nome ou CNPJ..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") runSearch(); }}
          />
          <Button type="button" onClick={runSearch} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        <div className="max-h-[50vh] overflow-y-auto divide-y border rounded">
          {results.length === 0 && !searching && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhum resultado. Digite algo e pressione Enter.
            </p>
          )}
          {results.map(emp => (
            <button
              key={emp.id}
              type="button"
              className="w-full text-left py-2 px-3 hover:bg-muted"
              onClick={() => selectEmpresa(emp)}
            >
              <div className="font-medium text-sm">
                {emp.nome_fantasia || emp.nome || "(sem nome)"}
              </div>
              <div className="text-xs text-muted-foreground">
                {emp.nome} {emp.cnpj ? `• ${emp.cnpj}` : ""}
              </div>
              <div className="text-xs text-muted-foreground">
                {[emp.cidade, emp.estado].filter(Boolean).join(" - ")}
              </div>
            </button>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
