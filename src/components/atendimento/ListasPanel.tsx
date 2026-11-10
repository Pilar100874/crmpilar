import { useEffect, useState } from "react";
import { Search, UserPlus, Building2, User, Phone, Mail, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Empresas from "@/pages/Empresas";
import Contatos from "@/pages/Contatos";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { PainelAtendimentoHeader } from "./PainelAtendimentoHeader";

interface ListasPanelProps {
  onClose: () => void;
  onSelect?: (customerId: string) => void;
  onSaved?: () => void;
  onContatoSalvo?: (id: string) => void;
  title?: string;
  description?: string;
  defaultTab?: "contatos" | "empresas";
}
interface SearchResult { id: string; tipo: "contato" | "empresa"; nome: string; telefone?: string | null; email?: string | null }

export function ListasPanel({ onClose, onSelect, onSaved, onContatoSalvo, title = "Puxar ou criar cadastro" }: ListasPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [form, setForm] = useState<{ tipo: "contato" | "empresa"; id?: string } | null>(null);

  useEffect(() => {
    let active = true;
    if (searchTerm.trim().length < 2) { setResults([]); setLoading(false); setError(false); return; }
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const estabelecimentoId = await getEstabelecimentoId();
        if (!estabelecimentoId) throw new Error("Estabelecimento indisponível");
        const term = searchTerm.trim().replace(/[%,()]/g, " ");
        const [contacts, companies] = await Promise.all([
          supabase.from("customers").select("id,nome,telefone,tel,email").eq("estabelecimento_id", estabelecimentoId).or(`nome.ilike.%${term}%,telefone.ilike.%${term}%,tel.ilike.%${term}%,email.ilike.%${term}%`).limit(15),
          supabase.from("empresas").select("id,nome,nome_fantasia,telefone,email").eq("estabelecimento_id", estabelecimentoId).or(`nome.ilike.%${term}%,nome_fantasia.ilike.%${term}%,cnpj.ilike.%${term}%`).limit(10),
        ]);
        if (contacts.error || companies.error) throw contacts.error || companies.error;
        if (active) {
          setError(false);
          setResults([
            ...(contacts.data ?? []).map(c => ({ id: c.id, tipo: "contato" as const, nome: c.nome, telefone: c.telefone || c.tel, email: c.email })),
            ...(companies.data ?? []).map(c => ({ id: c.id, tipo: "empresa" as const, nome: c.nome_fantasia || c.nome || "Sem nome", telefone: c.telefone, email: c.email })),
          ]);
        }
      } catch { if (active) { setResults([]); setError(true); } }
      finally { if (active) setLoading(false); }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [searchTerm]);

  const saved = () => { onSaved?.(); setForm(null); };
  const select = async (result: SearchResult) => {
    if (result.tipo === "contato") { onClose(); onSelect?.(result.id); return; }
    const { data, error } = await supabase.from("customer_empresas").select("customer_id").eq("empresa_id", result.id).order("is_primary", { ascending: false }).limit(1).maybeSingle();
    if (error) { toast.error("Não foi possível abrir os contatos da empresa"); return; }
    if (data?.customer_id) { onClose(); onSelect?.(data.customer_id); }
    else setForm({ tipo: "empresa", id: result.id });
  };

  if (form) return <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background" data-cadastro-central>
    {form.tipo === "empresa" ? <Empresas hideAdminButtons criarInicial={!form.id} empresaIdInicial={form.id} onFecharEmbutido={saved} /> : <Contatos hideAdminButtons criarInicial={!form.id} contatoIdInicial={form.id} onFecharEmbutido={saved} onContatoSalvo={onContatoSalvo} />}
  </div>;

  return <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background" data-cadastro-central>
    <div className="flex min-h-0 flex-1 flex-col">
        <PainelAtendimentoHeader title={title} icon={UserPlus} onClose={onClose} closeLabel="Fechar cadastros" />
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6">
          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={() => setForm({ tipo: "contato" })}><UserPlus className="h-4 w-4" />Novo contato</Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={() => setForm({ tipo: "empresa" })}><Building2 className="h-4 w-4" />Nova empresa</Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus aria-label="Pesquisar cadastro" placeholder="Nome, telefone, e-mail ou CNPJ" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : results.length ? <div className="divide-y divide-border">
              {results.map(result => <div key={`${result.tipo}-${result.id}`} className="flex items-center gap-2 py-2">
                <Button variant="ghost" className="h-auto min-w-0 flex-1 justify-start gap-3 px-2 py-2 text-left" onClick={() => void select(result)}>
                  {result.tipo === "contato" ? <User className="h-4 w-4 shrink-0 text-primary" /> : <Building2 className="h-4 w-4 shrink-0 text-primary" />}
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{result.nome}</span><span className="block text-xs font-normal text-muted-foreground">{result.tipo === "contato" ? "Contato" : "Empresa"}</span><span className="mt-1 flex flex-wrap gap-x-3 text-xs font-normal text-muted-foreground">{result.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{result.telefone}</span>}{result.email && <span className="flex min-w-0 items-center gap-1"><Mail className="h-3 w-3 shrink-0" /><span className="truncate">{result.email}</span></span>}</span></span>
                </Button>
                <Button variant="ghost" size="icon" aria-label={`Editar ${result.nome}`} title={`Editar ${result.nome}`} onClick={() => setForm({ tipo: result.tipo, id: result.id })}><Pencil className="h-4 w-4" /></Button>
              </div>)}
            </div> : <p className="py-10 text-center text-sm text-muted-foreground">{error ? "Não foi possível pesquisar. Tente novamente." : searchTerm.trim().length >= 2 ? "Nenhum cadastro encontrado." : "Buscar cadastro existente"}</p>}
          </div>
        </div>
    </div>
  </div>;
}
