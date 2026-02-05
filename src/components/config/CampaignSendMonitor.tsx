import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Ban,
  Send,
  Filter,
  Calendar,
  User,
  MessageSquare,
  Phone
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { toast } from '@/lib/toast-config';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SendLog {
  id: string;
  campaign_id: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  skip_reason: string | null;
  error_message: string | null;
  message_content: string | null;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  has_response: boolean | null;
  response_at: string | null;
  created_at: string;
}

interface SendStats {
  total: number;
  pending: number;
  sent: number;
  delivered: number;
  failed: number;
  blocked: number;
  skipped: number;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pending: { label: 'Pendente', icon: <Clock className="h-4 w-4" />, color: 'bg-muted text-muted-foreground' },
  sent: { label: 'Enviado', icon: <Send className="h-4 w-4" />, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  delivered: { label: 'Entregue', icon: <CheckCircle2 className="h-4 w-4" />, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
  failed: { label: 'Falhou', icon: <XCircle className="h-4 w-4" />, color: 'bg-destructive/10 text-destructive' },
  blocked: { label: 'Bloqueado', icon: <Ban className="h-4 w-4" />, color: 'bg-destructive/10 text-destructive' },
  skipped: { label: 'Pulado', icon: <AlertTriangle className="h-4 w-4" />, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' }
};

const skipReasonLabels: Record<string, string> = {
  no_optin: 'Sem opt-in WhatsApp',
  cold_contact: 'Contato frio (sem interação recente)',
  blocked_tag: 'Tag bloqueada',
  low_score: 'Score de engajamento baixo',
  no_phone: 'Sem número de telefone',
  invalid_phone: 'Telefone inválido',
  daily_limit: 'Limite diário atingido',
  hourly_limit: 'Limite por hora atingido',
  blocked_by_user: 'Bloqueado pelo usuário',
  not_registered: 'Número não registrado no WhatsApp'
};

export function CampaignSendMonitor() {
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [stats, setStats] = useState<SendStats>({ total: 0, pending: 0, sent: 0, delivered: 0, failed: 0, blocked: 0, skipped: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('today');

  const { data: estabelecimentoId } = useQuery({
    queryKey: ['user-estabelecimento-monitor'],
    queryFn: async () => {
      return await getEstabelecimentoId();
    }
  });

  useEffect(() => {
    if (estabelecimentoId) {
      loadLogs();
    }
  }, [estabelecimentoId, statusFilter, dateFilter]);

  const loadLogs = async () => {
    if (!estabelecimentoId) return;

    try {
      setLoading(true);

      let query = supabase
        .from('campaign_send_logs')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // Filtro de data
      const now = new Date();
      let startDate: Date | null = null;

      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'yesterday':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
          break;
        case 'week':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          break;
      }

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedLogs: SendLog[] = (data || []).map((item) => ({
        id: item.id,
        campaign_id: item.campaign_id,
        customer_id: item.customer_id,
        customer_name: item.customer_name,
        customer_phone: item.customer_phone,
        status: item.status,
        skip_reason: item.skip_reason,
        error_message: item.error_message,
        message_content: item.message_content,
        scheduled_at: item.scheduled_at,
        sent_at: item.sent_at,
        delivered_at: item.delivered_at,
        has_response: item.has_response,
        response_at: item.response_at,
        created_at: item.created_at
      }));

      setLogs(mappedLogs);
      calculateStats(mappedLogs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast.error('Erro ao carregar logs de envio');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (logsData: SendLog[]) => {
    const newStats: SendStats = {
      total: logsData.length,
      pending: logsData.filter(l => l.status === 'pending').length,
      sent: logsData.filter(l => l.status === 'sent').length,
      delivered: logsData.filter(l => l.status === 'delivered').length,
      failed: logsData.filter(l => l.status === 'failed').length,
      blocked: logsData.filter(l => l.status === 'blocked').length,
      skipped: logsData.filter(l => l.status === 'skipped').length
    };
    setStats(newStats);
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.customer_name?.toLowerCase().includes(search) ||
      log.customer_phone?.includes(search) ||
      log.message_content?.toLowerCase().includes(search)
    );
  });

  const deliveryRate = stats.total > 0 ? ((stats.delivered / stats.total) * 100).toFixed(1) : '0';
  const failureRate = stats.total > 0 ? (((stats.failed + stats.blocked + stats.skipped) / stats.total) * 100).toFixed(1) : '0';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.sent}</div>
            <p className="text-xs text-muted-foreground">Enviados</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground">Entregues</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-muted-foreground">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            <p className="text-xs text-muted-foreground">Falharam</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-destructive">{stats.blocked}</div>
            <p className="text-xs text-muted-foreground">Bloqueados</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.skipped}</div>
            <p className="text-xs text-muted-foreground">Pulados</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taxa de Entrega</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{deliveryRate}%</span>
            </div>
            <Progress value={parseFloat(deliveryRate)} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Taxa de Falha/Bloqueio</span>
              <span className="text-sm font-bold text-destructive">{failureRate}%</span>
            </div>
            <Progress value={parseFloat(failureRate)} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Label className="sr-only">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="delivered">Entregue</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="blocked">Bloqueado</SelectItem>
                <SelectItem value="skipped">Pulado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="yesterday">Ontem</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
                <SelectItem value="all">Todo o período</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={loadLogs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Histórico de Envios
          </CardTitle>
          <CardDescription>
            {filteredLogs.length} registros encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Resposta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const config = statusConfig[log.status] || statusConfig.pending;
                    return (
                      <TableRow key={log.id}>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge className={config.color}>
                                  <span className="flex items-center gap-1">
                                    {config.icon}
                                    {config.label}
                                  </span>
                                </Badge>
                              </TooltipTrigger>
                              {log.error_message && (
                                <TooltipContent>
                                  <p className="max-w-[300px]">{log.error_message}</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{log.customer_name || 'Sem nome'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{log.customer_phone || '-'}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.skip_reason ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <span className="text-sm text-muted-foreground">
                                    {skipReasonLabels[log.skip_reason] || log.skip_reason}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{log.skip_reason}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {log.has_response ? (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Sim
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
