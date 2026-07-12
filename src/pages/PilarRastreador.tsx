import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Smartphone, 
  MapPin, 
  Navigation, 
  Play, 
  Square, 
  Settings, 
  Wifi, 
  WifiOff,
  Signal,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type DeviceStatus = 'checking' | 'pending' | 'approved' | 'blocked' | 'not_registered';

const mapDbStatusToInternal = (dbStatus: string): DeviceStatus => {
  switch (dbStatus) {
    case 'aprovado': return 'approved';
    case 'pendente': return 'pending';
    case 'bloqueado': return 'blocked';
    default: return 'not_registered';
  }
};

const TRACKING_ENDPOINT = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/rastreamento-posicao`;

const PilarRastreador: React.FC = () => {
  const [deviceUuid, setDeviceUuid] = useState('');
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>('checking');
  const [veiculoNome, setVeiculoNome] = useState<string | null>(null);
  const [nomeDispositivo, setNomeDispositivo] = useState('');
  const [manualUuid, setManualUuid] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null);
  const [sendInterval, setSendInterval] = useState(30);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [positionsQueue, setPositionsQueue] = useState<any[]>([]);
  const [totalSent, setTotalSent] = useState(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  // Initialize device UUID
  const initializeDeviceUuid = useCallback(async () => {
    let uuid = localStorage.getItem('pilar_device_uuid');
    if (!uuid) {
      uuid = 'DEV-' + crypto.randomUUID().slice(0, 8).toUpperCase();
      localStorage.setItem('pilar_device_uuid', uuid);
    }
    setDeviceUuid(uuid);
    return uuid;
  }, []);

  // Check device status
  const checkDeviceStatus = useCallback(async (uuid?: string) => {
    const currentUuid = uuid || deviceUuid;
    if (!currentUuid) return;

    try {
      const { data: device, error } = await supabase
        .from('dispositivos_rastreamento')
        .select('*')
        .eq('device_uuid', currentUuid)
        .maybeSingle();

      if (error) throw error;

      if (device) {
        setDeviceStatus(mapDbStatusToInternal(device.status));
        setNomeDispositivo(device.nome_dispositivo || '');
        
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

        await supabase
          .from('dispositivos_rastreamento')
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq('id', device.id);
      } else {
        setDeviceStatus('not_registered');
      }
    } catch (error) {
      console.error('Error checking device:', error);
      setDeviceStatus('not_registered');
    }
  }, [deviceUuid]);

  // Register device
  const registerDevice = async () => {
    if (!nomeDispositivo.trim()) {
      toast.error('Digite um nome para o dispositivo');
      return;
    }

    try {
      const { data: existingDevice } = await supabase
        .from('dispositivos_rastreamento')
        .select('id, status')
        .eq('device_uuid', deviceUuid)
        .maybeSingle();

      if (existingDevice) {
        setDeviceStatus(mapDbStatusToInternal(existingDevice.status));
        toast.info('Dispositivo já está registrado');
        return;
      }

      const { error } = await supabase
        .from('dispositivos_rastreamento')
        .insert({
          device_uuid: deviceUuid,
          nome_dispositivo: nomeDispositivo.trim(),
          modelo: navigator.userAgent.slice(0, 100),
          plataforma: 'web',
          status: 'pendente'
        });

      if (error) {
        if (error.code === '23505') {
          await checkDeviceStatus();
          toast.info('Dispositivo já registrado');
          return;
        }
        throw error;
      }

      setDeviceStatus('pending');
      toast.success('Dispositivo registrado! Aguardando liberação do administrador.');
    } catch (error) {
      console.error('Error registering device:', error);
      toast.error('Erro ao registrar dispositivo');
    }
  };

  // Use manual UUID
  const useManualUuid = async () => {
    const trimmed = manualUuid.trim().toUpperCase();
    if (!trimmed) {
      toast.error('Digite o ID do dispositivo');
      return;
    }

    try {
      const { data: device, error } = await supabase
        .from('dispositivos_rastreamento')
        .select('*')
        .eq('device_uuid', trimmed)
        .maybeSingle();

      if (error) {
        toast.error(`Erro na busca: ${error.message}`);
        return;
      }

      if (!device) {
        const { data: devices } = await supabase
          .from('dispositivos_rastreamento')
          .select('*')
          .ilike('device_uuid', trimmed);
        
        if (devices && devices.length > 0) {
          const foundDevice = devices[0];
          localStorage.setItem('pilar_device_uuid', foundDevice.device_uuid);
          setDeviceUuid(foundDevice.device_uuid);
          setDeviceStatus(mapDbStatusToInternal(foundDevice.status));
          setNomeDispositivo(foundDevice.nome_dispositivo || '');
          setShowManualInput(false);
          setManualUuid('');
          toast.success('ID aplicado com sucesso!');
          return;
        }
        
        toast.error(`Dispositivo não encontrado: ${trimmed}`);
        return;
      }

      localStorage.setItem('pilar_device_uuid', device.device_uuid);
      setDeviceUuid(device.device_uuid);
      setDeviceStatus(mapDbStatusToInternal(device.status));
      setNomeDispositivo(device.nome_dispositivo || '');
      setShowManualInput(false);
      setManualUuid('');
      
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
      
      toast.success('ID aplicado com sucesso!');
    } catch (error) {
      console.error('Error applying manual UUID:', error);
      toast.error('Erro ao aplicar ID');
    }
  };

  useEffect(() => {
    const init = async () => {
      const uuid = await initializeDeviceUuid();
      setIsInitialized(true);
      await checkDeviceStatus(uuid);
    };
    init();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      stopTracking();
    };
  }, [initializeDeviceUuid]);

  // Periodic status check
  useEffect(() => {
    if (!isInitialized || !deviceUuid) return;
    const statusInterval = window.setInterval(() => checkDeviceStatus(), 30000);
    return () => clearInterval(statusInterval);
  }, [isInitialized, deviceUuid, checkDeviceStatus]);

  // Send queued positions when online
  useEffect(() => {
    if (isOnline && positionsQueue.length > 0) {
      const sendQueued = async () => {
        const queue = [...positionsQueue];
        setPositionsQueue([]);
        
        for (const payload of queue) {
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
            setTotalSent(prev => prev + 1);
          } catch (error) {
            console.error('Error sending queued position:', error);
          }
        }
        
        if (queue.length > 0) {
          toast.success(`${queue.length} posições pendentes enviadas`);
        }
      };
      sendQueued();
    }
  }, [isOnline, positionsQueue]);

  const sendPosition = useCallback(async (position: GeolocationPosition) => {
    const { data: device } = await supabase
      .from('dispositivos_rastreamento')
      .select('veiculo_id')
      .eq('device_uuid', deviceUuid)
      .single();

    if (!device?.veiculo_id) {
      console.log('No vehicle linked to device');
      return;
    }

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
      speed: position.coords.speed ? position.coords.speed * 3.6 : 0,
      bearing: position.coords.heading || 0,
      altitude: position.coords.altitude || 0,
      accuracy: position.coords.accuracy,
      timestamp: Math.floor(position.timestamp / 1000)
    };

    if (!isOnline) {
      setPositionsQueue(prev => [...prev, payload]);
      return;
    }

    try {
      const params = new URLSearchParams({
        id: payload.id,
        lat: payload.lat.toString(),
        lon: payload.lon.toString(),
        speed: payload.speed.toString(),
        bearing: payload.bearing.toString(),
        timestamp: payload.timestamp.toString()
      });

      const response = await fetch(`${TRACKING_ENDPOINT}?${params.toString()}`, {
        method: 'GET'
      });

      if (response.ok) {
        setLastSentTime(new Date());
        setTotalSent(prev => prev + 1);
      } else {
        setPositionsQueue(prev => [...prev, payload]);
      }
    } catch (error) {
      console.error('Error sending position:', error);
      setPositionsQueue(prev => [...prev, payload]);
    }
  }, [deviceUuid, isOnline]);

  const startTracking = () => {
    if (deviceStatus !== 'approved') {
      toast.error('Dispositivo não está liberado para rastreamento');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste dispositivo');
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition(position);
        setAccuracy(position.coords.accuracy);
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Erro ao obter localização: ' + error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0
      }
    );

    intervalRef.current = setInterval(() => {
      if (currentPosition) {
        sendPosition(currentPosition);
      }
    }, sendInterval * 1000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition(position);
        sendPosition(position);
      },
      (error) => console.error('Error getting initial position:', error),
      { enableHighAccuracy: true }
    );

    setIsTracking(true);
    toast.success('Rastreamento iniciado');
  };

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsTracking(false);
  };

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        toast.success('App instalado com sucesso!');
      }
      setDeferredPrompt(null);
      setCanInstall(false);
    }
  };

  const getStatusBadge = () => {
    switch (deviceStatus) {
      case 'checking':
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Verificando...</Badge>;
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Liberado</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-white"><AlertCircle className="h-3 w-3 mr-1" />Aguardando liberação</Badge>;
      case 'blocked':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Bloqueado</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Não registrado</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 sm:p-6 lg:p-10 overflow-x-hidden">
      <div className="w-full max-w-md sm:max-w-2xl lg:max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="text-center pt-2 sm:pt-6 pb-2">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground mb-3 shadow-lg">
            <Navigation className="h-8 w-8 sm:h-10 sm:w-10" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Pilar Rastreador</h1>
          <p className="text-muted-foreground text-sm sm:text-base">GPS Tracker para Logística</p>
        </div>

        {/* Device Status Card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Badge variant="default" className="bg-green-500">
                    <Wifi className="h-3 w-3 mr-1" />Online
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <WifiOff className="h-3 w-3 mr-1" />Offline
                  </Badge>
                )}
                {positionsQueue.length > 0 && (
                  <Badge variant="outline">{positionsQueue.length} pendentes</Badge>
                )}
              </div>
              {getStatusBadge()}
            </div>

            {/* Show UUID */}
            {deviceUuid && (
              <div className="bg-muted/50 rounded-lg p-2 mb-4 border">
                <p className="text-muted-foreground text-xs">ID do dispositivo:</p>
                <p className="font-mono text-sm break-all">{deviceUuid}</p>
              </div>
            )}

            {/* Not Registered State */}
            {deviceStatus === 'not_registered' && (
              <div className="space-y-4">
                {!showManualInput ? (
                  <>
                    <p className="text-muted-foreground text-sm">
                      Este dispositivo ainda não está registrado. Registre como novo ou use um ID já aprovado.
                    </p>
                    <div className="space-y-2">
                      <Label>Nome do Dispositivo</Label>
                      <Input
                        value={nomeDispositivo}
                        onChange={(e) => setNomeDispositivo(e.target.value)}
                        placeholder="Ex: Celular do João"
                      />
                    </div>
                    <Button onClick={registerDevice} className="w-full">
                      Registrar Novo Dispositivo
                    </Button>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs">
                        <span className="bg-background px-2 text-muted-foreground">ou</span>
                      </div>
                    </div>
                    <Button variant="outline" onClick={() => setShowManualInput(true)} className="w-full">
                      Já tenho um ID registrado
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>ID do Dispositivo</Label>
                      <Input
                        value={manualUuid}
                        onChange={(e) => setManualUuid(e.target.value)}
                        placeholder="DEV-XXXXXXXX"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={useManualUuid} className="flex-1">OK</Button>
                      <Button variant="outline" onClick={() => { setShowManualInput(false); setManualUuid(''); }}>
                        Cancelar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Pending State */}
            {deviceStatus === 'pending' && (
              <div className="text-center py-4">
                <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
                <p className="font-medium">Aguardando liberação</p>
                <p className="text-sm text-muted-foreground">
                  Um administrador precisa aprovar este dispositivo.
                </p>
                <Button variant="outline" size="sm" onClick={() => checkDeviceStatus()} className="mt-3">
                  <RefreshCw className="h-4 w-4 mr-2" />Verificar status
                </Button>
              </div>
            )}

            {/* Blocked State */}
            {deviceStatus === 'blocked' && (
              <div className="text-center py-4">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
                <p className="font-medium">Dispositivo bloqueado</p>
                <p className="text-sm text-muted-foreground">
                  Entre em contato com o administrador.
                </p>
              </div>
            )}

            {/* Approved State - Show tracking controls */}
            {deviceStatus === 'approved' && (
              <>
                {veiculoNome && (
                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-3 mb-4 border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-600 dark:text-green-400">Veículo vinculado:</p>
                    <p className="font-medium text-green-700 dark:text-green-300">{veiculoNome}</p>
                  </div>
                )}

                {currentPosition && (
                  <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-2">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span className="font-mono text-xs break-all min-w-0">
                        {currentPosition.coords.latitude.toFixed(6)}, {currentPosition.coords.longitude.toFixed(6)}
                      </span>
                    </div>
                    {accuracy && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Signal className="h-3 w-3" />
                        Precisão: {accuracy.toFixed(0)}m
                      </div>
                    )}
                    {currentPosition.coords.speed !== null && (
                      <div className="text-xs text-muted-foreground">
                        Velocidade: {(currentPosition.coords.speed * 3.6).toFixed(1)} km/h
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-primary">{totalSent}</div>
                    <div className="text-xs text-muted-foreground">Posições enviadas</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-3 text-center">
                    <div className="text-sm font-medium">
                      {lastSentTime ? lastSentTime.toLocaleTimeString() : '--:--:--'}
                    </div>
                    <div className="text-xs text-muted-foreground">Último envio</div>
                  </div>
                </div>

                <Button 
                  className="w-full h-14 text-lg"
                  variant={isTracking ? "destructive" : "default"}
                  onClick={isTracking ? stopTracking : startTracking}
                >
                  {isTracking ? (
                    <><Square className="h-5 w-5 mr-2" />Parar Rastreamento</>
                  ) : (
                    <><Play className="h-5 w-5 mr-2" />Iniciar Rastreamento</>
                  )}
                </Button>

                {/* Config Collapsible */}
                <Collapsible open={showConfig} onOpenChange={setShowConfig} className="mt-4">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full">
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4 space-y-4">
                    <div>
                      <Label>Intervalo de envio: {sendInterval}s</Label>
                      <Slider
                        value={[sendInterval]}
                        onValueChange={(v) => setSendInterval(v[0])}
                        min={5}
                        max={120}
                        step={5}
                        disabled={isTracking}
                        className="mt-2"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </CardContent>
        </Card>

        {/* Install PWA */}
        {canInstall && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Instalar App</div>
                  <div className="text-xs text-muted-foreground">
                    Adicione à tela inicial para acesso rápido
                  </div>
                </div>
                <Button size="sm" onClick={installPWA}>Instalar</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>Pilar Rastreador v2.0</p>
          <p>Sistema de Logística Pilar</p>
        </div>
      </div>
    </div>
  );
};

export default PilarRastreador;
