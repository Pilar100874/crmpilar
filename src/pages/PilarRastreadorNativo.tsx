import { useState, useEffect, useRef, useCallback } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  MapPin, 
  Navigation, 
  Gauge, 
  Clock, 
  Wifi, 
  WifiOff, 
  Play, 
  Square, 
  Settings,
  Smartphone,
  Battery,
  Signal,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const TRACKING_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rastreamento-posicao`;

interface TrackingStats {
  positionsSent: number;
  lastSentTime: Date | null;
  errors: number;
}

const PilarRastreadorNativo = () => {
  const [deviceId, setDeviceId] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [interval, setInterval] = useState(15);
  const [showConfig, setShowConfig] = useState(false);
  const [stats, setStats] = useState<TrackingStats>({
    positionsSent: 0,
    lastSentTime: null,
    errors: 0
  });
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  
  const watchIdRef = useRef<string | null>(null);
  const pendingPositionsRef = useRef<any[]>([]);
  const intervalRef = useRef<number | null>(null);

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
    loadSavedConfig();
    
    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      flushPendingPositions();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [deviceId]);

  const checkPermissions = async () => {
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location !== 'granted') {
        await Geolocation.requestPermissions();
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      toast.error('Erro ao verificar permissões de localização');
    }
  };

  const loadSavedConfig = () => {
    const savedDeviceId = localStorage.getItem('pilar_device_id');
    const savedInterval = localStorage.getItem('pilar_interval');
    
    if (savedDeviceId) setDeviceId(savedDeviceId);
    if (savedInterval) setInterval(parseInt(savedInterval));
  };

  const saveConfig = () => {
    if (!deviceId) {
      toast.error('Preencha o ID do Veículo');
      return;
    }
    localStorage.setItem('pilar_device_id', deviceId);
    localStorage.setItem('pilar_interval', interval.toString());
    setShowConfig(false);
    toast.success('Configuração salva!');
  };

  const sendPosition = useCallback(async (position: Position) => {
    const payload = {
      id: deviceId,
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      speed: position.coords.speed || 0,
      altitude: position.coords.altitude || 0,
      accuracy: position.coords.accuracy,
      heading: position.coords.heading || 0,
      timestamp: Math.floor(position.timestamp / 1000),
      battery: batteryLevel
    };

    if (!isOnline) {
      pendingPositionsRef.current.push(payload);
      localStorage.setItem('pilar_pending', JSON.stringify(pendingPositionsRef.current));
      return;
    }

    try {
      // Send as GET request with query params (OsmAnd format - no token needed)
      const params = new URLSearchParams({
        id: payload.id,
        lat: payload.lat.toString(),
        lon: payload.lon.toString(),
        speed: payload.speed.toString(),
        bearing: payload.heading.toString(),
        timestamp: payload.timestamp.toString()
      });

      const response = await fetch(`${TRACKING_ENDPOINT}?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setStats(prev => ({
          ...prev,
          positionsSent: prev.positionsSent + 1,
          lastSentTime: new Date()
        }));
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      console.error('Error sending position:', error);
      pendingPositionsRef.current.push(payload);
      setStats(prev => ({ ...prev, errors: prev.errors + 1 }));
    }
  }, [deviceId, isOnline, batteryLevel]);

  const flushPendingPositions = async () => {
    const pending = pendingPositionsRef.current;
    if (pending.length === 0) return;

    for (const payload of pending) {
      try {
        const params = new URLSearchParams({
          id: payload.id,
          lat: payload.lat.toString(),
          lon: payload.lon.toString(),
          speed: (payload.speed || 0).toString(),
          bearing: (payload.heading || 0).toString(),
          timestamp: payload.timestamp.toString()
        });

        await fetch(`${TRACKING_ENDPOINT}?${params.toString()}`, {
          method: 'GET'
        });
        setStats(prev => ({
          ...prev,
          positionsSent: prev.positionsSent + 1,
          lastSentTime: new Date()
        }));
      } catch (error) {
        console.error('Error flushing position:', error);
      }
    }
    pendingPositionsRef.current = [];
    localStorage.removeItem('pilar_pending');
    toast.success(`${pending.length} posições pendentes enviadas`);
  };

  const startTracking = async () => {
    if (!deviceId) {
      toast.error('Configure o ID do Veículo primeiro');
      setShowConfig(true);
      return;
    }

    try {
      const id = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        },
        (position, err) => {
          if (err) {
            console.error('Watch error:', err);
            return;
          }
          if (position) {
            setCurrentPosition(position);
          }
        }
      );
      
      watchIdRef.current = id;

      // Send position at interval
      intervalRef.current = window.setInterval(() => {
        if (currentPosition) {
          sendPosition(currentPosition);
        }
      }, interval * 1000);

      // Get and send first position immediately
      const initialPosition = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000
      });
      setCurrentPosition(initialPosition);
      sendPosition(initialPosition);

      setIsTracking(true);
      toast.success('Rastreamento iniciado!');
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast.error('Erro ao iniciar rastreamento');
    }
  };

  const stopTracking = async () => {
    if (watchIdRef.current) {
      await Geolocation.clearWatch({ id: watchIdRef.current });
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
    toast.info('Rastreamento parado');
  };

  const formatSpeed = (speed: number | null) => {
    if (!speed) return '0 km/h';
    return `${Math.round(speed * 3.6)} km/h`;
  };

  const formatTime = (date: Date | null) => {
    if (!date) return '--:--:--';
    return date.toLocaleTimeString('pt-BR');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-blue-500 rounded-xl flex items-center justify-center">
            <Navigation className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Pilar Rastreador</h1>
            <p className="text-xs text-white/60">
              {deviceId ? `Veículo: ${deviceId}` : 'Não configurado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {batteryLevel !== null && (
            <Badge variant="outline" className="border-white/20 text-white/80">
              <Battery className="w-3 h-3 mr-1" />
              {batteryLevel}%
            </Badge>
          )}
          <Badge 
            variant={isOnline ? "default" : "destructive"}
            className={isOnline ? "bg-green-500" : ""}
          >
            {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Main Control Button */}
        <div className="flex justify-center py-6">
          <button
            onClick={isTracking ? stopTracking : startTracking}
            className={`w-40 h-40 rounded-full flex flex-col items-center justify-center gap-2 transition-all shadow-2xl ${
              isTracking 
                ? 'bg-gradient-to-br from-red-500 to-red-700 animate-pulse' 
                : 'bg-gradient-to-br from-green-400 to-green-600 hover:from-green-500 hover:to-green-700'
            }`}
          >
            {isTracking ? (
              <>
                <Square className="w-12 h-12" />
                <span className="font-bold">PARAR</span>
              </>
            ) : (
              <>
                <Play className="w-12 h-12 ml-2" />
                <span className="font-bold">INICIAR</span>
              </>
            )}
          </button>
        </div>

        {/* Current Position */}
        {currentPosition && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-400" />
                Posição Atual
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-white/60">Latitude</p>
                  <p className="font-mono text-sm">{currentPosition.coords.latitude.toFixed(6)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/60">Longitude</p>
                  <p className="font-mono text-sm">{currentPosition.coords.longitude.toFixed(6)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/60">Velocidade</p>
                  <p className="font-mono text-sm flex items-center gap-1">
                    <Gauge className="w-3 h-3" />
                    {formatSpeed(currentPosition.coords.speed)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-white/60">Precisão</p>
                  <p className="font-mono text-sm flex items-center gap-1">
                    <Signal className="w-3 h-3" />
                    {Math.round(currentPosition.coords.accuracy)}m
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-400">{stats.positionsSent}</p>
                <p className="text-xs text-white/60">Enviadas</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-400">{pendingPositionsRef.current.length}</p>
                <p className="text-xs text-white/60">Pendentes</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-400">{stats.errors}</p>
                <p className="text-xs text-white/60">Erros</p>
              </div>
            </div>
            <div className="mt-4 text-center text-xs text-white/60">
              Último envio: {formatTime(stats.lastSentTime)}
            </div>
          </CardContent>
        </Card>

        {/* Config Panel - Collapsible */}
        <Collapsible open={showConfig} onOpenChange={setShowConfig}>
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CollapsibleTrigger asChild>
              <CardHeader className="pb-2 cursor-pointer">
                <CardTitle className="text-white text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Configuração
                  </div>
                  {showConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white/80">ID do Veículo (Placa ou Código)</Label>
                  <Input
                    value={deviceId}
                    onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
                    placeholder="Ex: ABC1234 ou CAMINHAO-01"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                    disabled={isTracking}
                  />
                  <p className="text-xs text-white/50">
                    Use a mesma placa ou código cadastrado no sistema de veículos
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-white/80">Intervalo de envio: {interval}s</Label>
                  <Slider
                    value={[interval]}
                    onValueChange={(v) => setInterval(v[0])}
                    min={5}
                    max={120}
                    step={5}
                    disabled={isTracking}
                    className="py-2"
                  />
                </div>
                <Button 
                  onClick={saveConfig} 
                  className="w-full bg-green-500 hover:bg-green-600"
                  disabled={isTracking}
                >
                  Salvar Configuração
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm p-4 text-center">
        <p className="text-xs text-white/40">
          <Smartphone className="w-3 h-3 inline mr-1" />
          Pilar Rastreador v2.0 • GPS Nativo Android
        </p>
      </div>
    </div>
  );
};

export default PilarRastreadorNativo;
