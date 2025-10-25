import { Deal } from '@/types/funil';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { DollarSign, User, Building2, TrendingUp, AlertCircle } from 'lucide-react';

interface StageConfig {
  id: string;
  title: string;
}

interface FunilListViewProps {
  deals: Deal[];
  stages: StageConfig[];
  onDealClick: (deal: Deal) => void;
}

export function FunilListView({ deals, stages, onDealClick }: FunilListViewProps) {
  const getStageTitle = (stageId: string): string => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.title || stageId;
  };

  const getStageColor = (stageId: string): string => {
    const stageIndex = stages.findIndex(s => s.id === stageId);
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
    ];
    return colors[stageIndex % colors.length] || colors[0];
  };

  const saudeColors = {
    verde: 'text-green-600 dark:text-green-400',
    amarelo: 'text-yellow-600 dark:text-yellow-400',
    vermelho: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">LEAD TÍTULO</TableHead>
              <TableHead className="font-semibold">CONTATO PRINCIPAL</TableHead>
              <TableHead className="font-semibold">EMPRESA DO CONTATO</TableHead>
              <TableHead className="font-semibold">ETAPA DO LEAD</TableHead>
              <TableHead className="font-semibold text-right">VENDA, R$</TableHead>
              <TableHead className="font-semibold text-center">STATUS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {deals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum negócio encontrado
                </TableCell>
              </TableRow>
            ) : (
              deals.map((deal) => (
                <TableRow
                  key={deal.id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => onDealClick(deal)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-muted-foreground" />
                      {deal.cliente}
                      {deal.diasParado && deal.diasParado > 3 && (
                        <AlertCircle className="w-4 h-4 text-orange-500" />
                      )}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" />
                      {deal.responsavel}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      {deal.origem || deal.segmento || '-'}
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={getStageColor((deal as any).stage || 'lead')}
                    >
                      {getStageTitle((deal as any).stage || 'lead')}
                    </Badge>
                  </TableCell>
                  
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 font-semibold">
                      <DollarSign className="w-4 h-4 text-primary" />
                      {deal.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </div>
                  </TableCell>
                  
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-2">
                      {deal.saude && (
                        <div className={`w-2 h-2 rounded-full ${
                          deal.saude === 'verde' ? 'bg-green-500' :
                          deal.saude === 'amarelo' ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`} />
                      )}
                      {deal.status === 'urgente' && (
                        <Badge variant="destructive" className="text-xs">
                          Urgente
                        </Badge>
                      )}
                      {deal.diasParado && deal.diasParado > 3 && (
                        <Badge variant="outline" className="text-xs text-orange-700 border-orange-300">
                          {deal.diasParado}d
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
