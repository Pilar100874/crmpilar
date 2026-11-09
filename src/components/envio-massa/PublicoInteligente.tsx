import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import {
  PUBLICOS, PublicoId, aplicarProtecao, ultimosMotivos, ganchosPotenciais, carregarDadosPublico, classificarPublico,
} from "@/lib/voz/publicoInteligente";
import { carregarPotenciais, ROTULO_TIPO } from "@/lib/atendimento/potenciais";
import { ProdutoBusca } from "./ProdutoBusca";
import { ContactForBulkSend } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  contacts: ContactForBulkSend[];
  onAplicar: (selecionados: ContactForBulkSend[], motivos: Map<string, string>) => void;
}

/** Filtros rápidos: o sistema decide para quem ligar com base no histórico. */
export function PublicoInteligente({ contacts, onAplicar }: Props) {
  const [publico, setPublico] = useState<PublicoId | "potenciais" | null>(null);
  const [produto, setProduto] = useState<{ id: string; nome: string } | null>(null);
  const [recente, setRecente] = useState(true);
  const [agendado, setAgendado] = useState(true);
  const [canais, setCanais] = useState(true);
  const [diasCanais, setDiasCanais] = useState(3);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<number | null>(null);

  useEffect(() => { setResultado(null); }, [publico, produto, recente, agendado, canais, diasCanais]);

  const aplicar = async () => {
    if (!publico) return;
    setCarregando(true);
    try {
      const est = await getEstabelecimentoId();
      if (!est) return;
      const { orcs, protecao } = await carregarDadosPublico(est, contacts, diasCanais);
      ganchosPotenciais.clear();
      let base: Map<string, string>;
      if (publico === "potenciais") {
        // Mesma lista da aba Potenciais: cada cliente leva o motivo para a fala da IA.
        const pots = await carregarPotenciais(est, contacts.map((c) => c.id));
        base = new Map(pots.map((p) => [p.clienteId, `${ROTULO_TIPO[p.tipo]}: ${p.motivos.join("; ") || p.motivo}`]));
        for (const p of pots) ganchosPotenciais.set(p.clienteId, { tipo: p.tipo, motivo: p.motivos.join("; ") || p.motivo, produto: p.produto });
      } else base = classificarPublico(publico, orcs, Date.now(), produto?.id);
      const motivos = aplicarProtecao(base, protecao, { recente, agendado, canais });
      ultimosMotivos.clear(); motivos.forEach((v, k) => ultimosMotivos.set(k, v));
      const sel = contacts.filter((c) => !c.isBlocked && motivos.has(c.id));
      setResultado(sel.length);
      onAplicar(sel, motivos);
    } finally { setCarregando(false); }
  };

  return (
    <Card className="p-3 space-y-3 shrink-0">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" /> Para quem enviar (filtros inteligentes)
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {[{ id: "potenciais" as const, rotulo: "Clientes potenciais", desc: "Mesma lista da aba Potenciais, com o motivo de cada cliente" }, ...PUBLICOS].map((p) => (
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
        <label className="flex items-center gap-2"><Switch checked={recente} onCheckedChange={setRecente} /> Excluir quem recebeu ligação da IA nos últimos 7 dias</label>
        <label className="flex items-center gap-2"><Switch checked={canais} onCheckedChange={setCanais} /> Excluir quem recebeu disparo em qualquer canal nos últimos
          <input type="number" min={1} max={30} value={diasCanais} onChange={(e) => setDiasCanais(Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
            className="h-7 w-12 rounded border bg-background px-1 text-center text-foreground" /> dias</label>
        <label className="flex items-center gap-2"><Switch checked={agendado} onCheckedChange={setAgendado} /> Excluir com retorno agendado</label>
        <Button size="sm" className="ml-auto" disabled={!publico || carregando || (publico === "comprou_produto" && !produto)} onClick={() => void aplicar()}>
          {carregando && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Selecionar contatos
        </Button>
        {resultado !== null && <Badge variant="outline">{resultado} qualificados</Badge>}
      </div>
    </Card>
  );
}
