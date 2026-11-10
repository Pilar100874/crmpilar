import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bot, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { meuRamal } from "@/components/telefonia/IaAjudaAtendente";

const db = supabase as any;
interface Chamada { id: string; numero: string | null; objetivo: string | null; resumo: string | null; transferido_para: string | null; modo: string }

/** Ao receber uma ligação transferida pela IA, mostra o resumo da conversa para o usuário continuar. */
export default function ResumoTransferenciaIa() {
  const [ramal, setRamal] = useState<string | null>(null);
  const [atual, setAtual] = useState<Chamada | null>(null);

  useEffect(() => { void meuRamal().then(setRamal); }, []);

  useEffect(() => {
    if (!ramal) return;
    const canal = supabase.channel(`resumo-ia-${ramal}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "voz_chamadas", filter: `transferido_para=eq.${ramal}` },
        (p: any) => { const c = p.new as Chamada; if (c?.transferido_para === ramal) setAtual(c); })
      .subscribe();
    return () => { void supabase.removeChannel(canal); };
  }, [ramal]);

  useEffect(() => {
    // O resumo chega logo depois da transferência; recarrega se ainda não veio.
    if (!atual || atual.resumo) return;
    const t = setTimeout(async () => {
      const { data } = await db.from("voz_chamadas").select("id, numero, objetivo, resumo, transferido_para, modo").eq("id", atual.id).maybeSingle();
      if (data) setAtual(data);
    }, 4000);
    return () => clearTimeout(t);
  }, [atual]);

  if (!atual) return null;
  return createPortal(
    <div className="fixed inset-0 z-[2147483000] flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm" onClick={() => setAtual(null)}>
    <div className="flex max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2 border-b border-border/50 px-3 py-2">
        <Bot className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Ligação transferida pela IA</p>
          <p className="truncate text-[11px] text-muted-foreground">{atual.numero ?? "Número não identificado"}</p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAtual(null)} aria-label="Fechar"><X className="h-4 w-4" /></Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
        {atual.objetivo && <p className="text-[11px] text-muted-foreground line-clamp-3">Objetivo: {atual.objetivo.replace(/^VOCÊ ESTÁ FAZENDO UMA LIGAÇÃO DE VENDAS\. Objetivo informado pelo usuário: /, "").split("\n")[0]}</p>}
        <p className="whitespace-pre-wrap break-words text-sm text-foreground">{atual.resumo ?? "Gerando o resumo da conversa…"}</p>
      </div>
      <div className="border-t border-border/50 p-3">
        <Button className="w-full" onClick={() => setAtual(null)}>Entendi</Button>
      </div>
    </div>
    </div>,
    document.body
  );
}
