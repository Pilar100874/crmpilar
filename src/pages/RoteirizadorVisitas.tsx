import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Navigation, Clock, Route, ChevronUp, ChevronDown, Loader2, Users, Calendar, Search, Check, X, RotateCcw, Play } from 'lucide-react';
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
  tempoEstimado: number; // minutes
  horaPrevista?: string;
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
  const [tempoVisitaPadrao, setTempoVisitaPadrao] = useState(30); // minutes
  const [mobileFormOpen, setMobileFormOpen] = useState(true);
  const [establecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [usuarioId, setUsuarioId] = useState<string | null>(null);
  const routeCalcRef = useRef<number>(0);

  // Get current user info
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

  // Get current location
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

  // Fetch empresas (carteira)
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
      if (error) {
        console.error(error);
        toast.error('Erro ao carregar empresas');
      } else {
        setEmpresas(data || []);
      }
      setLoading(false);
    };
    fetchEmpresas();
  }, [establecimentoId]);

  // Fetch tarefas do dia
  useEffect(() => {
    if (!establecimentoId || !usuarioId) return;
    const hoje = format(new Date(), 'yyyy-MM-dd');
    const fetchTarefas = async () => {
      const { data, error } = await supabase
        .from('calendario_tarefas')
        .select('id, title, contact_name, contact_id, date, time')
        .eq('estabelecimento_id', establecimentoId)
        .eq('user_id', usuarioId)
        .eq('date', hoje)
        .eq('status', 'pendente');
      if (!error && data) setTarefas(data);
    };
    fetchTarefas();
  }, [establecimentoId, usuarioId]);

  const toggleVisita = (empresa: Empresa) => {
    setVisitas(prev => {
      const existing = prev.find(v => v.id === empresa.id);
      if (existing) {
        return prev.filter(v => v.id !== empresa.id);
      }
      return [...prev, {
        id: empresa.id,
        empresa,
        selecionada: true,
        tempoEstimado: tempoVisitaPadrao,
      }];
    });
    setRoute(null);
  };

  const toggleVisitaSelecionada = (id: string) => {
    setVisitas(prev => prev.map(v => v.id === id ? { ...v, selecionada: !v.selecionada } : v));
    setRoute(null);
  };

  const removeVisita = (id: string) => {
    setVisitas(prev => prev.filter(v => v.id !== id));
    setRoute(null);
  };

  const addFromTarefa = (tarefa: TarefaCalendario) => {
    // Try to find matching empresa
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

    const selecionadas = visitas.filter(v => v.selecionada);
    if (selecionadas.length === 0) {
      toast.error('Selecione ao menos uma visita');
      return;
    }

    setCalculating(true);
    const calcId = ++routeCalcRef.current;

    try {
      // Build coordinates: [origin, ...visits]
      const coords = [
        [currentLocation.lng, currentLocation.lat],
        ...selecionadas.map(v => [v.empresa.longitude!, v.empresa.latitude!])
      ];

      // Use optimization endpoint via proxy
      const response = await supabase.functions.invoke('openrouteservice-proxy', {
        body: {
          action: 'directions',
          coordinates: coords,
          profile: 'driving-car'
        }
      });

      if (calcId !== routeCalcRef.current) return; // stale

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

        // Calculate estimated arrival times
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
  const tempoTotalVisitas = visitasSelecionadas.reduce((sum, v) => sum + v.tempoEstimado, 0);
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
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(), 'HH:mm')}
          </Badge>
          {visitasSelecionadas.length > 0 && (
            <Badge className="gap-1">
              {visitasSelecionadas.length} visita{visitasSelecionadas.length !== 1 ? 's' : ''}
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
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  search={search}
                  setSearch={setSearch}
                  filteredEmpresas={filteredEmpresas}
                  visitas={visitas}
                  tarefas={tarefas}
                  toggleVisita={toggleVisita}
                  toggleVisitaSelecionada={toggleVisitaSelecionada}
                  removeVisita={removeVisita}
                  addFromTarefa={addFromTarefa}
                  tempoVisitaPadrao={tempoVisitaPadrao}
                  setTempoVisitaPadrao={setTempoVisitaPadrao}
                  loading={loading}
                  currentLocation={currentLocation}
                  gettingLocation={gettingLocation}
                  getLocation={getLocation}
                  calculating={calculating}
                  calcularRota={calcularRota}
                  route={route}
                  tempoDeslocamento={tempoDeslocamento}
                  tempoTotalVisitas={tempoTotalVisitas}
                  tempoTotal={tempoTotal}
                  horaFinal={horaFinal}
                  formatDist={formatDist}
                  formatDur={formatDur}
                  clearAll={() => { setVisitas([]); setRoute(null); }}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Desktop side panel */}
        <div className="hidden lg:block w-[420px] border-r shrink-0 overflow-hidden">
          <ScrollArea className="h-full">
            <PanelContent
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              search={search}
              setSearch={setSearch}
              filteredEmpresas={filteredEmpresas}
              visitas={visitas}
              tarefas={tarefas}
              toggleVisita={toggleVisita}
              toggleVisitaSelecionada={toggleVisitaSelecionada}
              removeVisita={removeVisita}
              addFromTarefa={addFromTarefa}
              tempoVisitaPadrao={tempoVisitaPadrao}
              setTempoVisitaPadrao={setTempoVisitaPadrao}
              loading={loading}
              currentLocation={currentLocation}
              gettingLocation={gettingLocation}
              getLocation={getLocation}
              calculating={calculating}
              calcularRota={calcularRota}
              route={route}
              tempoDeslocamento={tempoDeslocamento}
              tempoTotalVisitas={tempoTotalVisitas}
              tempoTotal={tempoTotal}
              horaFinal={horaFinal}
              formatDist={formatDist}
              formatDur={formatDur}
              clearAll={() => { setVisitas([]); setRoute(null); }}
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
    </div>
  );
};

