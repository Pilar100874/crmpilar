import { Mail, MessageSquare, Phone, User, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ContatoAtendimento } from "@/hooks/useContatosAtendimento";

export type CanalContato = "tel" | "whatsapp" | "email" | "todos";

interface ContatosCanalListProps {
  contatos: ContatoAtendimento[];
  canal: CanalContato;
  titulo: string;
  acaoLabel?: string;
  vazioTexto?: string;
  onSelecionar?: (contato: ContatoAtendimento) => void;
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
        <div
          key={`${canal}-${contato.id}`}
          onClick={onSelecionar ? () => onSelecionar(contato) : undefined}
          className={`relative px-3 py-3 rounded-xl transition-all duration-200 bg-card/60 border border-transparent ${onSelecionar ? "cursor-pointer hover:bg-card hover:shadow-sm" : "cursor-default"}`}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="font-semibold text-sm truncate">{contato.nome}</span>
                {acaoLabel && (
                  <Badge className="text-[9px] bg-primary/10 text-primary border-0 px-1.5 flex-shrink-0">
                    {acaoLabel}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                <Icone className="w-3 h-3" />
                {valorDoCanal(contato, canal)}
              </p>
              {contato.referencia && (
                <p className="text-[11px] text-muted-foreground/80 truncate mt-0.5">{contato.referencia}</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
