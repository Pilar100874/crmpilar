import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ArrowLeft, Car, Gauge, Clock, MapPin, AlertTriangle, 
  Wifi, WifiOff, Activity, ChevronDown, ChevronUp, 
  Bell, BellOff, Volume2, RefreshCw, Eye, Maximize2, Minimize2, List, MessageCircle, User, Pin
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { VeiculoComStatus, VeiculoPosicao, VeiculoStatus } from '@/types/logistica';
import { ParadaMarcada } from '@/types/automacaoLogistica';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { executarAutomacoesLogistica, limparParadasAntigas } from '@/services/logisticaAutomacaoExecutor';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { fetchMotoristasAtuais, formatWhatsappNumber } from '@/lib/logistica/cvDriverLookup';
import { GrupoFilterSelect } from '@/components/logistica/GrupoFilterSelect';
import { useGrupoFilter, filterByGrupo } from '@/lib/logistica/grupoFilter';
import { FocusLegend } from '@/components/logistica/FocusLegend';
import { VehicleLegend } from '@/components/logistica/VehicleLegend';
const statusConfig = {
  movendo: { label: 'Em movimento', color: 'bg-green-500', textColor: 'text-green-600', borderColor: 'border-green-500' },
  parado: { label: 'Parado', color: 'bg-amber-500', textColor: 'text-amber-600', borderColor: 'border-amber-500' },
  offline: { label: 'Offline', color: 'bg-gray-400', textColor: 'text-gray-500', borderColor: 'border-gray-400' }
};

interface AlertConfig {
  speedLimit: number;
  stoppedMinutes: number;
  offlineMinutes: number;
}

interface VehicleAlert {
  veiculoId: string;
  placa: string;
  type: 'speed' | 'stopped' | 'offline';
  message: string;
  timestamp: Date;
}

interface LogisticaMonitoramentoProps {
  embedded?: boolean;
}

