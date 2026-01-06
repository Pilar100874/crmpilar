import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, History, Clock, Gauge, MapPin, Car, ChevronLeft } from 'lucide-react';
import { format, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Veiculo, VeiculoPosicao, HistoricoEstatisticas } from '@/types/logistica';

const RouteMapView = lazy(() => import('@/components/watch/WatchRouteMapView'));

const WatchLogisticaHistorico = () => {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null);
  const [posicoes, setPosicoes] = useState<VeiculoPosicao[]>([]);
  const [estatisticas, setEstatisticas] = useState<HistoricoEstatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  const fetchVeiculos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('ativo', true)
        .order('placa');

      if (error) throw error;
      setVeiculos((data || []) as Veiculo[]);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorico = async (veiculoId: string) => {
    setLoadingRoute(true);
    try {
      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);

      const { data, error } = await supabase
        .from('veiculo_posicoes')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .gte('data_hora', start.toISOString())
        .lte('data_hora', end.toISOString())
        .order('data_hora', { ascending: true });

      if (error) throw error;
      
      const posicoesTyped = (data || []) as VeiculoPosicao[];
      setPosicoes(posicoesTyped);
      setEstatisticas(calculateEstatisticas(posicoesTyped));
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingRoute(false);
    }
  };

  const calculateEstatisticas = (posicoes: VeiculoPosicao[]): HistoricoEstatisticas | null => {
    if (posicoes.length === 0) return null;

    let distanciaTotal = 0;
    let velocidadeMaxima = 0;
    let somaVelocidades = 0;
    let tempoMovimento = 0;
    let tempoParado = 0;

    for (let i = 0; i < posicoes.length; i++) {
      const posicao = posicoes[i];
      
      if (posicao.velocidade > velocidadeMaxima) {
        velocidadeMaxima = posicao.velocidade;
      }
      somaVelocidades += posicao.velocidade;

      if (i > 0) {
        const prevPosicao = posicoes[i - 1];
        
        const R = 6371;
        const dLat = (posicao.lat - prevPosicao.lat) * Math.PI / 180;
        const dLng = (posicao.lng - prevPosicao.lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(prevPosicao.lat * Math.PI / 180) * Math.cos(posicao.lat * Math.PI / 180) *
          Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distancia = R * c;
        distanciaTotal += distancia;

        const tempoMinutos = differenceInMinutes(
          new Date(posicao.data_hora),
          new Date(prevPosicao.data_hora)
        );

        const velocidadeMedia = (posicao.velocidade + prevPosicao.velocidade) / 2;
        if (velocidadeMedia > 5) {
          tempoMovimento += tempoMinutos;
        } else {
          tempoParado += tempoMinutos;
        }
      }
    }

    return {
      distancia_total_km: Math.round(distanciaTotal * 10) / 10,
      velocidade_maxima: Math.round(velocidadeMaxima),
      velocidade_media: Math.round(somaVelocidades / posicoes.length),
      tempo_movimento_minutos: tempoMovimento,
      tempo_parado_minutos: tempoParado,
      pontos_total: posicoes.length
    };
  };

  useEffect(() => {
    fetchVeiculos();
  }, []);

  const handleSelectVeiculo = (veiculo: Veiculo) => {
    setSelectedVeiculo(veiculo);
    fetchHistorico(veiculo.id);
  };

  const handleBack = () => {
    if (selectedVeiculo) {
      setSelectedVeiculo(null);
      setPosicoes([]);
      setEstatisticas(null);
    } else {
      navigate('/watch/logistica');
    }
  };

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Time display */}
        <div className="watch-time">
          <span className="time-main">{formatTime(currentTime)}</span>
        </div>

        {/* Back button */}
        <button onClick={handleBack} className="watch-back">
          <ArrowLeft className="w-4 h-4" />
        </button>

        {!selectedVeiculo ? (
          <>
            {/* Header */}
            <div className="watch-header">
              <History className="w-4 h-4" />
              <span>Histórico do Dia</span>
            </div>

            {/* Vehicle list */}
            <div className="watch-list">
              {loading ? (
                <div className="loading-indicator">
                  <RefreshCw className="w-5 h-5 animate-spin" />
                </div>
              ) : (
                veiculos.map(veiculo => (
                  <button
                    key={veiculo.id}
                    onClick={() => handleSelectVeiculo(veiculo)}
                    className="vehicle-item"
                  >
                    <div className="vehicle-info">
                      <Car className="w-3 h-3" />
                      <span className="vehicle-plate">{veiculo.placa}</span>
                    </div>
                    <ChevronLeft className="w-4 h-4 rotate-180 opacity-50" />
                  </button>
                ))
              )}
            </div>

            {/* Date indicator */}
            <div className="date-indicator">
              {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
            </div>
          </>
        ) : (
          <>
            {/* Header with vehicle plate */}
            <div className="watch-header">
              <History className="w-4 h-4" />
              <span>{selectedVeiculo.placa}</span>
            </div>

            {/* Stats row */}
            {estatisticas && (
              <div className="stats-row">
                <div className="stat-box">
                  <MapPin className="w-3 h-3" />
                  <span>{estatisticas.distancia_total_km} km</span>
                </div>
                <div className="stat-box">
                  <Gauge className="w-3 h-3" />
                  <span>{estatisticas.velocidade_maxima} km/h</span>
                </div>
                <div className="stat-box">
                  <Clock className="w-3 h-3" />
                  <span>{formatMinutes(estatisticas.tempo_movimento_minutos)}</span>
                </div>
              </div>
            )}

            {/* Map with route */}
            <div className="watch-map-container">
              {loadingRoute && posicoes.length === 0 ? (
                <div className="loading-indicator">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              ) : posicoes.length === 0 ? (
                <div className="no-data">
                  <History className="w-8 h-8 opacity-50" />
                  <span>Sem dados hoje</span>
                </div>
              ) : mapReady ? (
                <Suspense fallback={
                  <div className="loading-indicator">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                }>
                  <RouteMapView posicoes={posicoes} />
                </Suspense>
              ) : (
                <div className="loading-indicator">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                </div>
              )}
            </div>

            {/* Date indicator */}
            <div className="date-indicator">
              {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
            </div>

            {/* Refresh button */}
            <button onClick={() => fetchHistorico(selectedVeiculo.id)} className="refresh-btn" disabled={loadingRoute}>
              <RefreshCw className={`w-4 h-4 ${loadingRoute ? 'animate-spin' : ''}`} />
            </button>
          </>
        )}
      </div>

      <style>{`
        .watch-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          padding: 0;
          margin: 0;
          overflow: hidden;
        }

        .watch-frame {
          width: min(100vw, 100vh);
          height: min(100vw, 100vh);
          max-width: 450px;
          max-height: 450px;
          border-radius: 50%;
          background: linear-gradient(145deg, #1a1a2e, #0f0f1a);
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          box-shadow: 
            inset 0 0 60px rgba(0, 0, 0, 0.5),
            0 0 0 4px #2a2a3e,
            0 0 0 6px #1a1a2e;
          overflow: hidden;
          padding-top: 10%;
        }

        .watch-time {
          position: absolute;
          top: 6%;
          z-index: 1000;
        }

        .time-main {
          font-size: clamp(10px, 3vw, 14px);
          font-weight: 300;
          color: rgba(255, 255, 255, 0.9);
          background: rgba(0, 0, 0, 0.5);
          padding: 2px 8px;
          border-radius: 10px;
        }

        .watch-back {
          position: absolute;
          top: 5%;
          left: 20%;
          background: rgba(0, 0, 0, 0.6);
          border: none;
          border-radius: 50%;
          width: clamp(24px, 7vw, 32px);
          height: clamp(24px, 7vw, 32px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          z-index: 1000;
        }

        .watch-header {
          display: flex;
          align-items: center;
          gap: 6px;
          color: white;
          font-size: clamp(10px, 3vw, 14px);
          font-weight: 600;
          margin-top: 2%;
        }

        .watch-list {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 1.5vw, 8px);
          width: 70%;
          max-height: 55%;
          overflow-y: auto;
          margin-top: 4%;
          padding: 4px;
          scrollbar-width: none;
        }

        .watch-list::-webkit-scrollbar {
          display: none;
        }

        .vehicle-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: clamp(6px, 2vw, 10px);
          padding: clamp(8px, 2.5vw, 12px);
          cursor: pointer;
          transition: all 0.2s;
          color: white;
        }

        .vehicle-item:active {
          transform: scale(0.98);
          background: rgba(255, 255, 255, 0.1);
        }

        .vehicle-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .vehicle-plate {
          font-size: clamp(10px, 2.8vw, 13px);
          font-weight: 600;
        }

        .stats-row {
          display: flex;
          gap: clamp(6px, 2vw, 12px);
          margin-top: 3%;
        }

        .stat-box {
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(255, 255, 255, 0.08);
          padding: 4px 8px;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.8);
          font-size: clamp(8px, 2.2vw, 10px);
          font-weight: 500;
        }

        .watch-map-container {
          width: 75%;
          height: 50%;
          border-radius: 20px;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.1);
          margin-top: 3%;
        }

        .loading-indicator, .no-data {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          height: 100%;
          background: rgba(26, 26, 46, 0.9);
          color: rgba(255, 255, 255, 0.5);
          font-size: clamp(9px, 2.5vw, 12px);
        }

        .date-indicator {
          position: absolute;
          bottom: 18%;
          font-size: clamp(8px, 2.5vw, 11px);
          color: rgba(255, 255, 255, 0.5);
          text-transform: capitalize;
        }

        .refresh-btn {
          position: absolute;
          bottom: 8%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: clamp(28px, 8vw, 36px);
          height: clamp(28px, 8vw, 36px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          z-index: 1000;
        }

        .refresh-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default WatchLogisticaHistorico;
