import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { VeiculoComStatus, VeiculoPosicao } from '@/types/logistica';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createVehicleIcon = (status: 'movendo' | 'parado' | 'offline') => {
  const colors = {
    movendo: '#22c55e',
    parado: '#fbbf24',
    offline: '#6b7280'
  };
  
  return L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: ${colors[status]};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const MapUpdater = ({ veiculos }: { veiculos: VeiculoComStatus[] }) => {
  const map = useMap();
  
  useEffect(() => {
    const validVeiculos = veiculos.filter(v => v.ultima_posicao);
    if (validVeiculos.length > 0) {
      const bounds = L.latLngBounds(
        validVeiculos.map(v => [v.ultima_posicao!.lat, v.ultima_posicao!.lng])
      );
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
    }
  }, [veiculos, map]);
  
  return null;
};

const WatchLogisticaMapa = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedVeiculoId = searchParams.get('veiculo');
  
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
    const interval = setInterval(fetchVeiculos, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, [selectedVeiculoId]);

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const validVeiculos = veiculos.filter(v => v.ultima_posicao);
  const defaultCenter: [number, number] = validVeiculos.length > 0 
    ? [validVeiculos[0].ultima_posicao!.lat, validVeiculos[0].ultima_posicao!.lng]
    : [-23.5505, -46.6333]; // São Paulo default

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Time display */}
        <div className="watch-time">
          <span className="time-main">{formatTime(currentTime)}</span>
        </div>

        {/* Back button */}
        <button onClick={() => navigate('/watch/logistica/veiculos')} className="watch-back">
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Map container */}
        <div className="watch-map-container">
          {loading && validVeiculos.length === 0 ? (
            <div className="loading-indicator">
              <RefreshCw className="w-6 h-6 animate-spin" />
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
              <MapUpdater veiculos={validVeiculos} />
              
              {validVeiculos.map(veiculo => (
                <Marker
                  key={veiculo.id}
                  position={[veiculo.ultima_posicao!.lat, veiculo.ultima_posicao!.lng]}
                  icon={createVehicleIcon(veiculo.status)}
                >
                  <Popup>
                    <div className="vehicle-popup">
                      <strong>{veiculo.placa}</strong>
                      <br />
                      {veiculo.motorista && <span>{veiculo.motorista}<br /></span>}
                      <span>{Math.round(veiculo.ultima_posicao!.velocidade)} km/h</span>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
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

        {/* Route button */}
        {selectedVeiculoId && (
          <button 
            onClick={() => navigate(`/watch/logistica/rota/${selectedVeiculoId}`)} 
            className="route-btn"
          >
            Rota
          </button>
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

        .watch-map-container {
          width: 85%;
          height: 65%;
          border-radius: 50%;
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
          bottom: 20%;
          font-size: clamp(8px, 2.5vw, 11px);
          color: rgba(255, 255, 255, 0.6);
          background: rgba(0, 0, 0, 0.5);
          padding: 2px 10px;
          border-radius: 10px;
        }

        .refresh-btn {
          position: absolute;
          bottom: 8%;
          right: 35%;
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

        .route-btn {
          position: absolute;
          bottom: 8%;
          left: 35%;
          background: rgba(59, 130, 246, 0.3);
          border: 1px solid rgba(59, 130, 246, 0.5);
          border-radius: 20px;
          padding: 6px 12px;
          font-size: clamp(8px, 2.5vw, 11px);
          font-weight: 600;
          color: #3b82f6;
          cursor: pointer;
          z-index: 1000;
        }

        .vehicle-popup {
          font-size: 12px;
          line-height: 1.4;
        }

        .leaflet-container {
          background: #1a1a2e;
        }
      `}</style>
    </div>
  );
};

export default WatchLogisticaMapa;
