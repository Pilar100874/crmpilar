import { Phone, MessageSquare, Mail, Receipt, MapPin, Link2, type LucideIcon } from "lucide-react";

export type CanalCartao = "telefone" | "chat" | "email" | "orcamento" | "visita" | "vinculo" | null;

const PREFIXOS: Array<{ regex: RegExp; canal: CanalCartao }> = [
  { regex: /^liga[çc][ãa]o\s*-\s*/i, canal: "telefone" },
  { regex: /^chat\s*-\s*/i, canal: "chat" },
  { regex: /^e-?mail\s*-\s*/i, canal: "email" },
  { regex: /^or[çc]amento\s*-\s*/i, canal: "orcamento" },
  { regex: /^visita\s*-\s*/i, canal: "visita" },
  { regex: /^novo\s+v[íi]nculo\s*:\s*/i, canal: "vinculo" },
];

export const ICONES_CANAL: Record<Exclude<CanalCartao, null>, LucideIcon> = {
  telefone: Phone,
  chat: MessageSquare,
  email: Mail,
  orcamento: Receipt,
  visita: MapPin,
  vinculo: Link2,
};

export const ROTULOS_CANAL: Record<Exclude<CanalCartao, null>, string> = {
  telefone: "Ligação",
  chat: "Chat",
  email: "E-mail",
  orcamento: "Orçamento",
  visita: "Visita",
  vinculo: "Novo vínculo",
};

/** Separa o prefixo de canal do título da tarefa: "Ligação - Marcos" -> { nome: "Marcos", canal: "telefone" } */
export function parseTituloCartao(titulo: string | null | undefined): { nome: string; canal: CanalCartao } {
  const bruto = (titulo || "").trim();
  for (const { regex, canal } of PREFIXOS) {
    if (regex.test(bruto)) {
      return { nome: bruto.replace(regex, "").trim() || bruto, canal };
    }
  }
  return { nome: bruto, canal: null };
}

/** Título do cartão: nome do cliente seguido de um ícone discreto do canal/origem. */
export function TituloCartao({ titulo, className = "", iconClassName = "h-3.5 w-3.5 text-muted-foreground" }: {
  titulo: string | null | undefined;
  className?: string;
  iconClassName?: string;
}) {
  const { nome, canal } = parseTituloCartao(titulo);
  const Icone = canal ? ICONES_CANAL[canal] : null;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${className}`}>
      <span className="truncate">{nome}</span>
      {Icone && <Icone className={`${iconClassName} shrink-0`} aria-label={ROTULOS_CANAL[canal!]} />}
    </span>
  );
}
