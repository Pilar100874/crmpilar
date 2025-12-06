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
  Battery,
  Signal,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';

const PilarRastreador: React.FC = () => {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [token, setToken] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string>('');
  const [isTracking, setIsTracking] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<GeolocationPosition | null>(null);
  const [lastSentTime, setLastSentTime] = useState<Date | null>(null);
  const [sendInterval, setSendInterval] = useState(30); // seconds
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [positionsQueue, setPositionsQueue] = useState<any[]>([]);
  const [totalSent, setTotalSent] = useState(0);
  const [copied, setCopied] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const SUPABASE_URL = 'https://ioxugupvxlcdweldocmq.supabase.co';
  const TRACKING_ENDPOINT = `${SUPABASE_URL}/functions/v1/rastreamento-posicao`;
  
  // PWA install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    // Load saved config
    const savedToken = localStorage.getItem('pilar_rastreador_token');
    const savedDeviceId = localStorage.getItem('pilar_rastreador_device_id');
    const savedInterval = localStorage.getItem('pilar_rastreador_interval');
    
    if (savedToken) setToken(savedToken);
    if (savedDeviceId) setDeviceId(savedDeviceId);
    if (savedInterval) setSendInterval(parseInt(savedInterval));

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // PWA install event
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    fetchEstabelecimento();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      stopTracking();
    };
  }, []);

  const fetchEstabelecimento = async () => {
    try {
      const estabId = await getEstabelecimentoId();
      if (estabId) {
        setEstabelecimentoId(estabId);
        // Try to fetch token from config
        const { data } = await supabase
          .from('logistica_config')
          .select('token_rastreamento')
          .eq('estabelecimento_id', estabId)
          .maybeSingle();
        
        if (data?.token_rastreamento && !token) {
          setToken(data.token_rastreamento);
          localStorage.setItem('pilar_rastreador_token', data.token_rastreamento);
        }
      }
    } catch (error) {
      console.error('Error fetching estabelecimento:', error);
    }
  };

  const saveConfig = () => {
    localStorage.setItem('pilar_rastreador_token', token);
    localStorage.setItem('pilar_rastreador_device_id', deviceId);
    localStorage.setItem('pilar_rastreador_interval', sendInterval.toString());
    toast.success('Configurações salvas');
  };

  const sendPosition = useCallback(async (position: GeolocationPosition) => {
    if (!token || !deviceId) {
      console.log('Missing token or device ID');
      return;
    }

    const payload = {
      id: deviceId,
      lat: position.coords.latitude,
      lon: position.coords.longitude,
      speed: position.coords.speed ? position.coords.speed * 3.6 : 0, // m/s to km/h
      bearing: position.coords.heading || 0,
      altitude: position.coords.altitude || 0,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp
    };

    if (!isOnline) {
      // Queue for later
      setPositionsQueue(prev => [...prev, payload]);
      return;
    }

    try {
      const response = await fetch(`${TRACKING_ENDPOINT}?token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setLastSentTime(new Date());
        setTotalSent(prev => prev + 1);
      } else {
        console.error('Error sending position:', await response.text());
        // Queue for retry
        setPositionsQueue(prev => [...prev, payload]);
      }
    } catch (error) {
      console.error('Error sending position:', error);
      setPositionsQueue(prev => [...prev, payload]);
    }
  }, [token, deviceId, isOnline]);

  // Send queued positions when online
  useEffect(() => {
    if (isOnline && positionsQueue.length > 0) {
      const sendQueued = async () => {
        const queue = [...positionsQueue];
        setPositionsQueue([]);
        
        for (const payload of queue) {
          try {
            await fetch(`${TRACKING_ENDPOINT}?token=${token}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
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
  }, [isOnline, positionsQueue, token]);

  const startTracking = () => {
    if (!token || !deviceId) {
      toast.error('Configure o token e ID do dispositivo primeiro');
      return;
    }

    if (!navigator.geolocation) {
      toast.error('Geolocalização não suportada neste dispositivo');
      return;
    }

    // Request permission and start watching
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

    // Send position at interval
    intervalRef.current = setInterval(() => {
      if (currentPosition) {
        sendPosition(currentPosition);
      }
    }, sendInterval * 1000);

    // Send first position immediately
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
    toast.info('Rastreamento parado');
  };

  const copyEndpoint = async () => {
    const url = `${TRACKING_ENDPOINT}?token=${token}&id=${deviceId}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('URL copiada');
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="text-center pt-4 pb-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground mb-3 shadow-lg">
            <Navigation className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">Pilar Rastreador</h1>
          <p className="text-muted-foreground text-sm">GPS Tracker para Logística</p>
        </div>

        {/* Status Card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Badge variant="default" className="bg-green-500">
                    <Wifi className="h-3 w-3 mr-1" />
                    Online
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Offline
                  </Badge>
                )}
                {positionsQueue.length > 0 && (
                  <Badge variant="outline">
                    {positionsQueue.length} pendentes
                  </Badge>
                )}
              </div>
              <Badge variant={isTracking ? "default" : "secondary"}>
                {isTracking ? 'Rastreando' : 'Parado'}
              </Badge>
            </div>

            {/* Current Position */}
            {currentPosition && (
              <div className="bg-muted/50 rounded-lg p-3 mb-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span className="font-mono text-xs">
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

            {/* Stats */}
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

            {/* Control Button */}
            <Button 
              className="w-full h-14 text-lg"
              variant={isTracking ? "destructive" : "default"}
              onClick={isTracking ? stopTracking : startTracking}
              disabled={!token || !deviceId}
            >
              {isTracking ? (
                <>
                  <Square className="h-5 w-5 mr-2" />
                  Parar Rastreamento
                </>
              ) : (
                <>
                  <Play className="h-5 w-5 mr-2" />
                  Iniciar Rastreamento
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configuração
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Token de Autenticação</Label>
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Cole o token aqui"
                disabled={isTracking}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Obtenha o token em Logística → Configuração
              </p>
            </div>

            <div>
              <Label>ID do Dispositivo</Label>
              <Input
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                placeholder="Ex: celular-joao-01"
                disabled={isTracking}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Mesmo ID cadastrado no sistema de veículos
              </p>
            </div>

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

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={saveConfig}
              disabled={isTracking}
            >
              Salvar Configuração
            </Button>

            {token && deviceId && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full" 
                onClick={copyEndpoint}
              >
                {copied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Copiar URL do Endpoint
              </Button>
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
                <Button size="sm" onClick={installPWA}>
                  Instalar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pb-4">
          <p>Pilar Rastreador v1.0</p>
          <p>Sistema de Logística Pilar</p>
        </div>
      </div>
    </div>
  );
};

export default PilarRastreador;
