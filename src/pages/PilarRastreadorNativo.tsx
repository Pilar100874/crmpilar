import { useState, useEffect, useRef, useCallback } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }
}
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
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";

const TRACKING_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rastreamento-posicao`;

interface TrackingStats {
  positionsSent: number;
  lastSentTime: Date | null;
  errors: number;
}

type DeviceStatus = 'checking' | 'pending' | 'approved' | 'blocked' | 'not_registered';

const PilarRastreadorNativo = () => {
  const [deviceUuid, setDeviceUuid] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('checking');
  const [veiculoNome, setVeiculoNome] = useState<string | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<Position | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [interval, setIntervalValue] = useState(15);
  const [showConfig, setShowConfig] = useState(false);
  const [stats, setStats] = useState<TrackingStats>({
    positionsSent: 0,
    lastSentTime: null,
    errors: 0
  });
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [nomeDispositivo, setNomeDispositivo] = useState('');
  
  const watchIdRef = useRef<string | null>(null);
  const pendingPositionsRef = useRef<any[]>([]);
  const intervalRef = useRef<number | null>(null);

  // Generate unique device ID
  const generateDeviceUuid = () => {
    let uuid = localStorage.getItem('pilar_device_uuid');
    if (!uuid) {
      uuid = 'DEV-' + crypto.randomUUID().slice(0, 8).toUpperCase();
      localStorage.setItem('pilar_device_uuid', uuid);
    }
    return uuid;
  };

  // Check device status and auto-register
  const checkDeviceStatus = useCallback(async () => {
    const uuid = generateDeviceUuid();
    setDeviceUuid(uuid);

    try {
      // Check if device exists
      const { data: device, error } = await supabase
        .from('dispositivos_rastreamento')
        .select('*')
        .eq('device_uuid', uuid)
        .maybeSingle();

      if (error) throw error;

      if (device) {
        setDeviceStatus(device.status as DeviceStatus);
        setNomeDispositivo(device.nome_dispositivo || '');
        
        // Fetch vehicle info if linked
        if (device.veiculo_id) {
          const { data: veiculo } = await supabase
            .from('veiculos')
            .select('placa, descricao')
            .eq('id', device.veiculo_id)
            .single();
          
          if (veiculo) {
            setVeiculoNome(`${veiculo.placa} - ${veiculo.descricao || ''}`);
          }
        }

        // Update last access
        await supabase
          .from('dispositivos_rastreamento')
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq('id', device.id);
      } else {
        // Auto-register new device
        setDeviceStatus('not_registered');
      }
    } catch (error) {
      console.error('Error checking device:', error);
      setDeviceStatus('not_registered');
    }
  }, []);

  // Register device
  const registerDevice = async () => {
    if (!nomeDispositivo.trim()) {
      toast.error('Digite um nome para o dispositivo');
      return;
    }

    try {
      const { error } = await supabase
        .from('dispositivos_rastreamento')
        .insert({
          device_uuid: deviceUuid,
          nome_dispositivo: nomeDispositivo.trim(),
          modelo: navigator.userAgent.slice(0, 100),
          plataforma: /android/i.test(navigator.userAgent) ? 'android' : 
                      /iphone|ipad/i.test(navigator.userAgent) ? 'ios' : 'web',
          status: 'pendente'
        });

      if (error) throw error;

      setDeviceStatus('pending');
      toast.success('Dispositivo registrado! Aguardando liberação do administrador.');
    } catch (error) {
      console.error('Error registering device:', error);
      toast.error('Erro ao registrar dispositivo');
    }
  };

  // Check permissions on mount
  useEffect(() => {
    checkPermissions();
    checkDeviceStatus();
    
    // Battery API
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      });
    }

    // Periodic status check
    const statusInterval = window.setInterval(checkDeviceStatus, 30000);
    return () => clearInterval(statusInterval);
  }, [checkDeviceStatus]);

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
  }, []);

  const checkPermissions = async () => {
    try {
      // Check if we're in a native Capacitor environment
      const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
      
      if (isNative) {
        try {
          const permission = await Geolocation.checkPermissions();
          if (permission.location !== 'granted') {
            await Geolocation.requestPermissions();
          }
          return;
        } catch (capacitorError) {
          console.log('Capacitor Geolocation not available, using web fallback');
        }
      }
      
      // Web browser fallback - use Permissions API first
      if ('permissions' in navigator) {
        try {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          console.log('Geolocation permission status:', result.state);
          if (result.state === 'granted') return;
        } catch (e) {
          console.log('Permissions API not supported');
        }
      }
      
      // If permission not yet granted, trigger the browser prompt
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => console.log('Geolocation permission granted'),
          (err) => console.log('Geolocation error:', err.message),
          { timeout: 10000, enableHighAccuracy: false }
        );
      }
    } catch (error) {
      console.error('Error checking permissions:', error);
      // Don't show error toast - this is not critical, tracking will request permission when started
    }
  };

  const sendPosition = useCallback(async (position: Position) => {
    // Get vehicle ID from device registration
    const { data: device } = await supabase
      .from('dispositivos_rastreamento')
      .select('veiculo_id')
      .eq('device_uuid', deviceUuid)
      .single();

    if (!device?.veiculo_id) {
      console.log('No vehicle linked to device');
      return;
    }

    // Fetch vehicle details
    const { data: veiculo } = await supabase
      .from('veiculos')
      .select('traccar_device_id, placa')
      .eq('id', device.veiculo_id)
      .single();

    const vehicleId = veiculo?.traccar_device_id || veiculo?.placa || device.veiculo_id;

    const payload = {
      id: vehicleId,
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
        headers: { 'Content-Type': 'application/json' }
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
  }, [deviceUuid, isOnline, batteryLevel]);

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

        await fetch(`${TRACKING_ENDPOINT}?${params.toString()}`, { method: 'GET' });
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
    if (deviceStatus !== 'approved') {
      toast.error('Dispositivo não está liberado para rastreamento');
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

      intervalRef.current = window.setInterval(() => {
        if (currentPosition) {
          sendPosition(currentPosition);
        }
      }, interval * 1000);

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

  const getStatusBadge = () => {
    switch (deviceStatus) {
      case 'checking':
        return <Badge className="bg-gray-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Verificando...</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />Aguardando liberação</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Liberado</Badge>;
      case 'blocked':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Bloqueado</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Não registrado</Badge>;
    }
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
              {veiculoNome || deviceUuid}
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
          <Badge variant={isOnline ? "default" : "destructive"} className={isOnline ? "bg-green-500" : ""}>
            {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">Status do Dispositivo</span>
              {getStatusBadge()}
            </div>
            {veiculoNome && (
              <div className="mt-2 text-sm text-white/60">
                Veículo: <span className="text-white font-medium">{veiculoNome}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Form - only show if not registered */}
        {deviceStatus === 'not_registered' && (
          <Card className="bg-white/10 backdrop-blur-sm border-white/20">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                Registrar Dispositivo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-white/70 text-sm">
                Este dispositivo ainda não está registrado. Digite um nome para identificá-lo e aguarde a liberação do administrador.
              </p>
              <div className="space-y-2">
                <Label className="text-white/80">Nome do Dispositivo</Label>
                <Input
                  value={nomeDispositivo}
                  onChange={(e) => setNomeDispositivo(e.target.value)}
                  placeholder="Ex: Celular do João"
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/40"
                />
              </div>
              <Button onClick={registerDevice} className="w-full bg-green-500 hover:bg-green-600">
                Registrar Dispositivo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending Message */}
        {deviceStatus === 'pending' && (
          <Card className="bg-yellow-500/20 backdrop-blur-sm border-yellow-500/30">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Aguardando Liberação</p>
                  <p className="text-white/70 text-sm mt-1">
                    O administrador precisa aprovar este dispositivo e vinculá-lo a um veículo antes de iniciar o rastreamento.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Blocked Message */}
        {deviceStatus === 'blocked' && (
          <Card className="bg-red-500/20 backdrop-blur-sm border-red-500/30">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                <div>
                  <p className="text-white font-medium">Dispositivo Bloqueado</p>
                  <p className="text-white/70 text-sm mt-1">
                    Este dispositivo foi bloqueado pelo administrador. Entre em contato para mais informações.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Control Button - only for approved devices */}
        {deviceStatus === 'approved' && (
          <>
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

            {/* Config Panel */}
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
                      <Label className="text-white/80">Intervalo de envio: {interval}s</Label>
                      <Slider
                        value={[interval]}
                        onValueChange={(v) => setIntervalValue(v[0])}
                        min={5}
                        max={120}
                        step={5}
                        disabled={isTracking}
                        className="py-2"
                      />
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/30 backdrop-blur-sm p-4 text-center">
        <p className="text-xs text-white/40">
          <Smartphone className="w-3 h-3 inline mr-1" />
          Pilar Rastreador v2.0 • ID: {deviceUuid}
        </p>
      </div>
    </div>
  );
};

export default PilarRastreadorNativo;
