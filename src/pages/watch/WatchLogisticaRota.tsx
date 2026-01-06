import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Route, Clock, Gauge, MapPin } from 'lucide-react';
import { format, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Veiculo, VeiculoPosicao, HistoricoEstatisticas } from '@/types/logistica';

// Lazy load map components
const RouteMapView = lazy(() => import('@/components/watch/WatchRouteMapView'));

const WatchLogisticaRota = () => {
  const navigate = useNavigate();
  const { veiculoId } = useParams<{ veiculoId: string }>();
  
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [posicoes, setPosicoes] = useState<VeiculoPosicao[]>([]);
  const [estatisticas, setEstatisticas] = useState<HistoricoEstatisticas | null>(null);
  const [loading, setLoading] = useState(true);
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

  const fetchData = async () => {
    if (!veiculoId) return;
    
    setLoading(true);
    try {
      const { data: veiculoData, error: veiculoError } = await supabase
        .from('veiculos')
        .select('*')
        .eq('id', veiculoId)
        .single();

      if (veiculoError) throw veiculoError;
      setVeiculo(veiculoData as Veiculo);

      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);

      const { data: posicoesData, error: posicoesError } = await supabase
        .from('veiculo_posicoes')
        .select('*')
        .eq('veiculo_id', veiculoId)
        .gte('data_hora', start.toISOString())
        .lte('data_hora', end.toISOString())
        .order('data_hora', { ascending: true });

      if (posicoesError) throw posicoesError;
      
      const posicoesTyped = (posicoesData || []) as VeiculoPosicao[];
      setPosicoes(posicoesTyped);
      setEstatisticas(calculateEstatisticas(posicoesTyped));
    } catch (error) {
      console.error('Error fetching route:', error);
    } finally {
      setLoading(false);
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
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [veiculoId]);

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
        {/* Map with route - fullscreen */}
        <div className="watch-map-container">
          {loading && posicoes.length === 0 ? (
            <div className="loading-indicator">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : posicoes.length === 0 ? (
            <div className="no-data">
              <Route className="w-8 h-8 opacity-50" />
              <span>Sem rota hoje</span>
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

        {/* Time display overlay */}
        <div className="watch-time-overlay">
          <span>{formatTime(currentTime)}</span>
        </div>

        {/* Back button overlay */}
        <button onClick={() => navigate('/watch/logistica')} className="watch-back-overlay">
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Header with vehicle plate overlay */}
        <div className="watch-header-overlay">
          <Route className="w-3 h-3" />
          <span>{veiculo?.placa || '...'}</span>
        </div>

        {/* Stats row overlay */}
        {estatisticas && (
          <div className="stats-row-overlay">
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

        {/* Date indicator overlay */}
        <div className="date-overlay">
          {format(new Date(), "dd/MM", { locale: ptBR })}
        </div>

        {/* Refresh button overlay */}
        <button onClick={fetchData} className="refresh-overlay" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
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
        }

        .watch-map-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border-radius: 50%;
          overflow: hidden;
          z-index: 1;
        }

        .watch-map-container :global(.leaflet-container) {
          width: 100%;
          height: 100%;
          border-radius: 50%;
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

        .watch-time-overlay {
          position: absolute;
          top: 6%;
          left: 50%;
          transform: translateX(-50%);
          font-size: clamp(12px, 3vw, 16px);
          font-weight: 600;
          color: white;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          padding: 4px 12px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          z-index: 100;
        }

        .watch-back-overlay {
          position: absolute;
          top: 5%;
          left: 18%;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: clamp(28px, 8vw, 36px);
          height: clamp(28px, 8vw, 36px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          z-index: 100;
        }

        .watch-back-overlay:active {
          transform: scale(0.95);
          background: rgba(0, 0, 0, 0.9);
        }

        .watch-header-overlay {
          position: absolute;
          top: 5%;
          right: 18%;
          display: flex;
          align-items: center;
          gap: 4px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          padding: 4px 10px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          font-size: clamp(10px, 2.5vw, 12px);
          font-weight: 600;
          z-index: 100;
        }

        .stats-row-overlay {
          position: absolute;
          bottom: 20%;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: clamp(4px, 1.5vw, 8px);
          z-index: 100;
        }

        .stat-box {
          display: flex;
          align-items: center;
          gap: 3px;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          padding: 4px 8px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          font-size: clamp(8px, 2vw, 10px);
          font-weight: 500;
        }

        .date-overlay {
          position: absolute;
          bottom: 12%;
          left: 50%;
          transform: translateX(-50%);
          font-size: clamp(10px, 2.5vw, 12px);
          color: white;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          padding: 3px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          z-index: 100;
        }

        .refresh-overlay {
          position: absolute;
          bottom: 5%;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: clamp(28px, 8vw, 36px);
          height: clamp(28px, 8vw, 36px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
          z-index: 100;
        }

        .refresh-overlay:active {
          transform: translateX(-50%) scale(0.95);
          background: rgba(0, 0, 0, 0.9);
        }

        .refresh-overlay:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default WatchLogisticaRota;
