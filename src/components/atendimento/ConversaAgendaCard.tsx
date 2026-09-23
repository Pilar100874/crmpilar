import { AtendimentoClientCard } from "@/components/atendimento/AtendimentoClientCard";
import { AtendimentoCardIndicators } from "@/components/atendimento/AtendimentoCardIndicators";
import { AtendimentoHoraBadge, AtendimentoInfoBadge } from "@/components/atendimento/AtendimentoCardBadges";

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
  const diasAtraso = Number(dadosAgenda?.diasAtraso || 0);
  const textoTempo = diasAtraso > 0
    ? `${diasAtraso} ${diasAtraso === 1 ? "dia" : "dias"} atrasado`
    : tempo;

  return (
    <AtendimentoClientCard
      title={dadosAgenda?.title || `Chat - ${nome}`}
      customerName={nome}
      sideLabel={dadosAgenda?.responsavel || conversa.customerLinkedUsers?.[0]?.usuarios?.nome?.split(" ")[0] || "Meu Cliente"}
      selected={selecionado}
      onClick={onClick}
      indicators={<AtendimentoCardIndicators {...dadosAgenda} />}
    >
      <AtendimentoHoraBadge hora={dadosAgenda?.time || ""} />
      {dadosAgenda?.origem && <AtendimentoInfoBadge>{dadosAgenda.origem}</AtendimentoInfoBadge>}
    </AtendimentoClientCard>
  );
}
