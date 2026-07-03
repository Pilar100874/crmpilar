import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Car, Search, Smartphone, Fuel, Send } from 'lucide-react';
import { BloqueioCombustivelDialog } from './BloqueioCombustivelDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Veiculo } from '@/types/logistica';

interface VeiculosCRUDProps {
  estabelecimentoId: string;
}

interface DispositivoAprovado {
  id: string;
  device_uuid: string;
  nome_dispositivo: string | null;
  veiculo_id: string | null;
  estabelecimento_id: string | null;
}

const tipos = [
  'Celular',
  'Carro',
  'Van',
  'Caminhão Leve',
  'Caminhão Médio',
  'Caminhão Pesado',
  'Moto',
  'Bicicleta',
  'Outro'
];

export const VeiculosCRUD: React.FC<VeiculosCRUDProps> = ({ estabelecimentoId }) => {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoAprovado[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null);
  const [bloqueioOpen, setBloqueioOpen] = useState(false);
  const [veiculoBloqueio, setVeiculoBloqueio] = useState<Veiculo | null>(null);
  const [dispositivoTab, setDispositivoTab] = useState<'selecionar' | 'digitar'>('selecionar');
  const [enviandoSms, setEnviandoSms] = useState(false);
  const [formData, setFormData] = useState({
    placa: '',
    descricao: '',
    motorista: '',
    tipo_veiculo: '',
    traccar_device_id: '',
    dispositivo_id: '',
    telefone_sms: '',
    enviar_sms_automatico: false,
    ativo: true
  });

  useEffect(() => {
    fetchVeiculos();
    fetchDispositivos();
  }, [estabelecimentoId]);

  const fetchVeiculos = async () => {
    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('placa');

      if (error) throw error;
      setVeiculos((data || []) as Veiculo[]);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      toast.error('Erro ao carregar veículos');
    } finally {
      setLoading(false);
    }
  };

  const fetchDispositivos = async () => {
    try {
      // Fetch ALL approved devices regardless of estabelecimento
      // since the config screen may use a different estabelecimento
      const { data, error } = await supabase
        .from('dispositivos_rastreamento')
        .select('id, device_uuid, nome_dispositivo, veiculo_id, estabelecimento_id')
        .eq('status', 'aprovado');

      if (error) throw error;
      console.log('Dispositivos aprovados encontrados:', data);
      setDispositivos(data || []);
    } catch (error) {
      console.error('Error fetching devices:', error);
    }
  };

  const handleOpenDialog = (veiculo?: any) => {
    // Find if this vehicle has a linked device
    const linkedDevice = veiculo ? dispositivos.find(d => d.veiculo_id === veiculo.id) : null;
    
    if (veiculo) {
      setSelectedVeiculo(veiculo);
      setFormData({
        placa: veiculo.placa,
        descricao: veiculo.descricao || '',
        motorista: veiculo.motorista || '',
        tipo_veiculo: veiculo.tipo_veiculo || '',
        traccar_device_id: veiculo.traccar_device_id || '',
        dispositivo_id: linkedDevice?.id || '',
        telefone_sms: (veiculo as any).telefone_sms || '',
        enviar_sms_automatico: false,
        ativo: veiculo.ativo
      });
    } else {
      setSelectedVeiculo(null);
      setFormData({
        placa: '',
        descricao: '',
        motorista: '',
        tipo_veiculo: '',
        traccar_device_id: '',
        dispositivo_id: '',
        telefone_sms: '',
        enviar_sms_automatico: false,
        ativo: true
      });
    }
    setDispositivoTab('selecionar');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.placa.trim()) {
      toast.error('Placa é obrigatória');
      return;
    }

    try {
      let veiculoId = selectedVeiculo?.id;

      if (selectedVeiculo) {
        const { error } = await supabase
          .from('veiculos')
          .update({
            placa: formData.placa.toUpperCase(),
            descricao: formData.descricao || null,
            motorista: formData.motorista || null,
            tipo_veiculo: formData.tipo_veiculo || null,
            traccar_device_id: formData.traccar_device_id || null,
            ativo: formData.ativo
          })
          .eq('id', selectedVeiculo.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('veiculos')
          .insert({
            estabelecimento_id: estabelecimentoId,
            placa: formData.placa.toUpperCase(),
            descricao: formData.descricao || null,
            motorista: formData.motorista || null,
            tipo_veiculo: formData.tipo_veiculo || null,
            traccar_device_id: formData.traccar_device_id || null,
            ativo: formData.ativo
          })
          .select('id')
          .single();

        if (error) throw error;
        veiculoId = data?.id;
      }

      // Handle device linking
      if (veiculoId) {
        // First, unlink any device previously linked to this vehicle
        await supabase
          .from('dispositivos_rastreamento')
          .update({ veiculo_id: null })
          .eq('veiculo_id', veiculoId);

        // Then link the selected device (if any)
        if (formData.dispositivo_id) {
          await supabase
            .from('dispositivos_rastreamento')
            .update({ veiculo_id: veiculoId })
            .eq('id', formData.dispositivo_id);
        }
      }

      // Persist telefone_sms na tabela veiculos (coluna opcional)
      if (veiculoId && formData.telefone_sms) {
        await supabase
          .from('veiculos')
          .update({ telefone_sms: formData.telefone_sms } as any)
          .eq('id', veiculoId);
      }

      // Envio automático de SMS com os dados
      if (formData.enviar_sms_automatico && formData.telefone_sms && veiculoId) {
        await enviarDadosPorSms(veiculoId, formData.telefone_sms);
      }

      toast.success(selectedVeiculo ? 'Veículo atualizado' : 'Veículo criado');
      setDialogOpen(false);
      fetchVeiculos();
      fetchDispositivos();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      toast.error(error.message || 'Erro ao salvar veículo');
    }
  };

  const enviarDadosPorSms = async (veiculoId?: string, telefoneOverride?: string) => {
    const telefone = telefoneOverride || formData.telefone_sms;
    if (!telefone) {
      toast.error('Informe o telefone (SIM do equipamento)');
      return;
    }
    const dispositivo = dispositivos.find(d => d.id === formData.dispositivo_id);
    const linhas = [
      `Veiculo: ${formData.placa}`,
      formData.descricao ? `Descricao: ${formData.descricao}` : null,
      formData.motorista ? `Motorista: ${formData.motorista}` : null,
      formData.tipo_veiculo ? `Tipo: ${formData.tipo_veiculo}` : null,
      dispositivo ? `Equipamento: ${dispositivo.nome_dispositivo || dispositivo.device_uuid}` : null,
      dispositivo ? `ID: ${dispositivo.device_uuid}` : null,
      formData.traccar_device_id ? `Traccar ID: ${formData.traccar_device_id}` : null,
    ].filter(Boolean);
    const mensagem = linhas.join('\n');

    try {
      setEnviandoSms(true);
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          estabelecimento_id: estabelecimentoId,
          destino: telefone,
          mensagem,
        },
      });
      if (error) throw error;
      if ((data as any)?.success) toast.success('SMS enviado ao equipamento');
      else toast.error((data as any)?.erro || 'Falha ao enviar SMS');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar SMS');
    } finally {
      setEnviandoSms(false);
    }
  };


  const handleDelete = async () => {
    if (!selectedVeiculo) return;

    try {
      const { error } = await supabase
        .from('veiculos')
        .delete()
        .eq('id', selectedVeiculo.id);

      if (error) throw error;
      toast.success('Veículo excluído');
      setDeleteDialogOpen(false);
      setSelectedVeiculo(null);
      fetchVeiculos();
    } catch (error: any) {
      console.error('Error deleting vehicle:', error);
      toast.error(error.message || 'Erro ao excluir veículo');
    }
  };

  const filteredVeiculos = veiculos.filter(v =>
    v.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.motorista?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar veículos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Veículo
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[140px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVeiculos.map(veiculo => (
              <TableRow key={veiculo.id}>
                <TableCell className="font-mono font-medium">{veiculo.placa}</TableCell>
                <TableCell>{veiculo.descricao || '-'}</TableCell>
                <TableCell>{veiculo.motorista || '-'}</TableCell>
                <TableCell>{veiculo.tipo_veiculo || '-'}</TableCell>
                <TableCell>
                  <Badge variant={veiculo.ativo ? 'default' : 'secondary'}>
                    {veiculo.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Bloquear/Liberar combustível"
                      onClick={() => {
                        setVeiculoBloqueio(veiculo);
                        setBloqueioOpen(true);
                      }}
                    >
                      <Fuel className="h-4 w-4 text-amber-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(veiculo)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedVeiculo(veiculo);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filteredVeiculos.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {loading ? 'Carregando...' : 'Nenhum veículo encontrado'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {selectedVeiculo ? 'Editar Veículo' : 'Novo Veículo'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Placa *</Label>
              <Input
                value={formData.placa}
                onChange={(e) => setFormData(prev => ({ ...prev, placa: e.target.value.toUpperCase() }))}
                placeholder="ABC-1234"
                maxLength={8}
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                placeholder="Ex: Fiorino Branca"
              />
            </div>

            <div>
              <Label>Motorista</Label>
              <Input
                value={formData.motorista}
                onChange={(e) => setFormData(prev => ({ ...prev, motorista: e.target.value }))}
                placeholder="Nome do motorista"
              />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select
                value={formData.tipo_veiculo}
                onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_veiculo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Dispositivo de Rastreamento
              </Label>
              <Tabs value={dispositivoTab} onValueChange={(v) => setDispositivoTab(v as 'selecionar' | 'digitar')} className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="selecionar">Selecionar Liberado</TabsTrigger>
                  <TabsTrigger value="digitar">Digitar ID</TabsTrigger>
                </TabsList>
                <TabsContent value="selecionar" className="mt-2">
                  <Select
                    value={formData.dispositivo_id || '__none__'}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      dispositivo_id: value === '__none__' ? '' : value,
                      traccar_device_id: '' // Clear manual ID when selecting device
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um dispositivo aprovado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {dispositivos
                        .filter(d => !d.veiculo_id || d.veiculo_id === selectedVeiculo?.id)
                        .map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.nome_dispositivo || d.device_uuid} ({d.device_uuid})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {dispositivos.filter(d => !d.veiculo_id || d.veiculo_id === selectedVeiculo?.id).length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Nenhum dispositivo aprovado disponível. Aprove dispositivos na aba "Dispositivos de Rastreamento".
                    </p>
                  )}
                </TabsContent>
                <TabsContent value="digitar" className="mt-2">
                  <Input
                    value={formData.traccar_device_id}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      traccar_device_id: e.target.value,
                      dispositivo_id: '' // Clear selected device when typing manual ID
                    }))}
                    placeholder="Ex: 123456 (ID do app Traccar)"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Informe o mesmo ID configurado no app Traccar Client
                  </p>
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Excluir Veículo"
        description={`Tem certeza que deseja excluir o veículo ${selectedVeiculo?.placa}? Esta ação não pode ser desfeita.`}
      />

      <BloqueioCombustivelDialog
        open={bloqueioOpen}
        onOpenChange={setBloqueioOpen}
        veiculo={veiculoBloqueio}
        estabelecimentoId={estabelecimentoId}
      />
    </div>
  );
};