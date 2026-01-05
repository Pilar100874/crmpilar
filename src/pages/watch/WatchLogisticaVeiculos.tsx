import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Wifi, WifiOff, Gauge, Clock, Car, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { VeiculoComStatus, VeiculoPosicao } from '@/types/logistica';

const WatchLogisticaVeiculos = () => {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchVeiculos = async () => {
    setLoading(true);
    try {
      const { data: veiculosData, error: veiculosError } = await supabase
        .from('veiculos')
        .select('*')
        .eq('ativo', true)
        .order('placa');

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
    const interval = setInterval(fetchVeiculos, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const onlineCount = veiculos.filter(v => v.status !== 'offline').length;
  const movendoCount = veiculos.filter(v => v.status === 'movendo').length;
  const paradoCount = veiculos.filter(v => v.status === 'parado').length;

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Time display */}
        <div className="watch-time">
          <span className="time-main">{formatTime(currentTime)}</span>
        </div>

        {/* Back button */}
        <button onClick={() => navigate('/watch')} className="watch-back">
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="watch-header">
          <Car className="w-4 h-4" />
          <span>Veículos Online</span>
        </div>

        {/* Stats summary */}
        <div className="watch-stats-row">
          <div className="stat-item online">
            <Wifi className="w-3 h-3" />
            <span>{onlineCount}</span>
          </div>
          <div className="stat-item moving">
            <Gauge className="w-3 h-3" />
            <span>{movendoCount}</span>
          </div>
          <div className="stat-item stopped">
            <Clock className="w-3 h-3" />
            <span>{paradoCount}</span>
          </div>
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
                onClick={() => navigate(`/watch/logistica/mapa?veiculo=${veiculo.id}`)}
                className={`vehicle-item status-${veiculo.status}`}
              >
                <div className="vehicle-info">
                  {veiculo.status !== 'offline' ? (
                    <Wifi className="w-3 h-3 text-green-400" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-gray-500" />
                  )}
                  <span className="vehicle-plate">{veiculo.placa}</span>
                </div>
                <div className="vehicle-meta">
                  {veiculo.ultima_posicao && (
                    <span className="vehicle-speed">
                      {Math.round(veiculo.ultima_posicao.velocidade)} km/h
                    </span>
                  )}
                  <span className={`status-badge ${veiculo.status}`}>
                    {veiculo.status === 'movendo' ? 'Mov' : veiculo.status === 'parado' ? 'Par' : 'Off'}
                  </span>
                </div>
              </button>
            ))
          )}
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
          position: relative;
          box-shadow: 
            inset 0 0 60px rgba(0, 0, 0, 0.5),
            0 0 0 4px #2a2a3e,
            0 0 0 6px #1a1a2e;
          overflow: hidden;
          padding-top: 12%;
        }

        .watch-time {
          position: absolute;
          top: 6%;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .time-main {
          font-size: clamp(10px, 3vw, 14px);
          font-weight: 300;
          color: rgba(255, 255, 255, 0.7);
        }

        .watch-back {
          position: absolute;
          top: 5%;
          left: 20%;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          width: clamp(24px, 7vw, 32px);
          height: clamp(24px, 7vw, 32px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
        }

        .watch-header {
          display: flex;
          align-items: center;
          gap: 6px;
          color: white;
          font-size: clamp(10px, 3vw, 14px);
          font-weight: 500;
          margin-top: 2%;
        }

        .watch-stats-row {
          display: flex;
          gap: clamp(8px, 3vw, 16px);
          margin-top: 3%;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: clamp(9px, 2.5vw, 12px);
          font-weight: 600;
        }

        .stat-item.online {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .stat-item.moving {
          background: rgba(59, 130, 246, 0.2);
          color: #3b82f6;
        }

        .stat-item.stopped {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }

        .watch-list {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 1.5vw, 8px);
          width: 70%;
          max-height: 50%;
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
          padding: clamp(6px, 2vw, 10px);
          cursor: pointer;
          transition: all 0.2s;
        }

        .vehicle-item:active {
          transform: scale(0.98);
          background: rgba(255, 255, 255, 0.1);
        }

        .vehicle-item.status-movendo {
          border-left: 3px solid #22c55e;
        }

        .vehicle-item.status-parado {
          border-left: 3px solid #fbbf24;
        }

        .vehicle-item.status-offline {
          border-left: 3px solid #6b7280;
          opacity: 0.6;
        }

        .vehicle-info {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .vehicle-plate {
          font-size: clamp(9px, 2.5vw, 12px);
          font-weight: 600;
          color: white;
        }

        .vehicle-meta {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .vehicle-speed {
          font-size: clamp(8px, 2vw, 10px);
          color: rgba(255, 255, 255, 0.6);
        }

        .status-badge {
          font-size: clamp(7px, 1.8vw, 9px);
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 8px;
        }

        .status-badge.movendo {
          background: rgba(34, 197, 94, 0.3);
          color: #22c55e;
        }

        .status-badge.parado {
          background: rgba(251, 191, 36, 0.3);
          color: #fbbf24;
        }

        .status-badge.offline {
          background: rgba(107, 114, 128, 0.3);
          color: #9ca3af;
        }

        .loading-indicator {
          display: flex;
          justify-content: center;
          padding: 20px;
          color: rgba(255, 255, 255, 0.5);
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
        }

        .refresh-btn:disabled {
          opacity: 0.5;
        }
      `}</style>
    </div>
  );
};

export default WatchLogisticaVeiculos;
