import React, { useState } from 'react';
import { Plus, Trash2, Route, Clock, Navigation, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { AddressAutocomplete } from '@/components/logistica/AddressAutocomplete';
import { formatDistance, formatDuration } from '@/services/openRouteService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface Waypoint {
  id: string;
  endereco: string;
  lat?: number;
  lng?: number;
  loading?: boolean;
  error?: string;
}

interface RouteResult {
  coordinates: Array<{ lat: number; lng: number }>;
  distance: number;
  duration: number;
}

const LogisticaRoteirizacao: React.FC = () => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { id: '1', endereco: '' },
    { id: '2', endereco: '' }
  ]);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [routeName, setRouteName] = useState('');
  const [routeDescription, setRouteDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const addWaypoint = () => {
    setWaypoints(prev => [
      ...prev,
      { id: Date.now().toString(), endereco: '' }
    ]);
  };

  const removeWaypoint = (id: string) => {
    if (waypoints.length <= 2) {
      toast.error('Mínimo de 2 pontos necessários');
      return;
    }
    setWaypoints(prev => prev.filter(w => w.id !== id));
    setRoute(null);
  };

  const updateWaypoint = (id: string, endereco: string) => {
    setWaypoints(prev => prev.map(w => 
      w.id === id ? { ...w, endereco, lat: undefined, lng: undefined, error: undefined } : w
    ));
    setRoute(null);
  };

  const updateWaypointWithCoords = (id: string, endereco: string, lat: number, lng: number) => {
    setWaypoints(prev => prev.map(w => 
      w.id === id ? { ...w, endereco, lat, lng, error: undefined } : w
    ));
    setRoute(null);
  };

  const geocodeWaypoint = async (waypoint: Waypoint): Promise<Waypoint> => {
    if (!waypoint.endereco.trim()) {
      return { ...waypoint, error: 'Endereço vazio' };
    }

    try {
      const response = await supabase.functions.invoke('openrouteservice-proxy', {
        body: {
          action: 'geocode',
          text: waypoint.endereco
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].geometry.coordinates;
        return { ...waypoint, lat, lng, error: undefined };
      } else {
        return { ...waypoint, error: 'Endereço não encontrado' };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      return { ...waypoint, error: 'Erro ao geocodificar' };
    }
  };

  const calculateRoute = async () => {
    // Validate all waypoints have addresses
    const emptyWaypoints = waypoints.filter(w => !w.endereco.trim());
    if (emptyWaypoints.length > 0) {
      toast.error('Preencha todos os endereços');
      return;
    }

    setCalculating(true);
    setRoute(null);

    try {
      // Geocode all waypoints
      const geocodedWaypoints = await Promise.all(
        waypoints.map(async (w) => {
          if (w.lat && w.lng) return w;
          return geocodeWaypoint(w);
        })
      );

      // Check for geocoding errors
      const errors = geocodedWaypoints.filter(w => w.error);
      if (errors.length > 0) {
        setWaypoints(geocodedWaypoints);
        toast.error(`${errors.length} endereço(s) não encontrado(s)`);
        setCalculating(false);
        return;
      }

      setWaypoints(geocodedWaypoints);

      // Calculate route
      const coordinates = geocodedWaypoints.map(w => [w.lng!, w.lat!]);
      
      const response = await supabase.functions.invoke('openrouteservice-proxy', {
        body: {
          action: 'directions',
          coordinates,
          profile: 'driving-car'
        }
      });

      if (response.error) throw response.error;

      const data = response.data;
      if (data.routes && data.routes.length > 0) {
        const routeData = data.routes[0];
        
        // Decode polyline
        const decodedCoords = decodePolyline(routeData.geometry);
        
        setRoute({
          coordinates: decodedCoords,
          distance: routeData.summary.distance,
          duration: routeData.summary.duration
        });

        toast.success('Rota calculada com sucesso!');
      }
    } catch (error) {
      console.error('Route calculation error:', error);
      toast.error('Erro ao calcular rota');
    } finally {
      setCalculating(false);
    }
  };

  const decodePolyline = (encoded: string): Array<{ lat: number; lng: number }> => {
    const coordinates: Array<{ lat: number; lng: number }> = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      coordinates.push({
        lat: lat / 1e5,
        lng: lng / 1e5
      });
    }

    return coordinates;
  };

  const handleSaveRoute = async () => {
    if (!routeName.trim()) {
      toast.error('Nome da rota é obrigatório');
      return;
    }

    if (!route) {
      toast.error('Calcule a rota primeiro');
      return;
    }

    setSaving(true);
    console.log('Iniciando salvamento da rota...');

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        throw new Error('Erro de autenticação');
      }
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      console.log('Usuário autenticado:', user.id);

      // Usa maybeSingle para evitar erro se não encontrar
      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('User query error:', userError);
        throw new Error('Erro ao buscar usuário');
      }
      
      // Fallback: tenta buscar por email se não encontrou por auth_user_id
      let estabelecimentoId = usuario?.estabelecimento_id;
      
      if (!estabelecimentoId && user.email) {
        console.log('Tentando buscar por email:', user.email);
        const { data: usuarioByEmail } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('email', user.email)
          .maybeSingle();
          
        estabelecimentoId = usuarioByEmail?.estabelecimento_id;
      }

      if (!estabelecimentoId) {
        throw new Error('Estabelecimento não encontrado para este usuário');
      }
      
      console.log('Estabelecimento ID:', estabelecimentoId);

      // Prepara dados para salvar
      const rotaData = {
        estabelecimento_id: estabelecimentoId,
        nome: routeName.trim(),
        descricao: routeDescription?.trim() || null,
        coordenadas_json: {
          coordinates: waypoints.filter(w => w.lat && w.lng).map(w => ({ lat: w.lat!, lng: w.lng! })),
          geometry: route.coordinates
        },
        pontos_parada: waypoints.filter(w => w.lat && w.lng).map((w, idx) => ({
          endereco: w.endereco,
          lat: w.lat!,
          lng: w.lng!,
          ordem: idx
        })),
        distancia_metros: route.distance,
        tempo_estimado_segundos: Math.round(route.duration)
      };
      
      console.log('Salvando rota:', rotaData);

      const { data: insertedData, error: insertError } = await supabase
        .from('rotas_salvas')
        .insert(rotaData)
        .select('id')
        .single();

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error(insertError.message || 'Erro ao inserir rota');
      }

      if (!insertedData?.id) {
        console.error('Insert returned no data - possible RLS rejection');
        throw new Error('Não foi possível salvar a rota. Verifique suas permissões.');
      }

      console.log('Rota salva com sucesso! ID:', insertedData.id);
      toast.success('Rota salva com sucesso!');
      setSaveDialogOpen(false);
      setRouteName('');
      setRouteDescription('');
    } catch (error: any) {
      console.error('Error saving route:', error);
      toast.error(error.message || 'Erro ao salvar rota');
    } finally {
      setSaving(false);
    }
  };

  const waypointMarkers = waypoints
    .filter(w => w.lat && w.lng)
    .map(w => ({ lat: w.lat!, lng: w.lng! }));

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row">
      {/* Sidebar - becomes bottom sheet on mobile */}
      <div className="w-full md:w-80 lg:w-96 flex-shrink-0 border-b md:border-b-0 md:border-r bg-background flex flex-col max-h-[50vh] md:max-h-none">
        <div className="p-3 sm:p-4 border-b">
          <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            <Route className="h-4 w-4 sm:h-5 sm:w-5" />
            Roteirização
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Adicione endereços para calcular a rota
          </p>
        </div>

        <ScrollArea className="flex-1 p-3 sm:p-4">
          <div className="space-y-3">
            {waypoints.map((waypoint, index) => (
              <div key={waypoint.id} className="flex items-start gap-2">
                <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-primary-foreground text-[10px] sm:text-xs font-bold mt-2">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <AddressAutocomplete
                    value={waypoint.endereco}
                    onChange={(value) => updateWaypoint(waypoint.id, value)}
                    onSelect={(address, lat, lng) => updateWaypointWithCoords(waypoint.id, address, lat, lng)}
                    placeholder={index === 0 ? 'Origem' : index === waypoints.length - 1 ? 'Destino' : `Parada ${index}`}
                    hasError={!!waypoint.error}
                    hasCoordinates={!!(waypoint.lat && waypoint.lng)}
                  />
                  {waypoint.error && (
                    <p className="text-[10px] sm:text-xs text-destructive mt-1">{waypoint.error}</p>
                  )}
                  {waypoint.lat && waypoint.lng && (
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                      {waypoint.lat.toFixed(4)}, {waypoint.lng.toFixed(4)}
                    </p>
                  )}
                </div>
                {waypoints.length > 2 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeWaypoint(waypoint.id)}
                    className="mt-1 h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            className="w-full mt-4"
            onClick={addWaypoint}
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Parada
          </Button>
        </ScrollArea>

        {/* Route Info */}
        {route && (
          <div className="p-3 sm:p-4 border-t bg-muted/50">
            <h3 className="font-medium mb-2 sm:mb-3 text-sm">Resumo da Rota</h3>
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <Navigation className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Distância</p>
                  <p className="font-semibold text-sm">{formatDistance(route.distance)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Tempo</p>
                  <p className="font-semibold text-sm">{formatDuration(route.duration)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-3 sm:p-4 border-t space-y-2">
          <Button 
            className="w-full" 
            onClick={calculateRoute}
            disabled={calculating}
            size="sm"
          >
            {calculating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Route className="h-4 w-4 mr-2" />
                Calcular Rota
              </>
            )}
          </Button>
          
          {route && (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setSaveDialogOpen(true)}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              Salvar Rota
            </Button>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 min-h-[250px]">
        <LazyLogisticaMap
          routes={route ? [{
            coordinates: route.coordinates,
            color: '#3b82f6',
            distance: route.distance,
            duration: route.duration
          }] : []}
          className="h-full w-full"
          fitBounds={route !== null || waypointMarkers.length > 0}
        />
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="z-[9999] [&~*]:z-[9998]">
          <DialogHeader>
            <DialogTitle>Salvar Rota</DialogTitle>
            <DialogDescription>Preencha os dados para salvar a rota calculada</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome da Rota *</Label>
              <Input
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                placeholder="Ex: Rota de entregas Centro"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={routeDescription}
                onChange={(e) => setRouteDescription(e.target.value)}
                placeholder="Descrição opcional da rota"
                rows={3}
              />
            </div>
            {route && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="flex justify-between">
                  <span>Distância:</span>
                  <span className="font-medium">{formatDistance(route.distance)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tempo estimado:</span>
                  <span className="font-medium">{formatDuration(route.duration)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Paradas:</span>
                  <span className="font-medium">{waypoints.length}</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveRoute} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LogisticaRoteirizacao;