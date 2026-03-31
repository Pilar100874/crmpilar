import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Navigation, Clock, Route, ChevronUp, ChevronDown, Loader2, Users, Calendar, Search, Check, X, RotateCcw, Play, ExternalLink, Timer, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FluxoAtendimentoDialog } from '@/components/atendimento/agenda/FluxoAtendimentoDialog';

interface Empresa {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  endereco: string | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  cep: string | null;
  latitude: number | null;
  longitude: number | null;
  telefone: string | null;
}

interface VisitaItem {
  id: string;
  empresa: Empresa;
  selecionada: boolean;
  ordem?: number;
  tempoEstimado: number;
  horaPrevista?: string;
  status: 'pendente' | 'em_andamento' | 'concluida';
  horaInicio?: number; // timestamp
  tarefaId?: string; // calendario_tarefas id created for this visit
}

interface RouteResult {
  coordinates: Array<{ lat: number; lng: number }>;
  distance: number;
  duration: number;
}

interface TarefaCalendario {
  id: string;
  title: string;
  contact_name: string;
  contact_id: string | null;
  date: string;
  time: string | null;
}

const openGoogleMaps = (lat: number, lng: number, label?: string) => {
  // Universal link that works on both iOS and Android
  const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
  window.open(url, '_blank');
};

