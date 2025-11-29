import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Route, Search, Eye, Trash2, MapPin, Clock, Navigation } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RotaSalva } from '@/types/logistica';
import { formatDistance, formatDuration } from '@/services/openRouteService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LazyLogisticaMap } from '@/components/logistica/LazyLogisticaMap';
import { Badge } from '@/components/ui/badge';

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

      // Tenta buscar estabelecimento do usuário
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('estabelecimento_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      let estabelecimentoId = usuario?.estabelecimento_id;

      // Fallback: usa localStorage para admins
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
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Route className="h-6 w-6" />
          Rotas Salvas
        </h1>
        <p className="text-muted-foreground">
          Visualize e gerencie suas rotas salvas
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar rotas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Paradas</TableHead>
              <TableHead>Distância</TableHead>
              <TableHead>Tempo</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRotas.map(rota => (
              <TableRow key={rota.id}>
                <TableCell className="font-medium">{rota.nome}</TableCell>
                <TableCell>{rota.descricao || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {rota.pontos_parada?.length || rota.coordenadas_json.coordinates?.length || 0} paradas
                  </Badge>
                </TableCell>
                <TableCell>
                  {rota.distancia_metros ? formatDistance(rota.distancia_metros) : '-'}
                </TableCell>
                <TableCell>
                  {rota.tempo_estimado_segundos ? formatDuration(rota.tempo_estimado_segundos) : '-'}
                </TableCell>
                <TableCell>
                  {format(new Date(rota.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedRota(rota);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedRota(rota);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredRotas.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {loading ? 'Carregando...' : 'Nenhuma rota encontrada'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="h-5 w-5" />
              {selectedRota?.nome}
            </DialogTitle>
          </DialogHeader>

          {selectedRota && (
            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Paradas</p>
                    <p className="font-semibold">
                      {selectedRota.pontos_parada?.length || selectedRota.coordenadas_json.coordinates?.length || 0}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                  <Navigation className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Distância</p>
                    <p className="font-semibold">
                      {selectedRota.distancia_metros ? formatDistance(selectedRota.distancia_metros) : '-'}
                    </p>
                  </div>
                </div>
                <div className="p-3 bg-muted rounded-lg flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Tempo</p>
                    <p className="font-semibold">
                      {selectedRota.tempo_estimado_segundos ? formatDuration(selectedRota.tempo_estimado_segundos) : '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Map */}
              <div className="flex-1 border rounded-lg overflow-hidden">
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
                <div className="max-h-40 overflow-auto">
                  <h4 className="font-medium mb-2">Paradas</h4>
                  <div className="space-y-2">
                    {selectedRota.pontos_parada.map((parada, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <span>{parada.endereco}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
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