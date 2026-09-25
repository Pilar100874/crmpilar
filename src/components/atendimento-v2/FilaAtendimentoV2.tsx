import { Building2, Check, Clock3, Mail, MapPin, MessageCircle, Phone, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AtendimentoV2FilaItem } from "@/types/atendimento-v2";

const icones = {
  whatsapp: MessageCircle,
  telefone: Phone,
  email: Mail,
  visita: MapPin,
};

const rotulos = {
  whatsapp: "WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  visita: "Visita",
};

interface Props {
  itens: AtendimentoV2FilaItem[];
  selecionado?: string | null;
  modoSelecao: boolean;
  selecionados: Set<string>;
  onSelecionar: (item: AtendimentoV2FilaItem) => void;
  onMarcar: (key: string) => void;
  onIdentificar: (item: AtendimentoV2FilaItem) => void;
}

export function FilaAtendimentoV2({ itens, selecionado, modoSelecao, selecionados, onSelecionar, onMarcar, onIdentificar }: Props) {
  if (itens.length === 0) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center px-6 text-center">
        <Check className="mb-3 h-9 w-9 text-success" />
        <p className="font-semibold text-foreground">Fila concluída</p>
        <p className="mt-1 text-sm text-muted-foreground">Nenhum contato para este filtro.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/70">
      {itens.map((item) => {
        const Icone = icones[item.canal];
        const ativo = selecionado === item.key;
        return (
          <div
            key={item.key}
            className={cn(
              "group relative flex min-h-[78px] items-center gap-2 px-3 py-2.5 transition-colors",
              ativo ? "bg-accent" : "bg-card hover:bg-muted/50",
            )}
          >
            {ativo && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
            {modoSelecao && (
              <Checkbox
                checked={selecionados.has(item.key)}
                onCheckedChange={() => onMarcar(item.key)}
                aria-label={`Selecionar ${item.nome}`}
                className="h-5 w-5 shrink-0"
              />
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onSelecionar(item)}
              className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-none px-0 py-0 text-left hover:bg-transparent"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-foreground">
                {item.nome.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toUpperCase() || "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">{item.nome}</span>
                  <span className={cn("shrink-0 text-xs font-semibold", item.atrasado ? "text-destructive" : "text-foreground")}>{item.horario}</span>
                </span>
                <span className="mt-0.5 flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-xs text-muted-foreground">{item.empresa || item.motivo}</span>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                    <Icone className="h-3.5 w-3.5" /> {rotulos[item.canal]}
                  </span>
                </span>
                <span className="mt-1 flex items-center gap-1.5">
                  {item.atrasado && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">Atrasado</Badge>}
                  {item.naoLidas > 0 && <Badge variant="secondary" className="h-5 bg-info/10 px-1.5 text-[10px] text-info">{item.naoLidas} nova{item.naoLidas > 1 ? "s" : ""}</Badge>}
                  {item.recebido && !item.atrasado && item.naoLidas === 0 && <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Recebido</Badge>}
                  {item.tarefa?.time && <Clock3 className="h-3 w-3 text-muted-foreground" />}
                </span>
              </span>
            </Button>
            {item.naoIdentificado && (
              <Button type="button" size="icon" variant="ghost" className="h-11 w-11 shrink-0" onClick={() => onIdentificar(item)} title="Localizar ou cadastrar contato">
                <UserRoundSearch className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}