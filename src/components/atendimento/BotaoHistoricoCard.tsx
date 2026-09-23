import { History } from "lucide-react";
import { abrirHistoricoDoContato } from "@/lib/atendimento/navegacaoContato";

interface BotaoHistoricoCardProps {
  clienteId?: string | null;
  clienteNome?: string | null;
}

/** Botão do cartão que abre o histórico do cliente na tela central. */
export function BotaoHistoricoCard({ clienteId, clienteNome }: BotaoHistoricoCardProps) {
  if (!clienteId) return null;

  return (
    <button
      type="button"
      title="Ver histórico do cliente"
      aria-label="Ver histórico do cliente"
      onClick={(event) => {
        event.stopPropagation();
        abrirHistoricoDoContato({ customerId: clienteId, nome: clienteNome || undefined });
      }}
      className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-background/90 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <History className="h-3.5 w-3.5" />
    </button>
  );
}
