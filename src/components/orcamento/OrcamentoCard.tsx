import { Orcamento } from "@/types/orcamento";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, DollarSign, User } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrcamentoCardProps {
  orcamento: Orcamento;
  onClick?: () => void;
}

export default function OrcamentoCard({ orcamento, onClick }: OrcamentoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: orcamento.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-sm line-clamp-1">
              {orcamento.cliente?.nome || 'Cliente não informado'}
            </h4>
            <p className="text-xs text-muted-foreground">
              #{orcamento.id.slice(0, 8)}
            </p>
          </div>
          <Badge variant={orcamento.status === 'em_aberto' ? 'default' : 'secondary'}>
            {orcamento.status}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(orcamento.valor_total || 0)}
            </span>
          </div>

          {orcamento.vendedor && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {orcamento.vendedor.nome}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>
              {format(new Date(orcamento.created_at), "dd/MM/yyyy", { locale: ptBR })}
            </span>
          </div>
        </div>

        {orcamento.itens && orcamento.itens.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              {orcamento.itens.length} {orcamento.itens.length === 1 ? 'item' : 'itens'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
