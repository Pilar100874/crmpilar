import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { useContextoInterno } from "@/lib/estoque/contexto";

import {TituloFiscal} from '@/components/fiscal/TituloFiscal';
const sb = supabase as any;
export default function AuditoriaSystax() {
  const ctx = useContextoInterno();
  const [lista, setLista] = useState<any[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  useEffect(() => {
    if (!ctx.estabelecimentoId) return;
    sb.from("fiscal_consultas_systax").select("*").eq("estabelecimento_id", ctx.estabelecimentoId).order("created_at", { ascending: false }).limit(200).then(({ data }: any) => setLista(data ?? []));
  }, [ctx.estabelecimentoId]);
  return (
    <div className="space-y-4 p-3 sm:p-6">
      <div className="flex items-center gap-2"><TituloFiscal icone={ShieldCheck} titulo="Auditoria Fiscal" descricao="Histórico de todas as consultas tributárias feitas à Systax"/></div>
      <p className="text-sm text-muted-foreground">Cada consulta tributária enviada à Systax fica registrada com o que foi enviado e o que voltou. Os resultados não podem ser alterados sem registro.</p>
      {lista.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma consulta registrada ainda.</p> : lista.map((c) => (
        <Card key={c.id}><CardContent className="space-y-2 p-4">
          <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setAberto(aberto === c.id ? null : c.id)}>
            <span className="truncate font-medium">{new Date(c.created_at).toLocaleString("pt-BR")} · {c.origem}</span>
            <Badge variant={c.sucesso ? "default" : "outline"}>{c.sucesso ? "Sucesso" : "Erro"}</Badge>
          </button>
          {c.erro && <p className="text-sm text-destructive">{c.erro}</p>}
          {aberto === c.id && <div className="grid gap-2 md:grid-cols-2">
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">{JSON.stringify(c.requisicao, null, 2)}</pre>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-xs">{JSON.stringify(c.resposta, null, 2)}</pre>
          </div>}
        </CardContent></Card>))}
    </div>
  );
}
