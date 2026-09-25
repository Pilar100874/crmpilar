import { CalendarDays, FileText, Mail, MapPin, MessageCircle, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ClienteCabecalho {
  id?: string | null;
  nome: string;
  empresa?: string | null;
  telefone?: string | null;
  tel?: string | null;
  email?: string | null;
  proximoContato?: string | null;
  atrasado?: boolean;
}

interface Props {
  cliente: ClienteCabecalho;
  abaAtiva: string;
  onTrocarCanal: (aba: string) => void;
  painelAberto?: boolean;
  onTogglePainel?: () => void;
  filaAberta?: boolean;
  onToggleFila?: () => void;
}

const iniciais = (nome: string) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";

/** Cabeçalho do cliente selecionado: os canais aparecem conforme os dados do cartão. */
export function CabecalhoClienteAtendimento({ cliente, abaAtiva, onTrocarCanal, onHistorico, painelAberto, onTogglePainel, filaAberta, onToggleFila }: Props) {
  const canais = [
    { aba: "chat", label: "WhatsApp", icon: MessageCircle, cor: "text-success", ok: !!cliente.telefone },
    { aba: "tel", label: "Telefone", icon: Phone, cor: "text-primary", ok: !!(cliente.tel || cliente.telefone) },
    { aba: "email", label: "E-mail", icon: Mail, cor: "text-info", ok: !!cliente.email },
    { aba: "visita", label: "Visita", icon: MapPin, cor: "text-accent-foreground", ok: true },
    { aba: "orcamento", label: "Orçamento", icon: FileText, cor: "text-muted-foreground", ok: true },
  ].filter((c) => c.ok);

  return (
    <div className="flex-shrink-0 border-b border-border bg-card px-5 pt-4">
      <div className="flex items-start gap-4">
        {onToggleFila && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={onToggleFila}
            title={filaAberta ? "Recolher fila do dia" : "Ampliar fila do dia"}
            aria-label={filaAberta ? "Recolher fila do dia" : "Ampliar fila do dia"}
          >
            {filaAberta ? <PanelLeftClose className="h-4 w-4 text-orange-600" /> : <PanelLeftOpen className="h-4 w-4 text-orange-600" />}
          </Button>
        )}
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-foreground">
          {iniciais(cliente.nome)}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold text-foreground">{cliente.nome}</h2>
          {cliente.empresa && <p className="truncate text-sm text-muted-foreground">{cliente.empresa}</p>}
          {cliente.proximoContato && (
            <p className={cn("mt-1 flex items-center gap-1.5 text-sm font-medium", cliente.atrasado ? "text-destructive" : "text-primary")}>
              <CalendarDays className="h-4 w-4" />
              {cliente.atrasado ? "Retorno atrasado" : "Retorno agendado"} · {cliente.proximoContato}
            </p>
          )}
        </div>
        {onTogglePainel && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onTogglePainel}
            title={painelAberto ? "Reduzir cadastro e vínculos" : "Ampliar cadastro e vínculos"}
            aria-label={painelAberto ? "Reduzir cadastro e vínculos" : "Ampliar cadastro e vínculos"}
          >
            {painelAberto ? <PanelRightClose className="h-4 w-4 text-orange-600" /> : <PanelRightOpen className="h-4 w-4 text-orange-600" />}
          </Button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {canais.map((c) => {
          const Icon = c.icon;
          const ativo = abaAtiva === c.aba;
          return (
            <button
              key={c.aba}
              type="button"
              onClick={() => onTrocarCanal(c.aba)}
              title={c.label}
              aria-label={c.label}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                ativo ? "border-primary bg-primary/10 text-foreground" : "border-border bg-background text-foreground hover:border-primary/40",
              )}
            >
              <Icon className={cn("h-4 w-4", c.cor)} />
            </button>
          );
        })}
      </div>

    </div>
  );
}
