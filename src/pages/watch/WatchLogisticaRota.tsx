import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Route, Clock, Gauge, MapPin } from 'lucide-react';
import { format, startOfDay, endOfDay, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Veiculo, VeiculoPosicao, HistoricoEstatisticas } from '@/types/logistica';
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const MapUpdater = ({ positions }: { positions: VeiculoPosicao[] }) => {
  const map = useMap();
  
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [20, 20], maxZoom: 15 });
    }
  }, [positions, map]);
  
  return null;
};

const WatchLogisticaRota = () => {
  const navigate = useNavigate();
  const { veiculoId } = useParams<{ veiculoId: string }>();
  
  const [veiculo, setVeiculo] = useState<Veiculo | null>(null);
  const [posicoes, setPosicoes] = useState<VeiculoPosicao[]>([]);
  const [estatisticas, setEstatisticas] = useState<HistoricoEstatisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    if (!veiculoId) return;
    
    setLoading(true);
    try {
      // Fetch vehicle info
      const { data: veiculoData, error: veiculoError } = await supabase
        .from('veiculos')
        .select('*')
        .eq('id', veiculoId)
        .single();

      if (veiculoError) throw veiculoError;
      setVeiculo(veiculoData as Veiculo);

      // Fetch today's positions
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
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [veiculoId]);

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  
  const formatMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) return `${hours}h${mins}m`;
    return `${mins}m`;
  };

  const routeCoordinates = posicoes.map(p => [p.lat, p.lng] as [number, number]);
  const lastPosition = posicoes.length > 0 ? posicoes[posicoes.length - 1] : null;
  const defaultCenter: [number, number] = lastPosition 
    ? [lastPosition.lat, lastPosition.lng]
    : [-23.5505, -46.6333];

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Time display */}
        <div className="watch-time">
          <span className="time-main">{formatTime(currentTime)}</span>
        </div>

        {/* Back button */}
        <button onClick={() => navigate(`/watch/logistica/mapa?veiculo=${veiculoId}`)} className="watch-back">
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Header with vehicle plate */}
        <div className="watch-header">
          <Route className="w-4 h-4" />
          <span>{veiculo?.placa || 'Carregando...'}</span>
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
          {loading && posicoes.length === 0 ? (
            <div className="loading-indicator">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : posicoes.length === 0 ? (
            <div className="no-data">
              <Route className="w-8 h-8 opacity-50" />
              <span>Sem rota hoje</span>
            </div>
          ) : (
            <MapContainer
              center={defaultCenter}
              zoom={13}
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
              attributionControl={false}
            >
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              <MapUpdater positions={posicoes} />
              
              {/* Route polyline */}
              <Polyline
                positions={routeCoordinates}
                pathOptions={{ 
                  color: '#3b82f6', 
                  weight: 3,
                  opacity: 0.8
                }}
              />
              
              {/* Start marker */}
              {posicoes.length > 0 && (
                <CircleMarker
                  center={[posicoes[0].lat, posicoes[0].lng]}
                  radius={6}
                  pathOptions={{ 
                    fillColor: '#22c55e',
                    fillOpacity: 1,
                    color: 'white',
                    weight: 2
                  }}
                />
              )}
              
              {/* End marker (current position) */}
              {lastPosition && (
                <CircleMarker
                  center={[lastPosition.lat, lastPosition.lng]}
                  radius={8}
                  pathOptions={{ 
                    fillColor: '#ef4444',
                    fillOpacity: 1,
                    color: 'white',
                    weight: 2
                  }}
                />
              )}
            </MapContainer>
          )}
        </div>

        {/* Date indicator */}
        <div className="date-indicator">
          {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}
        </div>

        {/* Refresh button */}
        <button onClick={fetchData} className="refresh-btn" disabled={loading}>
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
          width: 80%;
          height: 55%;
          border-radius: 50%;
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

        .leaflet-container {
          background: #1a1a2e;
        }
      `}</style>
    </div>
  );
};

export default WatchLogisticaRota;
