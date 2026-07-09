import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Search, Loader2 } from "lucide-react";
import { extractFillableTokens } from "@/lib/editores/mergeEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  html: string;
  values: Record<string, string>;
  onApply: (values: Record<string, string>) => void;
}

// Mapa: aliases de rótulo -> coluna na tabela `empresas`
const EMPRESA_FIELD_MAP: Record<string, string> = {
  "empresa": "razao_social",
  "razao social": "razao_social",
  "razão social": "razao_social",
  "nome": "razao_social",
  "nome fantasia": "nome_fantasia",
  "fantasia": "nome_fantasia",
  "cnpj": "cnpj",
  "cpf": "cnpj",
  "cpf/cnpj": "cnpj",
  "endereco": "endereco",
  "endereço": "endereco",
  "logradouro": "endereco",
  "numero": "numero",
  "número": "numero",
  "complemento": "complemento",
  "bairro": "bairro",
  "cidade": "cidade",
  "municipio": "cidade",
  "município": "cidade",
  "estado": "estado",
  "uf": "estado",
  "cep": "cep",
  "telefone": "telefone",
  "fone": "telefone",
  "celular": "telefone",
  "whatsapp": "telefone",
  "email": "email",
  "e-mail": "email",
  "inscricao estadual": "inscricao_estadual",
  "inscrição estadual": "inscricao_estadual",
  "ie": "inscricao_estadual",
};

export function QuickFillDialog({ open, onOpenChange, html, values, onApply }: Props) {
  const tokens = useMemo(() => extractFillableTokens(html), [html]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open) return;
    const d: Record<string, string> = {};
    tokens.forEach(t => { d[t.raw] = values[t.raw] ?? values[t.label] ?? ""; });
    setDraft(d);
  }, [open, tokens, values]);

  const setV = (k: string, v: string) => setDraft(d => ({ ...d, [k]: v }));

  const runSearch = async () => {
    setSearching(true);
    try {
      const q = query.trim();
      let req = supabase.from("empresas").select("*").limit(20);
      if (q) {
        req = req.or(
          `razao_social.ilike.%${q}%,nome_fantasia.ilike.%${q}%,cnpj.ilike.%${q}%`
        );
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

  const applyEmpresa = (emp: any) => {
    const next = { ...draft };
    let filled = 0;
    tokens.forEach(t => {
      const key = t.label.trim().toLowerCase();
      const col = EMPRESA_FIELD_MAP[key];
      if (col && emp[col] != null && emp[col] !== "") {
        next[t.raw] = String(emp[col]);
        filled++;
      }
    });
    setDraft(next);
    setSearchOpen(false);
    setResults([]);
    setQuery("");
    toast.success(`${filled} campo(s) preenchido(s) com dados da empresa.`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preencher campos do formulário</DialogTitle>
            <DialogDescription>
              {tokens.length > 0
                ? `Preencha os ${tokens.length} campo(s). Os valores serão aplicados ao documento.`
                : "Nenhum campo de formulário no documento."}
            </DialogDescription>
          </DialogHeader>

          {tokens.length > 0 && (
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSearchOpen(true)}
              >
                <Building2 className="h-4 w-4 mr-2" />
                Buscar empresa
              </Button>
            </div>
          )}

          <div className="space-y-3 py-2">
            {tokens.map(tok => {
              const v = draft[tok.raw] ?? "";
              return (
                <div key={tok.raw} className="space-y-1">
                  <label className="text-xs font-medium">{tok.label}</label>
                  {tok.tipo === "textarea" ? (
                    <Textarea value={v} onChange={e => setV(tok.raw, e.target.value)} rows={3} />
                  ) : tok.tipo === "data" ? (
                    <Input type="date" value={v} onChange={e => setV(tok.raw, e.target.value)} />
                  ) : tok.tipo === "numero" ? (
                    <Input type="number" value={v} onChange={e => setV(tok.raw, e.target.value)} />
                  ) : tok.tipo === "check" ? (
                    <div className="flex items-center gap-2">
                      <Checkbox checked={v === "true"} onCheckedChange={ck => setV(tok.raw, ck ? "true" : "")} />
                      <span className="text-xs text-muted-foreground">{v === "true" ? "Marcado" : "Desmarcado"}</span>
                    </div>
                  ) : tok.tipo === "lista" ? (
                    <Select value={v} onValueChange={(nv) => setV(tok.raw, nv)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {(tok.opcoes || []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : tok.tipo === "radio" ? (
                    <div className="flex flex-wrap gap-3">
                      {(tok.opcoes || []).map(o => (
                        <label key={o} className="flex items-center gap-1 text-sm">
                          <input type="radio" name={tok.raw} checked={v === o} onChange={() => setV(tok.raw, o)} />
                          {o}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <Input value={v} onChange={e => setV(tok.raw, e.target.value)} />
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              disabled={tokens.length === 0}
              onClick={() => { onApply(draft); onOpenChange(false); }}
            >
              Aplicar no documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Buscar empresa</DialogTitle>
            <DialogDescription>
              Pesquise por razão social, nome fantasia ou CNPJ. Ao selecionar,
              os campos compatíveis do formulário serão preenchidos automaticamente.
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

          <div className="max-h-[50vh] overflow-y-auto divide-y">
            {results.length === 0 && !searching && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum resultado. Digite algo e pressione Enter.
              </p>
            )}
            {results.map(emp => (
              <button
                key={emp.id}
                type="button"
                className="w-full text-left py-2 px-2 hover:bg-muted rounded"
                onClick={() => applyEmpresa(emp)}
              >
                <div className="font-medium text-sm">
                  {emp.nome_fantasia || emp.razao_social || "(sem nome)"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {emp.razao_social} {emp.cnpj ? `• ${emp.cnpj}` : ""}
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