// Panel content shared between mobile and desktop
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
}

const PanelContent: React.FC<PanelContentProps> = ({
  activeTab, setActiveTab, search, setSearch, filteredEmpresas, visitas, tarefas,
  toggleVisita, toggleVisitaSelecionada, removeVisita, addFromTarefa,
  tempoVisitaPadrao, setTempoVisitaPadrao, loading, currentLocation, gettingLocation,
  getLocation, calculating, calcularRota, route, tempoDeslocamento, tempoTotalVisitas,
  tempoTotal, horaFinal, formatDist, formatDur, clearAll,
}) => {
  const visitasSelecionadas = visitas.filter(v => v.selecionada);

  return (
    <div className="p-3 space-y-3">
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
        <label className="text-xs font-medium text-muted-foreground">Tempo por visita: {tempoVisitaPadrao}min</label>
        <Slider
          value={[tempoVisitaPadrao]}
          onValueChange={([v]) => setTempoVisitaPadrao(v)}
          min={10}
          max={120}
          step={5}
          className="py-1"
        />
      </div>

      {/* Tabs: source selection */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-3 h-8">
          <TabsTrigger value="carteira" className="text-xs gap-1"><Users className="h-3 w-3" />Carteira</TabsTrigger>
          <TabsTrigger value="agenda" className="text-xs gap-1"><Calendar className="h-3 w-3" />Agenda</TabsTrigger>
          <TabsTrigger value="manual" className="text-xs gap-1"><Search className="h-3 w-3" />Buscar</TabsTrigger>
        </TabsList>

        <TabsContent value="carteira" className="mt-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <Input
              placeholder="Buscar empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
          <ScrollArea className="h-[200px]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredEmpresas.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma empresa com coordenadas encontrada
              </p>
            ) : (
              <div className="space-y-1">
                {filteredEmpresas.map(emp => {
                  const isAdded = visitas.some(v => v.id === emp.id);
                  return (
                    <button
                      key={emp.id}
                      onClick={() => toggleVisita(emp)}
                      className={cn(
                        "w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors",
                        isAdded ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                      )}
                    >
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
        </TabsContent>

        <TabsContent value="agenda" className="mt-2">
          {tarefas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma tarefa pendente para hoje
            </p>
          ) : (
            <ScrollArea className="h-[200px]">
              <div className="space-y-1">
                {tarefas.map(t => (
                  <button
                    key={t.id}
                    onClick={() => addFromTarefa(t)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-muted/50"
                  >
                    <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{t.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {t.contact_name} {t.time && `• ${t.time}`}
                      </p>
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
            <Input
              placeholder="Buscar qualquer empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-sm"
            />
          </div>
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {filteredEmpresas.map(emp => {
                const isAdded = visitas.some(v => v.id === emp.id);
                return (
                  <button
                    key={emp.id}
                    onClick={() => toggleVisita(emp)}
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm transition-colors",
                      isAdded ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50"
                    )}
                  >
                    <div className={cn("h-5 w-5 rounded-full flex items-center justify-center shrink-0",
                      isAdded ? "bg-primary text-primary-foreground" : "border border-muted-foreground/30"
                    )}>
                      {isAdded && <Check className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{emp.nome_fantasia || emp.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {emp.endereco && `${emp.endereco}, `}{emp.cidade || ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Selected visits */}
      {visitas.length > 0 && (
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Visitas Planejadas ({visitasSelecionadas.length}/{visitas.length})</span>
              {visitas.length > 0 && (
                <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => {
                  setVisitas([]);
                  setRoute(null);
                }}>
                  Limpar
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3">
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {visitas.map((v, i) => (
                  <div
                    key={v.id}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg text-sm",
                      v.selecionada ? "bg-muted/50" : "bg-muted/20 opacity-50"
                    )}
                  >
                    <Checkbox
                      checked={v.selecionada}
                      onCheckedChange={() => toggleVisitaSelecionada(v.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        {v.ordem && <Badge variant="secondary" className="h-4 w-4 p-0 justify-center text-[10px]">{v.ordem}</Badge>}
                        <span className="font-medium truncate text-xs">{v.empresa.nome_fantasia || v.empresa.nome}</span>
                      </div>
                      {v.horaPrevista && (
                        <p className="text-[10px] text-muted-foreground">
                          Chegada prevista: {v.horaPrevista} • {v.tempoEstimado}min visita
                        </p>
                      )}
                    </div>
                    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => removeVisita(v.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Summary & Calculate */}
      {visitasSelecionadas.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" />
                <span>{visitasSelecionadas.length} visita{visitasSelecionadas.length !== 1 ? 's' : ''}</span>
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
            <Button
              onClick={calcularRota}
              disabled={calculating || !currentLocation}
              className="w-full gap-2"
              size="sm"
            >
              {calculating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {route ? 'Recalcular Rota' : 'Calcular Melhor Rota'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RoteirizadorVisitas;
