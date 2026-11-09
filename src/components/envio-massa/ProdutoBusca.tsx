import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

type Produto = { id: string; nome: string };

/** Busca de produto do catálogo da empresa. */
export function ProdutoBusca({ valor, onChange }: { valor: Produto | null; onChange: (p: Produto | null) => void }) {
  const [termo, setTermo] = useState("");
  const [lista, setLista] = useState<{ id: string; nome: string; codigo?: string }[]>([]);

  useEffect(() => {
    if (valor || termo.trim().length < 2) { setLista([]); return; }
    const t = setTimeout(async () => {
      const est = await getEstabelecimentoId();
      const q = termo.trim().replace(/[%,()]/g, "");
      const { data } = await (supabase as any).from("produtos").select("id, nome, codigo")
        .eq("estabelecimento_id", est).or(`nome.ilike.%${q}%,codigo.ilike.%${q}%`).limit(8);
      setLista(data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [termo, valor]);

  if (valor) return (
    <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-xs min-w-0">
      <span className="truncate flex-1">{valor.nome}</span>
      <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={() => onChange(null)}><X className="h-3 w-3" /></Button>
    </div>
  );
  return (
    <div className="relative">
      <Input value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar produto por nome ou código" className="h-9 text-xs" />
      {lista.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
          {lista.map((p) => (
            <button key={p.id} type="button" className="block w-full truncate px-3 py-2 text-left text-xs hover:bg-muted"
              onClick={() => { onChange({ id: p.id, nome: p.nome }); setTermo(""); }}>
              {p.codigo ? `${p.codigo} — ` : ""}{p.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
