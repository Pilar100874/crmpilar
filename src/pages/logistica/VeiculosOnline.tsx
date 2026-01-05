import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInMinutes, format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VeiculoComStatus, VeiculoPosicao, VeiculoStatus } from '@/types/logistica';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { LogisticaLayout } from '@/components/logistica/LogisticaLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Car, Search, MapPin, Clock, Gauge, User, Radio, 
  TrendingUp, AlertCircle, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const statusConfig = {
  movendo: { label: 'Em movimento', color: 'bg-green-500', bgColor: 'bg-green-100', textColor: 'text-green-700', icon: TrendingUp },
  parado: { label: 'Parado', color: 'bg-amber-500', bgColor: 'bg-amber-100', textColor: 'text-amber-700', icon: AlertCircle },
  offline: { label: 'Offline', color: 'bg-gray-400', bgColor: 'bg-gray-100', textColor: 'text-gray-600', icon: AlertCircle }
};

const VeiculosOnline: React.FC = () => {
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const initEstabelecimento = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
    };
    initEstabelecimento();
  }, []);

  useEffect(() => {
    if (!estabelecimentoId) return;
    
    fetchVeiculos();
    
    const channel = supabase
      .channel('veiculo-posicoes-online')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'veiculo_posicoes'
        },
        (payload) => {
          handleNewPosition(payload.new as VeiculoPosicao);
        }
      )
      .subscribe();

    const interval = setInterval(fetchVeiculos, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [estabelecimentoId]);

  const fetchVeiculos = async () => {
    if (!estabelecimentoId) return;
    
    try {
      const { data: veiculosData, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('placa');

      if (error) throw error;

      const veiculosComPosicao: VeiculoComStatus[] = await Promise.all(
        (veiculosData || []).map(async (veiculo) => {
          const { data: posicao } = await supabase
            .from('veiculo_posicoes')
            .select('*')
            .eq('veiculo_id', veiculo.id)
            .order('data_hora', { ascending: false })
            .limit(1)
            .single();

          const status = calculateStatus(posicao as VeiculoPosicao | null);

          return {
            ...veiculo,
            ultima_posicao: posicao as VeiculoPosicao | undefined,
            status,
            ultima_atualizacao: posicao?.data_hora
          } as VeiculoComStatus;
        })
      );

      setVeiculos(veiculosComPosicao);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (posicao: VeiculoPosicao | null): VeiculoStatus => {
    if (!posicao) return 'offline';
    const minutesSinceUpdate = differenceInMinutes(new Date(), new Date(posicao.data_hora));
    if (minutesSinceUpdate > 10) return 'offline';
    if (posicao.velocidade > 5) return 'movendo';
    return 'parado';
  };

  const handleNewPosition = (posicao: VeiculoPosicao) => {
    setVeiculos(prev => prev.map(v => {
      if (v.id === posicao.veiculo_id) {
        const status = calculateStatus(posicao);
        return { ...v, ultima_posicao: posicao, status, ultima_atualizacao: posicao.data_hora };
      }
      return v;
    }));
  };

  const filteredVeiculos = veiculos.filter(v => {
    const matchesSearch = v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.motorista?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    total: veiculos.length,
    online: veiculos.filter(v => v.status !== 'offline').length,
    movendo: veiculos.filter(v => v.status === 'movendo').length,
    parado: veiculos.filter(v => v.status === 'parado').length,
    offline: veiculos.filter(v => v.status === 'offline').length
  };

  return (
    <LogisticaLayout activeTab="veiculos">
      <div className="h-full flex flex-col p-4 gap-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <Radio className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{counts.online}</p>
                  <p className="text-xs text-muted-foreground">Online</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-green-500/5 border-green-500/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-green-500/10">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{counts.movendo}</p>
                  <p className="text-xs text-muted-foreground">Movendo</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-amber-500/10">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{counts.parado}</p>
                  <p className="text-xs text-muted-foreground">Parado</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-500/5 border-gray-500/20">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-gray-500/10">
                  <AlertCircle className="h-4 w-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{counts.offline}</p>
                  <p className="text-xs text-muted-foreground">Offline</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por placa, descrição ou motorista..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="movendo">Em movimento</SelectItem>
              <SelectItem value="parado">Parado</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchVeiculos()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Vehicle List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-muted-foreground">Carregando veículos...</div>
            </div>
          ) : filteredVeiculos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Car className="h-8 w-8 mb-2" />
              <p>Nenhum veículo encontrado</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredVeiculos.map((veiculo) => {
                const config = statusConfig[veiculo.status];
                const StatusIcon = config.icon;
                return (
                  <Card 
                    key={veiculo.id} 
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/logistica/mapa?veiculo=${veiculo.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Car className={`h-5 w-5 ${config.textColor}`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-lg">{veiculo.placa}</h3>
                            {veiculo.descricao && (
                              <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                                {veiculo.descricao}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge className={`${config.bgColor} ${config.textColor} border-0 text-xs`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${config.color} mr-1.5`} />
                          {config.label}
                        </Badge>
                      </div>

                      <div className="space-y-2 text-sm">
                        {veiculo.motorista && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3.5 w-3.5" />
                            <span className="truncate">{veiculo.motorista}</span>
                          </div>
                        )}
                        
                        {veiculo.ultima_posicao && (
                          <>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Gauge className="h-3.5 w-3.5" />
                              <span>{Math.round(veiculo.ultima_posicao.velocidade)} km/h</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Clock className="h-3.5 w-3.5" />
                              <span className="text-xs">
                                {formatDistanceToNow(new Date(veiculo.ultima_posicao.data_hora), {
                                  addSuffix: true,
                                  locale: ptBR
                                })}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
    </LogisticaLayout>
  );
};

export default VeiculosOnline;
