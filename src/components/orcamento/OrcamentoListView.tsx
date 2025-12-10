import { Orcamento } from "@/types/orcamento";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrcamentoListViewProps {
  orcamentos: Orcamento[];
  onOrcamentoClick: (orcamento: Orcamento) => void;
}

const ETAPA_LABELS: Record<string, string> = {
  orcamento: 'Orçamento',
  negociacao: 'Negociação',
  aprovacao_gerencia: 'Aprovação Gerência',
  perdido: 'Perdido',
  finalizado: 'Finalizado',
};

const ETAPA_COLORS: Record<string, string> = {
  orcamento: 'bg-blue-500',
  negociacao: 'bg-amber-500',
  aprovacao_gerencia: 'bg-purple-500',
  perdido: 'bg-red-500',
  finalizado: 'bg-orange-500',
};

export default function OrcamentoListView({ orcamentos, onOrcamentoClick }: OrcamentoListViewProps) {
  return (
    <ScrollArea className="h-full">
      <div className="p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Etapa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Itens</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orcamentos.map((orcamento) => (
              <TableRow
                key={orcamento.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onOrcamentoClick(orcamento)}
              >
                <TableCell className="font-mono text-xs">
                  #{orcamento.id.slice(0, 8)}
                </TableCell>
                <TableCell className="font-medium">
                  {orcamento.cliente?.nome || 'N/A'}
                </TableCell>
                <TableCell>
                  {orcamento.vendedor?.nome || 'N/A'}
                </TableCell>
                <TableCell className="font-semibold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(orcamento.valor_total || 0)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span 
                      className={`w-2 h-2 rounded-full ${ETAPA_COLORS[orcamento.etapa]}`}
                    />
                    {ETAPA_LABELS[orcamento.etapa]}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={orcamento.status === 'em_aberto' ? 'default' : 'secondary'}>
                    {orcamento.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(orcamento.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {orcamento.itens?.length || 0}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {orcamentos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum orçamento encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}
