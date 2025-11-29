import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Calendar, Car, Route, Clock, Gauge, Activity, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { Veiculo, VeiculoPosicao, HistoricoEstatisticas } from '@/types/logistica';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LogisticaHistorico: React.FC = () => {
  const { veiculoId } = useParams<{ veiculoId: string }>();
  const navigate = useNavigate();
  
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [posicoes, setPosicoes] = useState<VeiculoPosicao[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);
  const [estatisticas, setEstatisticas] = useState<HistoricoEstatisticas | null>(null);

  useEffect(() => {
    if (veiculoId) {
      fetchVeiculo();
    }
  }, [veiculoId]);

  useEffect(() => {
    if (veiculoId && selectedDate) {
      fetchPosicoes();
    }
  }, [veiculoId, selectedDate]);

  const fetchVeiculo = async () => {
    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('id', veiculoId)
        .single();

      if (error) throw error;
      setVeiculo(data as Veiculo);
    } catch (error) {
      console.error('Error fetching vehicle:', error);
      toast.error('Erro ao carregar veículo');
    }
  };

  const fetchPosicoes = async () => {
    setLoading(true);
    try {
      const start = startOfDay(selectedDate);
      const end = endOfDay(selectedDate);

      const { data, error } = await supabase
        .from('veiculo_posicoes')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .gte('data_hora', start.toISOString())
        .lte('data_hora', end.toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;

      const posicoesData = (data || []) as VeiculoPosicao[];
      setPosicoes(posicoesData);
      calculateEstatisticas(posicoesData);
    } catch (error) {
      console.error('Error fetching positions:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoading(false);
    }
  };

  const calculateEstatisticas = (posicoes: VeiculoPosicao[]) => {
    if (posicoes.length === 0) {
      setEstatisticas(null);
      return;
    }

    let distanciaTotal = 0;
    let velocidadeMaxima = 0;
    let somaVelocidades = 0;
    let tempoMovimento = 0;
    let tempoParado = 0;

    for (let i = 0; i < posicoes.length; i++) {
      const posicao = posicoes[i];
      
      // Track max and average speed
      if (posicao.velocidade > velocidadeMaxima) {
        velocidadeMaxima = posicao.velocidade;
      }
      somaVelocidades += posicao.velocidade;

      // Calculate distance and time between consecutive points
      if (i > 0) {
        const prevPosicao = posicoes[i - 1];
        
        // Calculate distance using Haversine formula
        const R = 6371; // Earth's radius in km
        const dLat = (posicao.lat - prevPosicao.lat) * Math.PI / 180;
        const dLng = (posicao.lng - prevPosicao.lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(prevPosicao.lat * Math.PI / 180) * Math.cos(posicao.lat * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distancia = R * c;
        distanciaTotal += distancia;

        // Calculate time difference
        const tempoMinutos = differenceInMinutes(
          new Date(posicao.data_hora),
          new Date(prevPosicao.data_hora)
        );

        // Consider moving if average speed > 5 km/h
        const velocidadeMedia = (posicao.velocidade + prevPosicao.velocidade) / 2;
        if (velocidadeMedia > 5) {
          tempoMovimento += tempoMinutos;
        } else {
          tempoParado += tempoMinutos;
        }
      }
    }

    setEstatisticas({
      distancia_total_km: Math.round(distanciaTotal * 10) / 10,
      velocidade_maxima: Math.round(velocidadeMaxima),
      velocidade_media: Math.round(somaVelocidades / posicoes.length),
      tempo_movimento_minutos: tempoMovimento,
      tempo_parado_minutos: tempoParado,
      pontos_total: posicoes.length
    });
  };

  const routeCoordinates = posicoes.map(p => ({ lat: p.lat, lng: p.lng }));

  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-background flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/logistica')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Car className="h-5 w-5" />
              Histórico do Veículo
              {veiculo && <span className="text-primary">{veiculo.placa}</span>}
            </h1>
            {veiculo?.motorista && (
              <p className="text-sm text-muted-foreground">Motorista: {veiculo.motorista}</p>
            )}
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              locale={ptBR}
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Content */}
      <div className="flex-1 flex">
        {/* Map */}
        <div className="flex-1 relative">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-muted-foreground">Carregando histórico...</div>
            </div>
          ) : posicoes.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum registro para esta data</p>
              </div>
            </div>
          ) : (
            <LazyLogisticaMap
              routes={[{
                coordinates: routeCoordinates,
                color: '#3b82f6',
                distance: estatisticas?.distancia_total_km ? estatisticas.distancia_total_km * 1000 : undefined
              }]}
              className="h-full w-full"
            />
          )}
        </div>

        {/* Statistics Panel */}
        <div className="w-80 flex-shrink-0 border-l bg-background p-4 overflow-auto">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Estatísticas do Dia
          </h2>

          {!estatisticas ? (
            <p className="text-muted-foreground text-sm">
              Selecione uma data com registros para ver as estatísticas.
            </p>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Route className="h-4 w-4" />
                    Distância Percorrida
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{estatisticas.distancia_total_km} km</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    Velocidade Máxima
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{estatisticas.velocidade_maxima} km/h</p>
                  <p className="text-sm text-muted-foreground">
                    Média: {estatisticas.velocidade_media} km/h
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tempo em Movimento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatMinutes(estatisticas.tempo_movimento_minutos)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Tempo Parado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{formatMinutes(estatisticas.tempo_parado_minutos)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Pontos Registrados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{estatisticas.pontos_total}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogisticaHistorico;