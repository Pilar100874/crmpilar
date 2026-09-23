import { Building2, Clock, Mail, MessageSquare, Phone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContatoAtendimento } from "@/hooks/useContatosAtendimento";
import { AtendimentoClientCard } from "@/components/atendimento/AtendimentoClientCard";

export type CanalContato = "tel" | "whatsapp" | "email" | "todos";

interface ContatosCanalListProps {
  contatos: ContatoAtendimento[];
  canal: CanalContato;
  titulo: string;
  acaoLabel?: string;
  vazioTexto?: string;
  onSelecionar?: (contato: ContatoAtendimento) => void;
  selecionadoId?: string | null;
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
}: ContatosCanalListProps) {
  const Icone = icones[canal];
  const lista = contatos.filter((c) => valorDoCanal(c, canal).trim() !== "");

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

      {lista.map((contato) => (
        <AtendimentoClientCard
          key={`${canal}-${contato.id}`}
          title={`${canal === "tel" ? "Ligação" : canal === "whatsapp" ? "Chat" : canal === "email" ? "E-mail" : "Contato"} - ${contato.nome}`}
          customerName={contato.nome}
          sideLabel={contato.responsavel || "Meu Cliente"}
          selected={selecionadoId === contato.id}
          onClick={onSelecionar ? () => onSelecionar(contato) : undefined}
          indicators={acaoLabel ? <Badge className="min-w-6 justify-center px-1.5">{acaoLabel}</Badge> : undefined}
        >
          {contato.horario && (
            <Badge variant="outline" className="gap-1 bg-background/70 text-xs font-medium">
              <Clock className="h-3.5 w-3.5" />
              {contato.horario}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1 bg-background/70 text-xs font-medium">
            <Icone className="h-3.5 w-3.5" />
            <span className="max-w-[190px] truncate">{valorDoCanal(contato, canal)}</span>
          </Badge>
          {contato.referencia && (
            <Badge variant="secondary" className="max-w-full truncate text-xs">{contato.referencia}</Badge>
          )}
          {contato.companies?.[0] && (
            <Badge variant="outline" className="max-w-full gap-1 bg-background/70 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              <span className="max-w-[150px] truncate">
                {contato.companies[0]?.empresas?.nome_fantasia || contato.companies[0]?.empresas?.nome || "Empresa"}
              </span>
            </Badge>
          )}
        </AtendimentoClientCard>
      ))}
    </div>
  );
}
