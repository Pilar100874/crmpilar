import { Clock } from "lucide-react";
import { AtendimentoClientCard } from "@/components/atendimento/AtendimentoClientCard";
import { AtendimentoCardIndicators } from "@/components/atendimento/AtendimentoCardIndicators";
import { Badge } from "@/components/ui/badge";

interface DadosAgenda {
  title: string;
  time: string;
  origem: string;
  responsavel: string;
  orcamentosAbertos: number;
  diasAtraso: number;
  emailsNaoLidos: number;
  chatsPendentes: number;
}

interface ConversaAgendaCardProps {
  conversa: any;
  dadosAgenda?: DadosAgenda;
  selecionado: boolean;
  tempo: string;
  onClick: () => void;
}

export function ConversaAgendaCard({ conversa, dadosAgenda, selecionado, tempo, onClick }: ConversaAgendaCardProps) {
  const nome = conversa.customer?.nome || "Cliente";

  return (
    <AtendimentoClientCard
      title={dadosAgenda?.title || `Chat - ${nome}`}
      customerName={nome}
      sideLabel={dadosAgenda?.responsavel || conversa.customerLinkedUsers?.[0]?.usuarios?.nome?.split(" ")[0] || "Meu Cliente"}
      selected={selecionado}
      onClick={onClick}
      indicators={
        <>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{tempo}</span>
          <AtendimentoCardIndicators {...dadosAgenda} />
        </>
      }
    >
      {dadosAgenda?.time && (
        <Badge variant="outline" className="gap-1 bg-background/70">
          <Clock className="h-3.5 w-3.5" />
          {dadosAgenda.time}
        </Badge>
      )}
      {dadosAgenda?.origem && <Badge variant="outline">{dadosAgenda.origem}</Badge>}
    </AtendimentoClientCard>
  );
}