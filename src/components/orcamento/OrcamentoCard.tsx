import { Orcamento, OrcamentoEtapa } from "@/types/orcamento";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Calendar, DollarSign, User, MoreVertical, Trash2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrcamentoCardProps {
  orcamento: Orcamento;
  onClick?: () => void;
  onDelete?: (orcamentoId: string) => void;
  onEtapaChange?: (orcamentoId: string, newEtapa: OrcamentoEtapa) => void;
  etapas?: { id: string; title: string; color: string; }[];
}

export default function OrcamentoCard({ orcamento, onClick, onDelete, onEtapaChange, etapas }: OrcamentoCardProps) {
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
      className="cursor-pointer hover:shadow-md transition-shadow"
    >
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1" {...attributes} {...listeners} onClick={onClick}>
            <h4 className="font-semibold text-sm line-clamp-1">
              {orcamento.empresa?.nome_fantasia || orcamento.cliente?.nome || 'Cliente não informado'}
            </h4>
            {orcamento.empresa && orcamento.cliente?.nome && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {orcamento.cliente.nome}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              #{orcamento.id.slice(0, 8)}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={orcamento.status === 'em_aberto' ? 'default' : 'secondary'}>
              {orcamento.status}
            </Badge>
            
            {(onDelete || onEtapaChange) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEtapaChange && etapas && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Mover para
                      </div>
                      {etapas.filter(e => e.id !== orcamento.etapa).map((etapa) => (
                        <DropdownMenuItem
                          key={etapa.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onEtapaChange(orcamento.id, etapa.id as OrcamentoEtapa);
                          }}
                        >
                          <ArrowRight className="w-4 h-4 mr-2" />
                          {etapa.title}
                        </DropdownMenuItem>
                      ))}
                    </>
                  )}
                  {onDelete && (
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(orcamento.id);
                      }}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <div className="space-y-2" {...attributes} {...listeners} onClick={onClick}>
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
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground">
              {orcamento.itens.length} {orcamento.itens.length === 1 ? 'item' : 'itens'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