const RoteirizadorVisitas: React.FC = () => {
  const [activeTab, setActiveTab] = useState('carteira');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [tarefas, setTarefas] = useState<TarefaCalendario[]>([]);
  const [visitas, setVisitas] = useState<VisitaItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [tempoVisitaPadrao, setTempoVisitaPadrao] = useState(30);
  const [mobileFormOpen, setMobileFormOpen] = useState(true);
  const [establecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const routeCalcRef = useRef<number>(0);

  // Fluxo atendimento dialog
  const [fluxoOpen, setFluxoOpen] = useState(false);
  const [fluxoTasks, setFluxoTasks] = useState<any[]>([]);
  const [visitaFinalizandoId, setVisitaFinalizandoId] = useState<string | null>(null);

  // Timer for active visit
  const [, setTick] = useState(0);
  useEffect(() => {
    const hasActive = visitas.some(v => v.status === 'em_andamento');
    if (!hasActive) return;
    const interval = setInterval(() => setTick(t => t + 1), 30000); // update every 30s
    return () => clearInterval(interval);
  }, [visitas]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id, estabelecimento_id')
        .eq('auth_user_id', user.id)
        .single();
      if (usuario) {
        setEstabelecimentoId(usuario.estabelecimento_id);
        setUsuarioId(usuario.id);
      }
    };
    fetchUser();
  }, []);

  const getLocation = useCallback(() => {
    setGettingLocation(true);
    if (!navigator.geolocation) {
      toast.error('Geolocalização não disponível');
      setGettingLocation(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingLocation(false);
        toast.success('Localização obtida!');
      },
      (err) => {
        console.error(err);
        toast.error('Não foi possível obter sua localização');
        setGettingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => { getLocation(); }, [getLocation]);

  useEffect(() => {
    if (!establecimentoId) return;
    const fetchEmpresas = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome, nome_fantasia, endereco, cidade, estado, bairro, cep, latitude, longitude, telefone')
        .eq('estabelecimento_id', establecimentoId)
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .order('nome');
      if (!error) setEmpresas(data || []);
      setLoading(false);
    };
    fetchEmpresas();
  }, [establecimentoId]);

  useEffect(() => {
    if (!establecimentoId || !usuarioId) return;
    const hoje = format(new Date(), 'yyyy-MM-dd');
    const fetchTarefas = async () => {
      const { data } = await supabase
        .from('calendario_tarefas')
        .select('id, title, contact_name, contact_id, date, time')
        .eq('estabelecimento_id', establecimentoId)
        .eq('user_id', usuarioId)
        .eq('date', hoje)
        .eq('status', 'pendente');
      if (data) setTarefas(data);
    };
    fetchTarefas();
  }, [establecimentoId, usuarioId]);

  const toggleVisita = (empresa: Empresa) => {
    setVisitas(prev => {
      const existing = prev.find(v => v.id === empresa.id);
      if (existing) {
        if (existing.status === 'em_andamento') {
          toast.error('Não é possível remover uma visita em andamento');
          return prev;
        }
        return prev.filter(v => v.id !== empresa.id);
      }
      return [...prev, {
        id: empresa.id,
        empresa,
        selecionada: true,
        tempoEstimado: tempoVisitaPadrao,
        status: 'pendente' as const,
      }];
    });
    setRoute(null);
  };

  const toggleVisitaSelecionada = (id: string) => {
    const visita = visitas.find(v => v.id === id);
    if (visita?.status === 'em_andamento') {
      toast.error('Não é possível desmarcar uma visita em andamento');
      return;
    }
    setVisitas(prev => prev.map(v => v.id === id ? { ...v, selecionada: !v.selecionada } : v));
    setRoute(null);
  };

  const removeVisita = (id: string) => {
    const visita = visitas.find(v => v.id === id);
    if (visita?.status === 'em_andamento') {
      toast.error('Finalize a visita antes de removê-la');
      return;
    }
    setVisitas(prev => prev.filter(v => v.id !== id));
    setRoute(null);
  };

  const addFromTarefa = (tarefa: TarefaCalendario) => {
    const matchEmpresa = empresas.find(e => {
      const name = (e.nome_fantasia || e.nome).toLowerCase();
      return name.includes(tarefa.contact_name.toLowerCase()) || tarefa.contact_name.toLowerCase().includes(name);
    });
    if (matchEmpresa) {
      if (!visitas.find(v => v.id === matchEmpresa.id)) {
        toggleVisita(matchEmpresa);
      }
    } else {
      toast.error(`Empresa "${tarefa.contact_name}" não encontrada com coordenadas`);
    }
  };

  // ===== VISIT EXECUTION =====
  const iniciarVisita = async (id: string) => {
    const visita = visitas.find(v => v.id === id);
    if (!visita || !establecimentoId || !usuarioId) return;

    // Create a tarefa for this visit if needed
    let tarefaId = visita.tarefaId;
    if (!tarefaId) {
      const { data, error } = await supabase
        .from('calendario_tarefas')
        .insert({
          user_id: usuarioId,
          estabelecimento_id: establecimentoId,
          contact_name: visita.empresa.nome_fantasia || visita.empresa.nome,
          title: `Visita presencial: ${visita.empresa.nome_fantasia || visita.empresa.nome}`,
          date: format(new Date(), 'yyyy-MM-dd'),
          time: format(new Date(), 'HH:mm'),
          origem: 'roteirizador',
          status: 'pendente',
        })
        .select('id')
        .single();
      if (error) {
        toast.error('Erro ao criar tarefa de visita');
        return;
      }
      tarefaId = data.id;
    }

    setVisitas(prev => prev.map(v =>
      v.id === id ? { ...v, status: 'em_andamento' as const, horaInicio: Date.now(), tarefaId } : v
    ));
    toast.success(`Visita iniciada: ${visita.empresa.nome_fantasia || visita.empresa.nome}`);
  };

  const finalizarVisita = (id: string) => {
    const visita = visitas.find(v => v.id === id);
    if (!visita || !visita.tarefaId) return;

    setVisitaFinalizandoId(id);

    // Prepare task for FluxoAtendimentoDialog
    const task = {
      id: visita.tarefaId,
      contact_name: visita.empresa.nome_fantasia || visita.empresa.nome,
      title: `Visita presencial: ${visita.empresa.nome_fantasia || visita.empresa.nome}`,
      description: visita.horaInicio
        ? `Visita iniciada às ${format(new Date(visita.horaInicio), 'HH:mm')} - Duração: ${Math.round((Date.now() - visita.horaInicio) / 60000)} min`
        : undefined,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      origem: 'roteirizador',
      status: 'pendente',
      contact_id: null,
    };

    setFluxoTasks([task]);
    setFluxoOpen(true);
  };

  const onFluxoCompleted = () => {
    if (!visitaFinalizandoId) return;

    const visita = visitas.find(v => v.id === visitaFinalizandoId);
    const tempoReal = visita?.horaInicio ? Math.round((Date.now() - visita.horaInicio) / 60000) : visita?.tempoEstimado || 30;

    setVisitas(prev => prev.map(v =>
      v.id === visitaFinalizandoId
        ? { ...v, status: 'concluida' as const, selecionada: false, tempoEstimado: tempoReal }
        : v
    ));

    setVisitaFinalizandoId(null);
    setRoute(null);

    // Auto-recalculate route for remaining visits
    toast.success('Visita finalizada! Recalculando rota...');
    setTimeout(() => {
      calcularRota();
    }, 500);
  };

  const getTempoDecorrido = (horaInicio?: number) => {
    if (!horaInicio) return 0;
    return Math.round((Date.now() - horaInicio) / 60000);
  };

  const isVisitaExcedeuTempo = (visita: VisitaItem) => {
    if (visita.status !== 'em_andamento' || !visita.horaInicio) return false;
    return getTempoDecorrido(visita.horaInicio) > visita.tempoEstimado;
  };

  const decodePolyline = (encoded: string): Array<{ lat: number; lng: number }> => {
    const coordinates: Array<{ lat: number; lng: number }> = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let shift = 0, result = 0, byte: number;
      do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0; result = 0;
      do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
    }
    return coordinates;
  };

  const calcularRota = async () => {
    if (!currentLocation) {
      toast.error('Obtenha sua localização primeiro');
      return;
    }

    const selecionadas = visitas.filter(v => v.selecionada && v.status !== 'concluida');
    if (selecionadas.length === 0) {
      toast.info('Nenhuma visita pendente para calcular rota');
      setRoute(null);
      return;
    }

    setCalculating(true);
    const calcId = ++routeCalcRef.current;

    try {
      const coords = [
        [currentLocation.lng, currentLocation.lat],
        ...selecionadas.map(v => [v.empresa.longitude!, v.empresa.latitude!])
      ];

      const response = await supabase.functions.invoke('openrouteservice-proxy', {
        body: { action: 'directions', coordinates: coords, profile: 'driving-car' }
      });

      if (calcId !== routeCalcRef.current) return;
      if (response.error) throw response.error;

      const data = response.data;
      if (data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        const decodedCoords = decodePolyline(routeData.geometry);

        setRoute({
          coordinates: decodedCoords,
          distance: routeData.summary.distance,
          duration: routeData.summary.duration,
        });

        const now = new Date();
        let accumulatedMinutes = 0;
        const legs = routeData.legs || [];

        setVisitas(prev => {
          const selIds = selecionadas.map(s => s.id);
          let legIndex = 0;
          return prev.map(v => {
            if (!selIds.includes(v.id)) return v;
            const legDuration = legs[legIndex]?.duration || (routeData.summary.duration / selecionadas.length);
            accumulatedMinutes += legDuration / 60;
            const arrivalTime = new Date(now.getTime() + accumulatedMinutes * 60000);
            const hora = format(arrivalTime, 'HH:mm');
            accumulatedMinutes += v.tempoEstimado;
            legIndex++;
            return { ...v, ordem: legIndex, horaPrevista: hora };
          });
        });

        toast.success('Rota otimizada calculada!');
      }
    } catch (error) {
      console.error('Route error:', error);
      toast.error('Erro ao calcular rota');
    } finally {
      if (calcId === routeCalcRef.current) setCalculating(false);
    }
  };

  const filteredEmpresas = empresas.filter(e => {
    const term = search.toLowerCase();
    return (e.nome_fantasia || e.nome).toLowerCase().includes(term) ||
      (e.cidade || '').toLowerCase().includes(term) ||
      (e.bairro || '').toLowerCase().includes(term);
  });

  const visitasSelecionadas = visitas.filter(v => v.selecionada);
  const visitasPendentes = visitas.filter(v => v.selecionada && v.status !== 'concluida');
  const visitasConcluidas = visitas.filter(v => v.status === 'concluida');
  const tempoTotalVisitas = visitasPendentes.reduce((sum, v) => sum + v.tempoEstimado, 0);
  const tempoDeslocamento = route ? Math.round(route.duration / 60) : 0;
  const tempoTotal = tempoTotalVisitas + tempoDeslocamento;
  const horaFinal = route ? format(new Date(Date.now() + tempoTotal * 60000), 'HH:mm') : '--:--';

  const formatDist = (m: number) => m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`;
  const formatDur = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  };

  const mapRoutes = route ? [{ coordinates: route.coordinates, color: '#3b82f6', distance: route.distance, duration: route.duration }] : [];
  const mapBounds = route ? route.coordinates : undefined;
  const currentMarker = currentLocation ? { lat: currentLocation.lat, lng: currentLocation.lng, color: '#22c55e', label: 'Você' } : undefined;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <Route className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Roteirizador de Visitas</h1>
        </div>
        <div className="flex items-center gap-2">
          {visitasConcluidas.length > 0 && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {visitasConcluidas.length} concluída{visitasConcluidas.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(), 'HH:mm')}
          </Badge>
          {visitasPendentes.length > 0 && (
            <Badge className="gap-1">
              {visitasPendentes.length} pendente{visitasPendentes.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Mobile collapsible panel */}
        <div className="lg:hidden">
          <Collapsible open={mobileFormOpen} onOpenChange={setMobileFormOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full flex justify-between items-center rounded-none border-b h-10">
                <span className="text-sm font-medium">Planejamento</span>
                {mobileFormOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="max-h-[50vh] overflow-auto">
                <PanelContent
                  activeTab={activeTab} setActiveTab={setActiveTab} search={search} setSearch={setSearch}
                  filteredEmpresas={filteredEmpresas} visitas={visitas} tarefas={tarefas}
                  toggleVisita={toggleVisita} toggleVisitaSelecionada={toggleVisitaSelecionada}
                  removeVisita={removeVisita} addFromTarefa={addFromTarefa}
                  tempoVisitaPadrao={tempoVisitaPadrao} setTempoVisitaPadrao={setTempoVisitaPadrao}
                  loading={loading} currentLocation={currentLocation} gettingLocation={gettingLocation}
                  getLocation={getLocation} calculating={calculating} calcularRota={calcularRota}
                  route={route} tempoDeslocamento={tempoDeslocamento} tempoTotalVisitas={tempoTotalVisitas}
                  tempoTotal={tempoTotal} horaFinal={horaFinal} formatDist={formatDist} formatDur={formatDur}
                  clearAll={() => { setVisitas([]); setRoute(null); }}
                  iniciarVisita={iniciarVisita} finalizarVisita={finalizarVisita}
                  getTempoDecorrido={getTempoDecorrido} isVisitaExcedeuTempo={isVisitaExcedeuTempo}
                  visitasConcluidas={visitasConcluidas.length} visitasPendentes={visitasPendentes.length}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Desktop side panel */}
        <div className="hidden lg:block w-[420px] border-r shrink-0 overflow-hidden">
          <ScrollArea className="h-full">
            <PanelContent
              activeTab={activeTab} setActiveTab={setActiveTab} search={search} setSearch={setSearch}
              filteredEmpresas={filteredEmpresas} visitas={visitas} tarefas={tarefas}
              toggleVisita={toggleVisita} toggleVisitaSelecionada={toggleVisitaSelecionada}
              removeVisita={removeVisita} addFromTarefa={addFromTarefa}
              tempoVisitaPadrao={tempoVisitaPadrao} setTempoVisitaPadrao={setTempoVisitaPadrao}
              loading={loading} currentLocation={currentLocation} gettingLocation={gettingLocation}
              getLocation={getLocation} calculating={calculating} calcularRota={calcularRota}
              route={route} tempoDeslocamento={tempoDeslocamento} tempoTotalVisitas={tempoTotalVisitas}
              tempoTotal={tempoTotal} horaFinal={horaFinal} formatDist={formatDist} formatDur={formatDur}
              clearAll={() => { setVisitas([]); setRoute(null); }}
              iniciarVisita={iniciarVisita} finalizarVisita={finalizarVisita}
              getTempoDecorrido={getTempoDecorrido} isVisitaExcedeuTempo={isVisitaExcedeuTempo}
              visitasConcluidas={visitasConcluidas.length} visitasPendentes={visitasPendentes.length}
            />
          </ScrollArea>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <LazyLogisticaMap
            className="h-full w-full"
            routes={mapRoutes}
            fullRouteBounds={mapBounds}
            currentMarker={currentMarker}
            center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [-23.55, -46.63]}
            zoom={currentLocation ? 13 : 10}
            fitBounds={!!route}
          />
        </div>
      </div>

      {/* Fluxo Atendimento Dialog */}
      {establecimentoId && usuarioId && (
        <FluxoAtendimentoDialog
          open={fluxoOpen}
          onOpenChange={(open) => {
            setFluxoOpen(open);
            if (!open && visitaFinalizandoId) {
              // If dialog was closed without completing, still mark as done
              onFluxoCompleted();
            }
          }}
          tasks={fluxoTasks}
          estabelecimentoId={establecimentoId}
          usuarioId={usuarioId}
          onTaskCompleted={onFluxoCompleted}
        />
      )}
    </div>
  );
};

// ===== PANEL CONTENT =====

interface PanelContentProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
  search: string;
  setSearch: (s: string) => void;
  filteredEmpresas: Empresa[];
  visitas: VisitaItem[];
  tarefas: TarefaCalendario[];
  toggleVisita: (e: Empresa) => void;
  toggleVisitaSelecionada: (id: string) => void;
  removeVisita: (id: string) => void;
  addFromTarefa: (t: TarefaCalendario) => void;
  tempoVisitaPadrao: number;
  setTempoVisitaPadrao: (n: number) => void;
  loading: boolean;
  currentLocation: { lat: number; lng: number } | null;
  gettingLocation: boolean;
  getLocation: () => void;
  calculating: boolean;
  calcularRota: () => void;
  route: RouteResult | null;
  tempoDeslocamento: number;
  tempoTotalVisitas: number;
  tempoTotal: number;
  horaFinal: string;
  formatDist: (m: number) => string;
  formatDur: (s: number) => string;
  clearAll: () => void;
  iniciarVisita: (id: string) => void;
  finalizarVisita: (id: string) => void;
  getTempoDecorrido: (horaInicio?: number) => number;
  isVisitaExcedeuTempo: (v: VisitaItem) => boolean;
  visitasConcluidas: number;
  visitasPendentes: number;
}

const PanelContent: React.FC<PanelContentProps> = ({
  activeTab, setActiveTab, search, setSearch, filteredEmpresas, visitas, tarefas,
  toggleVisita, toggleVisitaSelecionada, removeVisita, addFromTarefa,
  tempoVisitaPadrao, setTempoVisitaPadrao, loading, currentLocation, gettingLocation,
  getLocation, calculating, calcularRota, route, tempoDeslocamento, tempoTotalVisitas,
  tempoTotal, horaFinal, formatDist, formatDur, clearAll,
  iniciarVisita, finalizarVisita, getTempoDecorrido, isVisitaExcedeuTempo,
  visitasConcluidas, visitasPendentes,
}) => {
  const visitasSelecionadas = visitas.filter(v => v.selecionada);
  const visitaEmAndamento = visitas.find(v => v.status === 'em_andamento');

  return (
    <div className="p-3 space-y-3">
      {/* Active visit alert */}
      {visitaEmAndamento && (
        <Card className={cn(
          "border-2",
          isVisitaExcedeuTempo(visitaEmAndamento) ? "border-destructive bg-destructive/5" : "border-green-500 bg-green-500/5"
        )}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Timer className={cn("h-4 w-4 animate-pulse", isVisitaExcedeuTempo(visitaEmAndamento) ? "text-destructive" : "text-green-600")} />
              <span className="text-sm font-semibold">Visita em andamento</span>
            </div>
            <p className="text-sm font-medium">{visitaEmAndamento.empresa.nome_fantasia || visitaEmAndamento.empresa.nome}</p>
            <div className="flex items-center justify-between text-xs">
              <span>
                Tempo: {getTempoDecorrido(visitaEmAndamento.horaInicio)}min / {visitaEmAndamento.tempoEstimado}min estimado
              </span>
              {isVisitaExcedeuTempo(visitaEmAndamento) && (
                <Badge variant="destructive" className="text-[10px]">Tempo excedido!</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1 text-xs"
                onClick={() => openGoogleMaps(visitaEmAndamento.empresa.latitude!, visitaEmAndamento.empresa.longitude!)}
              >
                <ExternalLink className="h-3 w-3" />
                Google Maps
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1 text-xs"
                onClick={() => finalizarVisita(visitaEmAndamento.id)}
              >
                <CheckCircle2 className="h-3 w-3" />
                Finalizar Visita
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Status */}
      <Card className="border-dashed">
        <CardContent className="p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className={cn("h-4 w-4", currentLocation ? "text-green-500" : "text-muted-foreground")} />
            <span className="text-sm">
              {currentLocation ? 'Localização obtida' : 'Localização pendente'}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={getLocation} disabled={gettingLocation}>
            {gettingLocation ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
          </Button>
        </CardContent>
      </Card>

      {/* Tempo por visita */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Tempo estimado por visita: {tempoVisitaPadrao}min</label>
        <Slider
          value={[tempoVisitaPadrao]}
          onValueChange={([v]) => setTempoVisitaPadrao(v)}
          min={10} max={120} step={5}
          className="py-1"
        />
        <p className="text-[10px] text-muted-foreground">Se a visita demorar mais, a rota será recalculada automaticamente ao finalizar.</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 h-8">
          <TabsTrigger value="carteira" className="text-xs gap-1"><Users className="h-3 w-3" />Carteira</TabsTrigger>
          <TabsTrigger value="agenda" className="text-xs gap-1"><Calendar className="h-3 w-3" />Agenda</TabsTrigger>
          <TabsTrigger value="manual" className="text-xs gap-1"><Search className="h-3 w-3" />Buscar</TabsTrigger>
        </TabsList>

        <TabsContent value="carteira" className="mt-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 h-8 text-sm" />
          </div>
          <EmpresaList empresas={filteredEmpresas} visitas={visitas} toggleVisita={toggleVisita} loading={loading} />
        </TabsContent>

        <TabsContent value="agenda" className="mt-2">
          {tarefas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhuma tarefa pendente para hoje</p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {tarefas.map(t => (
                  <button key={t.id} onClick={() => addFromTarefa(t)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-muted/50">
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{t.contact_name} {t.time && `• ${t.time}`}</p>
                    </div>
                    <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="manual" className="mt-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input placeholder="Buscar qualquer empresa..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-7 h-8 text-sm" />
          </div>
          <EmpresaList empresas={filteredEmpresas} visitas={visitas} toggleVisita={toggleVisita} loading={loading} />
        </TabsContent>
      </Tabs>

      {/* Selected visits */}
      {visitas.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Visitas ({visitasConcluidas} concluídas / {visitasPendentes} pendentes)</span>
              <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={clearAll}>Limpar</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ScrollArea className="max-h-[250px]">
              <div className="space-y-1">
                {visitas.map((v) => (
                  <div
                    key={v.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-lg text-sm border",
                      v.status === 'em_andamento' && "border-green-500 bg-green-500/5",
                      v.status === 'concluida' && "border-muted bg-muted/30 opacity-60",
                      v.status === 'pendente' && v.selecionada && "bg-muted/50 border-transparent",
                      v.status === 'pendente' && !v.selecionada && "bg-muted/20 opacity-50 border-transparent",
                    )}
                  >
                    {v.status === 'pendente' && (
                      <Checkbox checked={v.selecionada} onCheckedChange={() => toggleVisitaSelecionada(v.id)} className="mt-0.5" />
                    )}
                    {v.status === 'em_andamento' && <Timer className="h-4 w-4 text-green-600 animate-pulse mt-0.5 shrink-0" />}
                    {v.status === 'concluida' && <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {v.ordem && v.status === 'pendente' && (
                          <Badge variant="secondary" className="h-4 w-4 p-0 justify-center text-[10px]">{v.ordem}</Badge>
                        )}
                        <span className={cn("font-medium truncate text-xs", v.status === 'concluida' && "line-through")}>
                          {v.empresa.nome_fantasia || v.empresa.nome}
                        </span>
                      </div>
                      {v.horaPrevista && v.status === 'pendente' && (
                        <p className="text-[10px] text-muted-foreground">
                          Chegada: {v.horaPrevista} • {v.tempoEstimado}min visita
                        </p>
                      )}
                      {v.status === 'em_andamento' && (
                        <p className={cn("text-[10px]", isVisitaExcedeuTempo(v) ? "text-destructive font-medium" : "text-green-600")}>
                          {getTempoDecorrido(v.horaInicio)}min / {v.tempoEstimado}min
                          {isVisitaExcedeuTempo(v) && " ⚠️ Excedido"}
                        </p>
                      )}

                      {/* Action buttons */}
                      {v.status === 'pendente' && v.selecionada && (
                        <div className="flex gap-1 mt-1">
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2"
                            onClick={() => openGoogleMaps(v.empresa.latitude!, v.empresa.longitude!)}>
                            <ExternalLink className="h-3 w-3" />Maps
                          </Button>
                          <Button size="sm" className="h-6 text-[10px] gap-1 px-2"
                            onClick={() => iniciarVisita(v.id)}
                            disabled={!!visitas.find(vv => vv.status === 'em_andamento')}>
                            <Play className="h-3 w-3" />Iniciar
                          </Button>
                        </div>
                      )}
                      {v.status === 'em_andamento' && (
                        <div className="flex gap-1 mt-1">
                          <Button size="sm" variant="outline" className="h-6 text-[10px] gap-1 px-2"
                            onClick={() => openGoogleMaps(v.empresa.latitude!, v.empresa.longitude!)}>
                            <ExternalLink className="h-3 w-3" />Maps
                          </Button>
                          <Button size="sm" className="h-6 text-[10px] gap-1 px-2"
                            onClick={() => finalizarVisita(v.id)}>
                            <CheckCircle2 className="h-3 w-3" />Finalizar
                          </Button>
                        </div>
                      )}
                    </div>

                    {v.status === 'pendente' && (
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeVisita(v.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Summary & Calculate */}
      {visitasPendentes > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" />
                <span>{visitasPendentes} pendente{visitasPendentes !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-primary" />
                <span>Visitas: {tempoTotalVisitas}min</span>
              </div>
              {route && (
                <>
                  <div className="flex items-center gap-1">
                    <Route className="h-3 w-3 text-primary" />
                    <span>{formatDist(route.distance)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Navigation className="h-3 w-3 text-primary" />
                    <span>Desloc: {formatDur(route.duration)}</span>
                  </div>
                </>
              )}
            </div>
            {route && (
              <div className="text-xs font-medium text-center p-1.5 bg-primary/10 rounded-md">
                Tempo total: ~{Math.floor(tempoTotal / 60)}h{tempoTotal % 60}min • Término: ~{horaFinal}
              </div>
            )}
            <Button onClick={calcularRota} disabled={calculating || !currentLocation} className="w-full gap-2" size="sm">
              {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {route ? 'Recalcular Rota' : 'Calcular Melhor Rota'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Shared empresa list component
const EmpresaList: React.FC<{
  empresas: Empresa[];
  visitas: VisitaItem[];
  toggleVisita: (e: Empresa) => void;
  loading: boolean;
}> = ({ empresas, visitas, toggleVisita, loading }) => (
  <ScrollArea className="h-[200px]">
    {loading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    ) : empresas.length === 0 ? (
      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma empresa com coordenadas encontrada</p>
    ) : (
      <div className="space-y-1">
        {empresas.map(emp => {
          const isAdded = visitas.some(v => v.id === emp.id);
          return (
            <button key={emp.id} onClick={() => toggleVisita(emp)}
              className={cn(
                "w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors",
                isAdded ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
              )}>
              <div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                isAdded ? "bg-primary text-primary-foreground" : "border border-muted-foreground/30"
              )}>
                {isAdded && <Check className="h-3 w-3" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{emp.nome_fantasia || emp.nome}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {emp.bairro && `${emp.bairro} - `}{emp.cidade || 'Sem cidade'}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    )}
  </ScrollArea>
);

export default RoteirizadorVisitas;
