import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VeiculoComStatus, VeiculoPosicao } from '@/types/logistica';

// Lazy load map components to prevent SSR issues
const MapComponents = lazy(() => import('@/components/watch/WatchMapView'));

const WatchLogisticaMapa = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedVeiculoId = searchParams.get('veiculo');
  
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Delay map render to avoid hydration issues
    const timeout = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timeout);
  }, []);

  const fetchVeiculos = async () => {
    setLoading(true);
    try {
      let query = supabase.from('veiculos').select('*').eq('ativo', true);
      
      if (selectedVeiculoId) {
        query = query.eq('id', selectedVeiculoId);
      }

      const { data: veiculosData, error: veiculosError } = await query.order('placa');

      if (veiculosError) throw veiculosError;

      const veiculosComStatus: VeiculoComStatus[] = await Promise.all(
        (veiculosData || []).map(async (veiculo) => {
          const { data: posicaoData } = await supabase
            .from('veiculo_posicoes')
            .select('*')
            .eq('veiculo_id', veiculo.id)
            .order('data_hora', { ascending: false })
            .limit(1);

          const ultimaPosicao = posicaoData?.[0] as VeiculoPosicao | undefined;
          const status = calculateStatus(ultimaPosicao);

          return {
            ...veiculo,
            ultima_posicao: ultimaPosicao,
            status
          } as VeiculoComStatus;
        })
      );

      setVeiculos(veiculosComStatus);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatus = (posicao?: VeiculoPosicao): 'movendo' | 'parado' | 'offline' => {
    if (!posicao) return 'offline';
    
    const agora = new Date();
    const ultimaAtualizacao = new Date(posicao.data_hora);
    const diffMinutos = (agora.getTime() - ultimaAtualizacao.getTime()) / 1000 / 60;

    if (diffMinutos > 30) return 'offline';
    if (posicao.velocidade > 5) return 'movendo';
    return 'parado';
  };

  useEffect(() => {
    fetchVeiculos();
    const interval = setInterval(fetchVeiculos, 10000);
    return () => clearInterval(interval);
  }, [selectedVeiculoId]);

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const validVeiculos = veiculos.filter(v => v.ultima_posicao);

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Time display */}
        <div className="watch-time">
          <span className="time-main">{formatTime(currentTime)}</span>
        </div>

        {/* Back button */}
        <button onClick={() => navigate('/watch/logistica')} className="watch-back">
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="watch-title">
          <MapPin className="w-4 h-4" />
          <span>Mapa ao Vivo</span>
        </div>

        {/* Map container */}
        <div className="watch-map-container">
          {loading && validVeiculos.length === 0 ? (
            <div className="loading-indicator">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          ) : mapReady ? (
            <Suspense fallback={
              <div className="loading-indicator">
                <RefreshCw className="w-6 h-6 animate-spin" />
              </div>
            }>
              <MapComponents 
                veiculos={validVeiculos} 
                selectedVeiculoId={selectedVeiculoId}
                onVeiculoClick={(id) => navigate(`/watch/logistica/rota/${id}`)}
              />
            </Suspense>
          ) : (
            <div className="loading-indicator">
              <RefreshCw className="w-6 h-6 animate-spin" />
            </div>
          )}
        </div>

        {/* Vehicle count indicator */}
        <div className="vehicle-count">
          {validVeiculos.length} veículo(s)
        </div>

        {/* Refresh button */}
        <button onClick={fetchVeiculos} className="refresh-btn" disabled={loading}>
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
          justify-content: center;
          position: relative;
          box-shadow: 
            inset 0 0 60px rgba(0, 0, 0, 0.5),
            0 0 0 4px #2a2a3e,
            0 0 0 6px #1a1a2e;
          overflow: hidden;
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

        .watch-title {
          position: absolute;
          top: 15%;
          display: flex;
          align-items: center;
          gap: 6px;
          color: white;
          font-size: clamp(10px, 3vw, 14px);
          font-weight: 500;
        }

        .watch-map-container {
          width: 75%;
          height: 55%;
          border-radius: 20px;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: rgba(26, 26, 46, 0.9);
          color: rgba(255, 255, 255, 0.5);
        }

        .vehicle-count {
          position: absolute;
          bottom: 18%;
          font-size: clamp(8px, 2.5vw, 11px);
          color: rgba(255, 255, 255, 0.6);
          background: rgba(0, 0, 0, 0.5);
          padding: 2px 10px;
          border-radius: 10px;
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
      `}</style>
    </div>
  );
};

export default WatchLogisticaMapa;
