import { Mail, MessageSquare, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePendenciasAtendimento, ordenarPendentesPrimeiro } from "@/hooks/usePendenciasAtendimento";
import type { ContatoAtendimento } from "@/hooks/useContatosAtendimento";
import { AtendimentoClientCard } from "@/components/atendimento/AtendimentoClientCard";
import { AtendimentoCardIndicators } from "@/components/atendimento/AtendimentoCardIndicators";
import { AtendimentoHoraBadge, AtendimentoInfoBadge } from "@/components/atendimento/AtendimentoCardBadges";

export type CanalContato = "tel" | "whatsapp" | "email" | "todos";

interface ContatosCanalListProps {
  contatos: ContatoAtendimento[];
  canal: CanalContato;
  titulo: string;
  acaoLabel?: string;
  vazioTexto?: string;
  onSelecionar?: (contato: ContatoAtendimento) => void;
  selecionadoId?: string | null;
  colorirPorEmpresa?: boolean;
}

const icones = {
  tel: Phone,
  whatsapp: MessageSquare,
  email: Mail,
  todos: Users,
};

function valorDoCanal(contato: ContatoAtendimento, canal: CanalContato) {
  if (canal === "tel") return contato.tel || "";
  if (canal === "whatsapp") return contato.telefone || "";
  if (canal === "email") return contato.email || "";
  return contato.tel || contato.telefone || contato.email || "";
}

/** Lista de contatos filtrada pelo canal (telefone, WhatsApp ou e-mail). */
export default function ContatosCanalList({
  contatos,
  canal,
  titulo,
  acaoLabel,
  vazioTexto = "Nenhum contato",
  onSelecionar,
  selecionadoId = null,
  colorirPorEmpresa = false,
}: ContatosCanalListProps) {
  const Icone = icones[canal];
  const pendencias = usePendenciasAtendimento();
  const lista = ordenarPendentesPrimeiro(
    contatos.filter((c) => canal === "todos" || valorDoCanal(c, canal).trim() !== ""),
    (c) => c.id,
    pendencias,
  );

  if (lista.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Icone className="w-8 h-8 text-primary/40" />
        </div>
        <p className="text-sm font-medium">{vazioTexto}</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <Icone className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">{titulo}</span>
        <Badge className="text-[10px] bg-primary/10 text-primary border-0 px-1.5">{lista.length}</Badge>
      </div>

      {lista.map((contato) => {
        const temEmpresa = (contato.companies || []).some(
          (vinculo: any) => vinculo?.empresas?.id || vinculo?.empresa_id,
        );
        const empresaPrincipal = (contato.companies || []).find((vinculo: any) => vinculo?.is_primary) || contato.companies?.[0];
        const nomeEmpresa = empresaPrincipal?.empresas?.nome_fantasia || empresaPrincipal?.empresas?.nome;
        return (
          <AtendimentoClientCard
          key={`${canal}-${contato.id}`}
          title={contato.referencia || `${canal === "tel" ? "Ligação" : canal === "whatsapp" ? "Chat" : canal === "email" ? "E-mail" : "Contato"} - ${contato.nome}`}
          companyName={nomeEmpresa}
          customerName={contato.nome}
          sideLabel={contato.responsavel || "Meu Cliente"}
          selected={selecionadoId === contato.id}
          selectionTone={colorirPorEmpresa && !temEmpresa ? "info" : "primary"}
          onClick={onSelecionar ? () => onSelecionar(contato) : undefined}
          indicators={<AtendimentoCardIndicators {...contato} />}
          historicoClienteId={contato.id}
          historicoClienteNome={contato.nome}
          className={colorirPorEmpresa
            ? temEmpresa
              ? "border-primary/80 hover:border-primary"
              : "border-info/80 hover:border-info"
            : undefined}
        >
          <AtendimentoHoraBadge hora={contato.horario || ""} />
          {contato.origem && <AtendimentoInfoBadge>{contato.origem}</AtendimentoInfoBadge>}
          {acaoLabel && <AtendimentoInfoBadge>{acaoLabel}</AtendimentoInfoBadge>}
          </AtendimentoClientCard>
        );
      })}
    </div>
  );
}
