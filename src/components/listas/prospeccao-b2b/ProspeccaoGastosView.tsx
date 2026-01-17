import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import { ApiLogB2B, ConfigB2B, BuscaB2B } from './types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProspeccaoGastosViewProps {
  config: ConfigB2B | null;
  apiLogs: ApiLogB2B[];
  buscas: BuscaB2B[];
  getGastosInfo: () => {
    custoMensal: number;
    requisicoesDoMes: number;
    limiteAtingido: boolean;
    limiteMensal: number | null;
  };
}

const ProspeccaoGastosView: React.FC<ProspeccaoGastosViewProps> = ({
  config,
  apiLogs,
  buscas,
  getGastosInfo
}) => {
  const gastosInfo = getGastosInfo();

  // Calcular estatísticas
  const stats = useMemo(() => {
    const hoje = new Date();
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - 7);

    const logsDoMes = apiLogs.filter(log => new Date(log.created_at || '') >= inicioMes);
    const logsDaSemana = apiLogs.filter(log => new Date(log.created_at || '') >= inicioSemana);
    
    const custoSemana = logsDaSemana.reduce((sum, log) => sum + (log.custo_chamada || 0), 0);
    const requisicoesSucesso = logsDoMes.filter(log => log.resposta_status === 200).length;
    const requisicoesErro = logsDoMes.filter(log => log.resposta_status !== 200).length;
    const taxaSucesso = logsDoMes.length > 0 
      ? (requisicoesSucesso / logsDoMes.length) * 100 
      : 100;

    const buscasDoMes = buscas.filter(b => new Date(b.created_at || '') >= inicioMes);
    const totalProspects = buscasDoMes.reduce((sum, b) => sum + (b.total_resultados || 0), 0);
    const custoMedio = totalProspects > 0 
      ? gastosInfo.custoMensal / totalProspects 
      : 0;

    return {
      custoSemana,
      requisicoesSucesso,
      requisicoesErro,
      taxaSucesso,
      totalProspects,
      custoMedio
    };
  }, [apiLogs, buscas, gastosInfo]);

  const progressPercent = gastosInfo.limiteMensal 
    ? Math.min((gastosInfo.custoMensal / gastosInfo.limiteMensal) * 100, 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Custo Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                ${gastosInfo.custoMensal.toFixed(2)}
              </span>
            </div>
            {gastosInfo.limiteMensal && (
              <p className="text-xs text-muted-foreground mt-1">
                de ${gastosInfo.limiteMensal.toFixed(2)} limite
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Requisições do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">
                {gastosInfo.requisicoesDoMes}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Taxa de sucesso: {stats.taxaSucesso.toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Prospects Encontrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-purple-500" />
              <span className="text-2xl font-bold">
                {stats.totalProspects}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Custo médio: ${stats.custoMedio.toFixed(3)}/prospect
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {gastosInfo.limiteAtingido ? (
              <Badge variant="destructive" className="text-sm">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Limite Atingido
              </Badge>
            ) : (
              <Badge variant="outline" className="text-sm bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="h-4 w-4 mr-1" />
                Operacional
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barra de progresso do limite */}
      {gastosInfo.limiteMensal && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Uso do Limite Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>${gastosInfo.custoMensal.toFixed(2)}</span>
                <span className="text-muted-foreground">${gastosInfo.limiteMensal.toFixed(2)}</span>
              </div>
              <Progress 
                value={progressPercent} 
                className={progressPercent >= 90 ? 'bg-red-100' : ''}
              />
              <p className="text-xs text-muted-foreground">
                {progressPercent.toFixed(0)}% do limite utilizado
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico de buscas */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Buscas</CardTitle>
          <CardDescription>Últimas 10 buscas realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Palavra-chave</TableHead>
                <TableHead>Resultados</TableHead>
                <TableHead>Custo Est.</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buscas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma busca realizada ainda
                  </TableCell>
                </TableRow>
              ) : (
                buscas.map((busca) => (
                  <TableRow key={busca.id}>
                    <TableCell>
                      {busca.created_at && format(new Date(busca.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-medium">{busca.palavra_chave}</TableCell>
                    <TableCell>{busca.total_resultados}</TableCell>
                    <TableCell>${(busca.custo_estimado || 0).toFixed(3)}</TableCell>
                    <TableCell>
                      {busca.status === 'concluida' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Concluída
                        </Badge>
                      ) : busca.status === 'em_andamento' ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Em andamento
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Erro
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Log de API */}
      <Card>
        <CardHeader>
          <CardTitle>Log de Requisições API</CardTitle>
          <CardDescription>Últimas 20 chamadas à API</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[300px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Custo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiLogs.slice(0, 20).map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {log.created_at && format(new Date(log.created_at), 'dd/MM HH:mm:ss', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs font-mono">{log.tipo_chamada}</TableCell>
                    <TableCell className="text-xs">${(log.custo_chamada || 0).toFixed(4)}</TableCell>
                    <TableCell>
                      {log.resposta_status === 200 ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProspeccaoGastosView;
