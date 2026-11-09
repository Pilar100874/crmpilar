import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import {
  PUBLICOS, PublicoId, aplicarProtecao, carregarDadosPublico, classificarPublico,
} from "@/lib/voz/publicoInteligente";
import { ProdutoBusca } from "./ProdutoBusca";
import { ContactForBulkSend } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  contacts: ContactForBulkSend[];
  onAplicar: (selecionados: ContactForBulkSend[], motivos: Map<string, string>) => void;
}

/** Filtros rápidos: o sistema decide para quem ligar com base no histórico. */
export function PublicoInteligente({ contacts, onAplicar }: Props) {
  const [publico, setPublico] = useState<PublicoId | null>(null);
  const [produto, setProduto] = useState<{ id: string; nome: string } | null>(null);
  const [recente, setRecente] = useState(true);
  const [agendado, setAgendado] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<number | null>(null);

  useEffect(() => { setResultado(null); }, [publico, produto, recente, agendado]);

  const aplicar = async () => {
    if (!publico) return;
    setCarregando(true);
    try {
      const est = await getEstabelecimentoId();
      if (!est) return;
      const { orcs, protecao } = await carregarDadosPublico(est, contacts);
      const base = classificarPublico(publico, orcs, Date.now(), produto?.id);
      const motivos = aplicarProtecao(base, protecao, { recente, agendado });
      const sel = contacts.filter((c) => !c.isBlocked && motivos.has(c.id));
      setResultado(sel.length);
      onAplicar(sel, motivos);
    } finally { setCarregando(false); }
  };

  return (
    <Card className="p-3 space-y-3 shrink-0">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" /> Para quem ligar (filtros inteligentes)
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PUBLICOS.map((p) => (
          <button key={p.id} type="button" onClick={() => setPublico(publico === p.id ? null : p.id)}
            className={cn("rounded-lg border px-3 py-2 text-left transition-colors min-w-0",
              publico === p.id ? "border-primary bg-primary/10" : "border-border/60 hover:bg-muted/50")}>
            <span className="block text-xs font-semibold text-foreground">{p.rotulo}</span>
            <span className="block text-[10px] text-muted-foreground">{p.desc}</span>
          </button>
        ))}
      </div>
      {publico === "comprou_produto" && <ProdutoBusca valor={produto} onChange={setProduto} />}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <label className="flex items-center gap-2"><Switch checked={recente} onCheckedChange={setRecente} /> Excluir ligados nos últimos 7 dias</label>
        <label className="flex items-center gap-2"><Switch checked={agendado} onCheckedChange={setAgendado} /> Excluir com retorno agendado</label>
        <Button size="sm" className="ml-auto" disabled={!publico || carregando || (publico === "comprou_produto" && !produto)} onClick={() => void aplicar()}>
          {carregando && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Selecionar contatos
        </Button>
        {resultado !== null && <Badge variant="outline">{resultado} qualificados</Badge>}
      </div>
    </Card>
  );
}
