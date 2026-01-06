import { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
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
    <div className="watch-fullscreen-container">
      {/* Full screen map */}
      <div className="fullscreen-map">
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

      {/* Overlay controls */}
      <div className="overlay-top">
        {/* Back button */}
        <button onClick={() => navigate('/watch/logistica')} className="overlay-btn">
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Time display */}
        <div className="overlay-time">
          <span>{formatTime(currentTime)}</span>
        </div>

        {/* Refresh button */}
        <button onClick={fetchVeiculos} className="overlay-btn" disabled={loading}>
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Vehicle count indicator */}
      <div className="overlay-bottom">
        <div className="vehicle-count">
          {validVeiculos.length} veículo(s)
        </div>
      </div>

      <style>{`
        .watch-fullscreen-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          background: #000;
          overflow: hidden;
        }

        .fullscreen-map {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #1a1a2e;
          color: rgba(255, 255, 255, 0.5);
        }

        .overlay-top {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          padding-top: max(16px, env(safe-area-inset-top));
          z-index: 1000;
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.6), transparent);
        }

        .overlay-btn {
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
        }

        .overlay-btn:active {
          transform: scale(0.95);
          background: rgba(0, 0, 0, 0.8);
        }

        .overlay-btn:disabled {
          opacity: 0.5;
        }

        .overlay-time {
          font-size: 18px;
          font-weight: 600;
          color: white;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
          padding: 8px 16px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .overlay-bottom {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          padding: 20px;
          padding-bottom: max(20px, env(safe-area-inset-bottom));
          z-index: 1000;
          background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
        }

        .vehicle-count {
          font-size: 14px;
          font-weight: 500;
          color: white;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(10px);
          padding: 8px 20px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default WatchLogisticaMapa;
