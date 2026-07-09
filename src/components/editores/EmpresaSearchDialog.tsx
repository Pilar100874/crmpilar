import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, ArrowLeft, Eraser } from "lucide-react";
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

type FieldKey =
  | "nome" | "cnpj" | "endereco" | "cidade_estado" | "cep"
  | "telefone" | "email";

const FIELDS: { key: FieldKey; label: string; get: (e: any) => string }[] = [
  { key: "nome",          label: "Nome",             get: e => e.nome_fantasia || e.nome || "" },
  { key: "cnpj",          label: "CNPJ",             get: e => e.cnpj || "" },
  { key: "endereco",      label: "Endereço / bairro", get: e => [e.endereco, e.bairro].filter(Boolean).join(", ") },
  { key: "cidade_estado", label: "Cidade / estado",  get: e => [e.cidade, e.estado].filter(Boolean).join(" - ") },
  { key: "cep",           label: "CEP",              get: e => e.cep ? `CEP: ${e.cep}` : "" },
  { key: "telefone",      label: "Telefone",         get: e => e.telefone ? `Telefone: ${e.telefone}` : "" },
  { key: "email",         label: "E-mail",           get: e => e.email ? `E-mail: ${e.email}` : "" },
];

function buildHtml(emp: any, selected: Set<FieldKey>): string {
  const linhas: string[] = [];
  for (const f of FIELDS) {
    if (!selected.has(f.key)) continue;
    const val = f.get(emp);
    if (!val) continue;
    linhas.push(
      f.key === "nome"
        ? `<p><strong>${esc(val)}</strong></p>`
        : `<p>${esc(val)}</p>`
    );
  }
  return linhas.join("");
}

export function EmpresaSearchDialog({ open, onOpenChange, onInsert }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<any>(null);
  const [selectedFields, setSelectedFields] = useState<Set<FieldKey>>(
    new Set(FIELDS.map(f => f.key))
  );
  const [contatos, setContatos] = useState<any[]>([]);
  const [selectedContatos, setSelectedContatos] = useState<Set<string>>(new Set());

  // live search com debounce
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(async () => {
      setSearching(true);
      try {
        const q = query.trim().replace(/[,()]/g, " ");
        let req = supabase.from("empresas").select("*").limit(30).order("nome");
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
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open]);

  // carrega contatos vinculados ao selecionar empresa
  useEffect(() => {
    if (!selectedEmp) { setContatos([]); setSelectedContatos(new Set()); return; }
    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id,nome,email,telefone,tel")
        .eq("empresa_id", selectedEmp.id)
        .order("nome");
      setContatos(data || []);
    })();
  }, [selectedEmp]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelectedEmp(null);
      setSelectedFields(new Set(FIELDS.map(f => f.key)));
      setContatos([]);
      setSelectedContatos(new Set());
    }
  }, [open]);

  const toggleField = (k: FieldKey) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  const toggleContato = (id: string) => {
    setSelectedContatos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearAll = () => {
    setSelectedFields(new Set());
    setSelectedContatos(new Set());
  };

  const confirmInsert = () => {
    if (!selectedEmp) return;
    let html = buildHtml(selectedEmp, selectedFields);
    const chosen = contatos.filter(c => selectedContatos.has(c.id));
    if (chosen.length > 0) {
      const esc = (v: any) => String(v ?? "").replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
      html += `<p><strong>Contatos</strong></p>`;
      for (const c of chosen) {
        const linha = [c.nome, c.email, c.telefone || c.tel].filter(Boolean).map(esc).join(" — ");
        html += `<p>${linha}</p>`;
      }
    }
    if (!html) {
      toast.error("Selecione ao menos um campo.");
      return;
    }
    onInsert(html);
    onOpenChange(false);
    toast.success("Dados da empresa inseridos no documento.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {selectedEmp ? "Selecionar campos para inserir" : "Buscar empresa"}
          </DialogTitle>
          <DialogDescription>
            {selectedEmp
              ? "Escolha quais campos serão inseridos no documento."
              : "Digite para pesquisar por nome, nome fantasia ou CNPJ."}
          </DialogDescription>
        </DialogHeader>

        {!selectedEmp && (
          <>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Nome ou CNPJ..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9"
              />
              {searching && (
                <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="max-h-[50vh] overflow-y-auto divide-y border rounded">
              {results.length === 0 && !searching && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhum resultado.
                </p>
              )}
              {results.map(emp => (
                <button
                  key={emp.id}
                  type="button"
                  className="w-full text-left py-2 px-3 hover:bg-muted"
                  onClick={() => setSelectedEmp(emp)}
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
          </>
        )}

        {selectedEmp && (
          <div className="space-y-3">
            <div className="border rounded p-2 bg-muted/30">
              <div className="font-medium text-sm">
                {selectedEmp.nome_fantasia || selectedEmp.nome}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedEmp.cnpj}
              </div>
            </div>
            <div className="space-y-2 max-h-[45vh] overflow-y-auto">
              {FIELDS.map(f => {
                const val = f.get(selectedEmp);
                return (
                  <label
                    key={f.key}
                    className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-muted cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedFields.has(f.key)}
                      onCheckedChange={() => toggleField(f.key)}
                      disabled={!val}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium">{f.label}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {val || "—"}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          {selectedEmp ? (
            <>
              <Button variant="outline" onClick={() => setSelectedEmp(null)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button onClick={confirmInsert}>Inserir no documento</Button>
            </>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
