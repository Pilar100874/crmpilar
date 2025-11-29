import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Route, Search, Eye, Trash2, MapPin, Clock, Navigation, Calendar, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RotaSalva } from '@/types/logistica';
import { formatDistance, formatDuration } from '@/services/openRouteService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

const LogisticaRotas: React.FC = () => {
  const [rotas, setRotas] = useState<RotaSalva[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRota, setSelectedRota] = useState<RotaSalva | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    fetchRotas();
  }, []);

  const fetchRotas = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      let estabelecimentoId = usuario?.estabelecimento_id;

      if (!estabelecimentoId) {
        estabelecimentoId = localStorage.getItem('selectedEstabelecimentoId');
      }

      if (!estabelecimentoId) {
        console.log('Estabelecimento não encontrado');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('rotas_salvas')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRotas((data || []) as RotaSalva[]);
    } catch (error) {
      console.error('Error fetching routes:', error);
      toast.error('Erro ao carregar rotas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedRota) return;

    try {
      const { error } = await supabase
        .from('rotas_salvas')
        .delete()
        .eq('id', selectedRota.id);

      if (error) throw error;
      toast.success('Rota excluída');
      setDeleteDialogOpen(false);
      setSelectedRota(null);
      fetchRotas();
    } catch (error: any) {
      console.error('Error deleting route:', error);
      toast.error(error.message || 'Erro ao excluir rota');
    }
  };

  const filteredRotas = rotas.filter(r =>
    r.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Route className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Rotas Salvas</h1>
            <p className="text-sm text-muted-foreground">
              {rotas.length} rota{rotas.length !== 1 ? 's' : ''} salva{rotas.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar rotas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Routes Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredRotas.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="p-3 rounded-full bg-muted mb-4">
              <Route className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-lg mb-1">Nenhuma rota encontrada</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {searchTerm ? 'Tente uma busca diferente' : 'Crie sua primeira rota na página de roteirização'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRotas.map(rota => (
            <Card key={rota.id} className="group hover:shadow-lg transition-all duration-300 overflow-hidden">
              <CardContent className="p-0">
                {/* Card Header with gradient */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{rota.nome}</h3>
                      {rota.descricao && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {rota.descricao}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="ml-2 shrink-0">
                      {rota.pontos_parada?.length || rota.coordenadas_json.coordinates?.length || 0} paradas
                    </Badge>
                  </div>
                </div>

                {/* Stats */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-blue-500/10">
                        <Navigation className="h-4 w-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Distância</p>
                        <p className="font-medium text-sm">
                          {rota.distancia_metros ? formatDistance(rota.distancia_metros) : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-green-500/10">
                        <Clock className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Tempo</p>
                        <p className="font-medium text-sm">
                          {rota.tempo_estimado_segundos ? formatDuration(rota.tempo_estimado_segundos) : '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Criada em {format(new Date(rota.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 p-4 pt-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedRota(rota);
                      setViewDialogOpen(true);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Visualizar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      setSelectedRota(rota);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden z-[9999]">
          <div className="flex flex-col h-full">
            {/* Dialog Header */}
            <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Route className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedRota?.nome}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {selectedRota?.descricao || 'Detalhes da rota salva'}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Stats Row */}
              {selectedRota && (
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80 backdrop-blur-sm border">
                    <div className="p-2 rounded-md bg-orange-500/10">
                      <MapPin className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Paradas</p>
                      <p className="font-bold text-lg">
                        {selectedRota.pontos_parada?.length || selectedRota.coordenadas_json.coordinates?.length || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80 backdrop-blur-sm border">
                    <div className="p-2 rounded-md bg-blue-500/10">
                      <Navigation className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Distância</p>
                      <p className="font-bold text-lg">
                        {selectedRota.distancia_metros ? formatDistance(selectedRota.distancia_metros) : '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80 backdrop-blur-sm border">
                    <div className="p-2 rounded-md bg-green-500/10">
                      <Clock className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo Estimado</p>
                      <p className="font-bold text-lg">
                        {selectedRota.tempo_estimado_segundos ? formatDuration(selectedRota.tempo_estimado_segundos) : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Content */}
            {selectedRota && (
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Map */}
                <div className="flex-1 min-h-[300px] lg:min-h-0">
                  <LazyLogisticaMap
                    routes={selectedRota.coordenadas_json.geometry ? [{
                      coordinates: selectedRota.coordenadas_json.geometry,
                      color: '#3b82f6',
                      distance: selectedRota.distancia_metros,
                      duration: selectedRota.tempo_estimado_segundos
                    }] : []}
                    className="h-full w-full"
                  />
                </div>

                {/* Stops List */}
                {selectedRota.pontos_parada && selectedRota.pontos_parada.length > 0 && (
                  <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l bg-muted/30">
                    <div className="p-4 border-b bg-background">
                      <h4 className="font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Itinerário
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedRota.pontos_parada.length} parada{selectedRota.pontos_parada.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <ScrollArea className="h-[200px] lg:h-[calc(100%-60px)]">
                      <div className="p-4 space-y-3">
                        {selectedRota.pontos_parada.map((parada, idx) => (
                          <div key={idx} className="flex items-start gap-3 group">
                            <div className="relative">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                idx === 0 
                                  ? 'bg-green-500 text-white' 
                                  : idx === selectedRota.pontos_parada!.length - 1 
                                    ? 'bg-red-500 text-white'
                                    : 'bg-primary text-primary-foreground'
                              }`}>
                                {idx + 1}
                              </div>
                              {idx < selectedRota.pontos_parada!.length - 1 && (
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-border" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-4">
                              <p className="text-xs text-muted-foreground">
                                {idx === 0 ? 'Origem' : idx === selectedRota.pontos_parada!.length - 1 ? 'Destino' : `Parada ${idx}`}
                              </p>
                              <p className="text-sm font-medium leading-tight mt-0.5 line-clamp-2">
                                {parada.endereco}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Excluir Rota"
        description={`Tem certeza que deseja excluir a rota "${selectedRota?.nome}"? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
};

export default LogisticaRotas;