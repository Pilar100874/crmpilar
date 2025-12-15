import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Smartphone, Check, X, Link2, Clock, RefreshCw, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Dispositivo {
  id: string;
  device_uuid: string;
  nome_dispositivo: string | null;
  modelo: string | null;
  plataforma: string | null;
  veiculo_id: string | null;
  status: string;
  primeiro_acesso: string;
  ultimo_acesso: string | null;
}

interface Veiculo {
  id: string;
  placa: string;
  descricao: string | null;
}

interface DispositivosRastreamentoProps {
  estabelecimentoId: string | null;
}

const DispositivosRastreamento: React.FC<DispositivosRastreamentoProps> = ({ estabelecimentoId }) => {
  const [dispositivos, setDispositivos] = useState<Dispositivo[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (estabelecimentoId) {
      loadData();
    }
  }, [estabelecimentoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load dispositivos from this establishment AND pending devices without establishment
      const { data: dispsEstab, error: dispError1 } = await supabase
        .from('dispositivos_rastreamento')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('primeiro_acesso', { ascending: false });

      if (dispError1) throw dispError1;

      // Also load pending devices without estabelecimento (for approval workflow)
      const { data: dispsPending, error: dispError2 } = await supabase
        .from('dispositivos_rastreamento')
        .select('*')
        .is('estabelecimento_id', null)
        .eq('status', 'pendente')
        .order('primeiro_acesso', { ascending: false });

      if (dispError2) throw dispError2;

      // Combine both lists, avoiding duplicates
      const allDisps = [...(dispsEstab || []), ...(dispsPending || [])];
      setDispositivos(allDisps);

      // Load veículos sem dispositivo vinculado
      const { data: veics, error: veicError } = await supabase
        .from('veiculos')
        .select('id, placa, descricao')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('placa');

      if (veicError) throw veicError;
      setVeiculos(veics || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dispositivos');
    } finally {
      setLoading(false);
    }
  };

  const aprovarDispositivo = async (dispositivoId: string) => {
    setSaving(dispositivoId);
    try {
      const { error } = await supabase
        .from('dispositivos_rastreamento')
        .update({
          status: 'aprovado',
          estabelecimento_id: estabelecimentoId,
          aprovado_em: new Date().toISOString()
        })
        .eq('id', dispositivoId);

      if (error) throw error;

      toast.success('Dispositivo aprovado! Edite para vincular a um veículo.');
      loadData();
    } catch (error) {
      console.error('Error approving device:', error);
      toast.error('Erro ao aprovar dispositivo');
    } finally {
      setSaving(null);
    }
  };

  const bloquearDispositivo = async (dispositivoId: string) => {
    setSaving(dispositivoId);
    try {
      const { error } = await supabase
        .from('dispositivos_rastreamento')
        .update({ status: 'bloqueado' })
        .eq('id', dispositivoId);

      if (error) throw error;

      toast.success('Dispositivo bloqueado');
      loadData();
    } catch (error) {
      console.error('Error blocking device:', error);
      toast.error('Erro ao bloquear dispositivo');
    } finally {
      setSaving(null);
    }
  };

  const excluirDispositivo = async (dispositivoId: string) => {
    setSaving(dispositivoId);
    try {
      const { error } = await supabase
        .from('dispositivos_rastreamento')
        .delete()
        .eq('id', dispositivoId);

      if (error) throw error;

      toast.success('Dispositivo excluído');
      loadData();
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('Erro ao excluir dispositivo');
    } finally {
      setSaving(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case 'aprovado':
        return <Badge className="bg-green-500"><Check className="w-3 h-3 mr-1" />Aprovado</Badge>;
      case 'bloqueado':
        return <Badge variant="destructive"><X className="w-3 h-3 mr-1" />Bloqueado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPlatformIcon = (plataforma: string | null) => {
    switch (plataforma) {
      case 'android': return '🤖';
      case 'ios': return '🍎';
      case 'web': return '🌐';
      default: return '📱';
    }
  };

  const pendentes = dispositivos.filter(d => d.status === 'pendente');
  const aprovados = dispositivos.filter(d => d.status === 'aprovado');
  const bloqueados = dispositivos.filter(d => d.status === 'bloqueado');

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pendentes */}
      {pendentes.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              Dispositivos Aguardando Liberação ({pendentes.length})
            </CardTitle>
            <CardDescription>
              Aprove os dispositivos para permitir o rastreamento. Vincule a veículos depois.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Primeiro Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentes.map((disp) => (
                  <TableRow key={disp.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{disp.nome_dispositivo || disp.device_uuid}</div>
                        <div className="text-xs text-muted-foreground">{disp.device_uuid}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg">{getPlatformIcon(disp.plataforma)}</span>
                      <span className="ml-1 text-sm capitalize">{disp.plataforma || 'Desconhecido'}</span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(disp.primeiro_acesso), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          size="sm"
                          onClick={() => aprovarDispositivo(disp.id)}
                          disabled={saving === disp.id}
                        >
                          {saving === disp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                          Aprovar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => bloquearDispositivo(disp.id)}
                          disabled={saving === disp.id}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Aprovados */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Dispositivos Ativos ({aprovados.length})
            </CardTitle>
            <CardDescription>
              Dispositivos liberados para rastreamento
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadData}>
            <RefreshCw className="w-4 h-4 mr-1" />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {aprovados.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Nenhum dispositivo aprovado ainda
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {aprovados.map((disp) => (
                  <TableRow key={disp.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{disp.nome_dispositivo || disp.device_uuid}</div>
                        <div className="text-xs text-muted-foreground">{disp.device_uuid}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg">{getPlatformIcon(disp.plataforma)}</span>
                      <span className="ml-1 text-sm capitalize">{disp.plataforma || 'Desconhecido'}</span>
                    </TableCell>
                    <TableCell>
                      {disp.ultimo_acesso 
                        ? format(new Date(disp.ultimo_acesso), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => bloquearDispositivo(disp.id)}
                          disabled={saving === disp.id}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Dispositivo?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita. O dispositivo precisará ser registrado novamente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => excluirDispositivo(disp.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Bloqueados */}
      {bloqueados.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              Dispositivos Bloqueados ({bloqueados.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dispositivo</TableHead>
                  <TableHead>Plataforma</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bloqueados.map((disp) => (
                  <TableRow key={disp.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{disp.nome_dispositivo || disp.device_uuid}</div>
                        <div className="text-xs text-muted-foreground">{disp.device_uuid}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg">{getPlatformIcon(disp.plataforma)}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => aprovarDispositivo(disp.id)}
                        disabled={saving === disp.id}
                      >
                        Desbloquear
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DispositivosRastreamento;