const LogisticaMonitoramento: React.FC<LogisticaMonitoramentoProps> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const [veiculos, setVeiculos] = useState<VeiculoComStatus[]>([]);
  const [paradasMarcadas, setParadasMarcadas] = useState<ParadaMarcada[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVeiculoId, setSelectedVeiculoId] = useState<string | null>(null);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [alerts, setAlerts] = useState<VehicleAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [mobileVehicleListOpen, setMobileVehicleListOpen] = useState(false);
  const [mobileAlertsOpen, setMobileAlertsOpen] = useState(false);
  const [focusVehicle, setFocusVehicle] = useState<{ id: string; nonce: number } | null>(null);
  const [pinnedVeiculoId, setPinnedVeiculoId] = useState<string | null>(null);
  const zoomToVehicle = useCallback((id: string) => {
    setSelectedVeiculoId(id);
    setFocusVehicle({ id, nonce: Date.now() });
  }, []);
  const togglePin = useCallback((id: string) => {
    setPinnedVeiculoId(prev => {
      const next = prev === id ? null : id;
      if (next) {
        setSelectedVeiculoId(next);
        setFocusVehicle({ id: next, nonce: Date.now() });
      }
      return next;
    });
  }, []);
  const showAll = useCallback(() => {
    setPinnedVeiculoId(null);
    setFocusVehicle(null);
    setSelectedVeiculoId(null);
  }, []);
  
  const alertConfig: AlertConfig = {
    speedLimit: 120,
    stoppedMinutes: 30,
    offlineMinutes: 15
  };

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch estabelecimento ID on mount
  useEffect(() => {
    const fetchEstabelecimento = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
    };
    fetchEstabelecimento();
  }, []);

  const fetchParadasMarcadas = useCallback(async () => {
    if (!estabelecimentoId) return;
    
    const { data, error } = await supabase
      .from('logistica_paradas_marcadas')
      .select(`
        *,
        veiculo:veiculos(placa, descricao)
      `)
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativa', true)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setParadasMarcadas((data || []) as unknown as ParadaMarcada[]);
    }
  }, [estabelecimentoId]);

  const fetchVeiculos = useCallback(async () => {
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
          let status: VeiculoStatus = 'offline';

          if (ultimaPosicao) {
            const minutosDesdeUltima = differenceInMinutes(new Date(), new Date(ultimaPosicao.data_hora));
            if (minutosDesdeUltima < 10) {
              status = ultimaPosicao.velocidade > 5 ? 'movendo' : 'parado';
            }
          }

          return {
            ...veiculo,
            status,
            ultima_posicao: ultimaPosicao,
            ultima_atualizacao: ultimaPosicao?.data_hora
          } as VeiculoComStatus;
        })
      );

      // Enriquece com motorista atual (baseado em cv_vehicle_movements).
      // Falhas aqui NÃO devem quebrar o rastreamento — o veículo aparece
      // normalmente mesmo sem vínculo com Controle de Veículos, apenas sem nome do motorista.
      try {
        const motoristasMap = await fetchMotoristasAtuais(veiculosComStatus.map(v => v.id));
        for (const v of veiculosComStatus) {
          v.motorista_atual = motoristasMap[v.id] ?? null;
        }
      } catch (e) {
        console.warn('Falha ao buscar motoristas atuais (rastreio segue normalmente)', e);
      }

      setVeiculos(veiculosComStatus);
      setLastUpdate(new Date());
      checkAlerts(veiculosComStatus);

      // Execute automations after fetching vehicles
      if (estabelecimentoId) {
        const resultados = await executarAutomacoesLogistica(veiculosComStatus, estabelecimentoId);
        
        // Get list of vehicles that triggered automations
        const veiculosComMarcacao = resultados.map(r => r.veiculo_id);
        
        // Clean up markers for vehicles that no longer meet conditions
        await limparParadasAntigas(veiculosComMarcacao, estabelecimentoId);
        
        // Refresh paradas marcadas
        await fetchParadasMarcadas();
        
        if (resultados.length > 0) {
          console.log(`✅ ${resultados.length} marcações de automação executadas`);
        }
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  }, [alertConfig, estabelecimentoId, fetchParadasMarcadas]);

  const checkAlerts = (veiculosData: VeiculoComStatus[]) => {
    if (!alertsEnabled) return;

    const newAlerts: VehicleAlert[] = [];

    veiculosData.forEach(v => {
      if (v.ultima_posicao) {
        // Speed alert
        if (v.ultima_posicao.velocidade > alertConfig.speedLimit) {
          newAlerts.push({
            veiculoId: v.id,
            placa: v.placa,
            type: 'speed',
            message: `Velocidade: ${Math.round(v.ultima_posicao.velocidade)} km/h`,
            timestamp: new Date()
          });
        }

        // Stopped alert
        if (v.status === 'parado') {
          const minutosParado = differenceInMinutes(new Date(), new Date(v.ultima_posicao.data_hora));
          if (minutosParado >= alertConfig.stoppedMinutes) {
            newAlerts.push({
              veiculoId: v.id,
              placa: v.placa,
              type: 'stopped',
              message: `Parado há ${minutosParado} minutos`,
              timestamp: new Date()
            });
          }
        }
      }

      // Offline alert
      if (v.status === 'offline' && v.ultima_posicao) {
        const minutosOffline = differenceInMinutes(new Date(), new Date(v.ultima_posicao.data_hora));
        if (minutosOffline >= alertConfig.offlineMinutes) {
          newAlerts.push({
            veiculoId: v.id,
            placa: v.placa,
            type: 'offline',
            message: `Sem sinal há ${minutosOffline} minutos`,
            timestamp: new Date()
          });
        }
      }
    });

    if (newAlerts.length > 0 && soundEnabled) {
      playAlertSound();
    }

    setAlerts(prev => [...newAlerts, ...prev].slice(0, 50));
  };

  const playAlertSound = () => {
    if (audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    fetchVeiculos();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchVeiculos, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchVeiculos]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('veiculo-posicoes-monitor')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'veiculo_posicoes'
        },
        () => {
          fetchVeiculos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVeiculos]);

  const { grupoId, setGrupoId, unidades } = useGrupoFilter(estabelecimentoId);
  const veiculosFiltrados = filterByGrupo(veiculos, grupoId);
  const veiculosComPosicao = veiculosFiltrados.filter(v => v.ultima_posicao);
  const selectedVeiculo = veiculosFiltrados.find(v => v.id === selectedVeiculoId);

  // Follow mode: recentraliza no veículo fixado sempre que houver nova posição
  useEffect(() => {
    if (!pinnedVeiculoId) return;
    setFocusVehicle({ id: pinnedVeiculoId, nonce: Date.now() });
  }, [pinnedVeiculoId, veiculos]);

  const stats = {
    total: veiculosFiltrados.length,
    movendo: veiculosFiltrados.filter(v => v.status === 'movendo').length,
    parado: veiculosFiltrados.filter(v => v.status === 'parado').length,
    offline: veiculosFiltrados.filter(v => v.status === 'offline').length
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'speed': return <Gauge className="h-4 w-4 text-red-500" />;
      case 'stopped': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'offline': return <WifiOff className="h-4 w-4 text-gray-500" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  // Fullscreen map rendering
  if (mapFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-background">
        {/* Map fills entire screen */}
        <div className="absolute inset-0">
          {loading ? (
            <div className="h-full w-full flex items-center justify-center bg-muted/50">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : veiculosComPosicao.length === 0 ? (
            <div className="h-full w-full flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum veículo com posição</p>
              </div>
            </div>
          ) : (
            <>
              <LazyLogisticaMap
                veiculos={veiculosComPosicao}
                paradasMarcadas={paradasMarcadas}
                onVeiculoClick={(v) => zoomToVehicle(v.id)}
                focusVeiculoId={focusVehicle?.id}
                focusTrigger={focusVehicle?.nonce}
                className="absolute inset-0"
                fitBounds={!pinnedVeiculoId}
              />
              <FocusLegend
                veiculo={focusVehicle ? veiculosComPosicao.find(v => v.id === focusVehicle.id) : undefined}
                onClose={() => setFocusVehicle(null)}
              />
              <VehicleLegend
                veiculos={veiculosComPosicao}
                selectedId={focusVehicle?.id ?? selectedVeiculoId}
                onVeiculoClick={zoomToVehicle}
              />
            </>
          )}
          
          {/* Exit fullscreen button */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-[10px] top-[82px] z-[10000] h-[30px] w-[30px] bg-background border-2 border-[rgba(0,0,0,0.2)] shadow-none hover:bg-accent rounded-sm"
            onClick={() => setMapFullscreen(false)}
            title="Sair do modo expandido"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Hidden audio element for alerts */}
        <audio ref={audioRef} src="/notification.mp3" preload="auto" />
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col", embedded ? "h-full" : "h-[calc(100vh-64px)]")}>
      {/* Hidden audio element for alerts */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Header */}
      <div className={cn("border-b bg-background flex flex-col gap-3", embedded ? "p-2" : "p-3 sm:p-4")}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {!embedded && !new URLSearchParams(window.location.search).get('fromtela') && (
              <Button variant="ghost" size="icon" onClick={() => navigate('/logistica')} className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              {!embedded && (
                <h1 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
                  <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  Monitoramento em Tempo Real
                </h1>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground">
                Última atualização: {format(lastUpdate, "HH:mm:ss", { locale: ptBR })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <GrupoFilterSelect value={grupoId} onChange={setGrupoId} unidades={unidades} className="min-w-[180px]" />

            {/* Auto Refresh Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <RefreshCw className={cn("h-4 w-4", autoRefresh && "animate-spin")} />
                    <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Auto-atualização</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Alerts Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    {alertsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                    <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Alertas</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Sound Toggle */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <Volume2 className={cn("h-4 w-4", !soundEnabled && "opacity-50")} />
                    <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Som de alerta</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant={pinnedVeiculoId ? 'default' : 'outline'}
              size="sm"
              onClick={showAll}
              disabled={!pinnedVeiculoId && !focusVehicle}
              title="Ver todos os veículos no mapa"
            >
              <Maximize2 className="h-4 w-4 mr-2" />
              Ver todos
            </Button>

            <Button variant="outline" size="sm" onClick={fetchVeiculos}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Card className="p-2 sm:p-3">
            <div className="flex items-center gap-2">
              <Car className="h-4 w-4 text-primary" />
              <span className="text-xs sm:text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-lg sm:text-xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-2 sm:p-3 border-l-2 border-l-green-500">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Movendo</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-green-600">{stats.movendo}</p>
          </Card>
          <Card className="p-2 sm:p-3 border-l-2 border-l-amber-500">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-xs sm:text-sm text-muted-foreground">Parado</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-amber-600">{stats.parado}</p>
          </Card>
          <Card className="p-2 sm:p-3 border-l-2 border-l-gray-400">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-gray-400" />
              <span className="text-xs sm:text-sm text-muted-foreground">Offline</span>
            </div>
            <p className="text-lg sm:text-xl font-bold text-gray-500">{stats.offline}</p>
          </Card>
        </div>
      </div>

      {/* Content - Mobile optimized */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Mobile/Tablet floating buttons */}
        <div className="lg:hidden absolute top-2 left-2 right-2 z-10 flex justify-between">
          <Sheet open={mobileVehicleListOpen} onOpenChange={setMobileVehicleListOpen}>
            <SheetTrigger asChild>
              <Button variant="secondary" size="sm" className="shadow-lg">
                <List className="h-4 w-4 mr-2" />
                Veículos ({stats.total})
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] sm:w-[320px] p-0">
              <div className="h-full flex flex-col">
                <div className="p-3 border-b">
                  <h3 className="font-medium flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Veículos
                  </h3>
                </div>
                <ScrollArea className="flex-1">
                  <div className="p-2 space-y-1">
                    {veiculosFiltrados.map(v => {
                      const config = statusConfig[v.status];
                      const isSelected = selectedVeiculoId === v.id;
                      return (
                        <div
                          key={v.id}
                          onClick={() => {
                            zoomToVehicle(v.id);
                            setMobileVehicleListOpen(false);
                          }}
                          onDoubleClick={() => {
                            zoomToVehicle(v.id);
                            setMobileVehicleListOpen(false);
                          }}
                          className={cn(
                            "p-2 rounded-lg cursor-pointer transition-all",
                            isSelected 
                              ? "bg-primary/10 border-2 border-primary" 
                              : `bg-card hover:bg-accent border ${config.borderColor} border-l-4`
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {v.status !== 'offline' ? (
                                <Wifi className="h-3 w-3 text-green-500" />
                              ) : (
                                <WifiOff className="h-3 w-3 text-destructive" />
                              )}
                              <span className="font-medium text-sm">{v.placa}</span>
                            </div>
                            <Badge variant="outline" className={cn("text-[10px]", config.textColor)}>
                              {v.ultima_posicao ? `${Math.round(v.ultima_posicao.velocidade)} km/h` : '-'}
                            </Badge>
                          </div>
                          {v.motorista_atual ? (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-xs font-medium truncate flex items-center gap-1">
                                <User className="h-3 w-3 text-primary" />
                                {v.motorista_atual.nome}
                              </p>
                              {v.motorista_atual.telefone && (() => {
                                const wa = formatWhatsappNumber(v.motorista_atual!.telefone);
                                return wa ? (
                                  <a
                                    href={`https://web.whatsapp.com/send?phone=${wa}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline"
                                  >
                                    <MessageCircle className="h-3 w-3" />
                                    {v.motorista_atual.telefone}
                                  </a>
                                ) : null;
                              })()}
                            </div>
                          ) : v.motorista && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{v.motorista}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>
            </SheetContent>
          </Sheet>

          {alerts.length > 0 && (
            <Sheet open={mobileAlertsOpen} onOpenChange={setMobileAlertsOpen}>
              <SheetTrigger asChild>
                <Button variant="secondary" size="sm" className="shadow-lg">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Alertas ({alerts.length})
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[85vw] sm:w-[320px] p-0">
                <div className="h-full flex flex-col">
                  <div className="p-3 border-b">
                    <h3 className="font-medium flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Alertas
                    </h3>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="p-2 space-y-2">
                      {alerts.map((alert, index) => (
                        <div 
                          key={`${alert.veiculoId}-${alert.type}-${index}`}
                          className="p-2 rounded-lg bg-card border text-xs cursor-pointer hover:bg-accent"
                          onClick={() => {
                            setSelectedVeiculoId(alert.veiculoId);
                            setMobileAlertsOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            {getAlertIcon(alert.type)}
                            <span className="font-medium">{alert.placa}</span>
                          </div>
                          <p className="text-muted-foreground">{alert.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(alert.timestamp, "HH:mm:ss", { locale: ptBR })}
                          </p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>

        {/* Desktop Vehicle List */}
        <div className="hidden lg:flex w-64 lg:w-72 flex-shrink-0 border-r bg-background overflow-hidden flex-col">
          <div className="p-2 sm:p-3 border-b flex items-center justify-between">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Car className="h-4 w-4" />
              Veículos
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {veiculosFiltrados.map(v => {
                const config = statusConfig[v.status];
                const isSelected = selectedVeiculoId === v.id;
                
                return (
                  <div
                    key={v.id}
                    onClick={() => zoomToVehicle(v.id)}
                    onDoubleClick={() => zoomToVehicle(v.id)}
                    className={cn(
                      "p-2 rounded-lg cursor-pointer transition-all",
                      isSelected 
                        ? "bg-primary/10 border-2 border-primary" 
                        : `bg-card hover:bg-accent border ${config.borderColor} border-l-4`
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {v.status !== 'offline' ? (
                          <Wifi className="h-3 w-3 text-green-500" />
                        ) : (
                          <WifiOff className="h-3 w-3 text-destructive" />
                        )}
                        <span className="font-medium text-sm">{v.placa}</span>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px]", config.textColor)}>
                        {v.ultima_posicao ? `${Math.round(v.ultima_posicao.velocidade)} km/h` : '-'}
                      </Badge>
                    </div>
                    {v.motorista_atual ? (
                      <div className="mt-1 space-y-0.5">
                        <p className="text-xs font-medium truncate flex items-center gap-1">
                          <User className="h-3 w-3 text-primary" />
                          {v.motorista_atual.nome}
                        </p>
                        {v.motorista_atual.telefone && (() => {
                          const wa = formatWhatsappNumber(v.motorista_atual!.telefone);
                          return wa ? (
                            <a
                              href={`https://web.whatsapp.com/send?phone=${wa}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[10px] text-emerald-600 hover:underline"
                            >
                              <MessageCircle className="h-3 w-3" />
                              {v.motorista_atual.telefone}
                            </a>
                          ) : null;
                        })()}
                      </div>
                    ) : v.motorista && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{v.motorista}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>

        {/* Map - Full height on mobile */}
        <div className="flex-1 relative h-full min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-muted-foreground">Carregando...</div>
            </div>
          ) : veiculosComPosicao.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-muted/50">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum veículo com posição</p>
              </div>
            </div>
          ) : (
            <>
              <LazyLogisticaMap
                veiculos={veiculosComPosicao}
                paradasMarcadas={paradasMarcadas}
                onVeiculoClick={(v) => zoomToVehicle(v.id)}
                focusVeiculoId={focusVehicle?.id}
                focusTrigger={focusVehicle?.nonce}
                className="h-full w-full absolute inset-0"
                fitBounds={!pinnedVeiculoId}
              />
              <FocusLegend
                veiculo={focusVehicle ? veiculosComPosicao.find(v => v.id === focusVehicle.id) : undefined}
                onClose={() => setFocusVehicle(null)}
              />
              <VehicleLegend
                veiculos={veiculosComPosicao}
                selectedId={focusVehicle?.id ?? selectedVeiculoId}
                onVeiculoClick={zoomToVehicle}
              />
            </>
          )}
          
          {/* Fullscreen toggle button */}
          <Button
            variant="outline"
            size="icon"
            className="absolute left-[10px] top-[82px] z-[400] h-[30px] w-[30px] bg-background border-2 border-[rgba(0,0,0,0.2)] shadow-none hover:bg-accent rounded-sm lg:flex hidden"
            onClick={() => setMapFullscreen(true)}
            title="Expandir mapa"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Desktop Alerts Panel */}
        <div className="hidden lg:flex w-64 lg:w-72 flex-shrink-0 border-l bg-background overflow-hidden flex-col">
          <div 
            className="p-2 sm:p-3 border-b flex items-center justify-between cursor-pointer"
            onClick={() => setShowAlerts(!showAlerts)}
          >
            <h3 className="font-medium text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Alertas
              {alerts.length > 0 && (
                <Badge variant="destructive" className="text-[10px]">{alerts.length}</Badge>
              )}
            </h3>
            {showAlerts ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
          {showAlerts && (
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {alerts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum alerta
                  </p>
                ) : (
                  alerts.map((alert, index) => (
                    <div 
                      key={`${alert.veiculoId}-${alert.type}-${index}`}
                      className="p-2 rounded-lg bg-card border text-xs cursor-pointer hover:bg-accent"
                      onClick={() => setSelectedVeiculoId(alert.veiculoId)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {getAlertIcon(alert.type)}
                        <span className="font-medium">{alert.placa}</span>
                      </div>
                      <p className="text-muted-foreground">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {format(alert.timestamp, "HH:mm:ss", { locale: ptBR })}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogisticaMonitoramento;
