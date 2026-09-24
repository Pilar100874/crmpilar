import { AtendimentoClientCard } from "@/components/atendimento/AtendimentoClientCard";
import { AtendimentoCardIndicators } from "@/components/atendimento/AtendimentoCardIndicators";

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

export function ConversaAgendaCard({ conversa, dadosAgenda, selecionado, onClick }: ConversaAgendaCardProps) {
  const nome = conversa.customer?.nome || "Cliente";
  const empresaPrincipal = conversa.customer?.customer_empresas?.find((vinculo: any) => vinculo?.is_primary) || conversa.customer?.customer_empresas?.[0];
  const nomeEmpresa = empresaPrincipal?.empresas?.nome_fantasia || empresaPrincipal?.empresas?.nome;


  return (
    <AtendimentoClientCard
      title={dadosAgenda?.title || `Chat - ${nome}`}
      companyName={nomeEmpresa}
      customerName={nome}
      selected={selecionado}
      onClick={onClick}
      indicators={<AtendimentoCardIndicators {...dadosAgenda} />}
      historicoClienteId={conversa.customer_id}
      historicoClienteNome={nome}
    />
  );
}
