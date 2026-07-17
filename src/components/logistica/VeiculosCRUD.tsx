import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Car, Search, Smartphone, Fuel, Send, Radio, CheckCircle2, AlertCircle, Loader2, RefreshCw, Copy, Check } from 'lucide-react';
import { BloqueioCombustivelDialog } from './BloqueioCombustivelDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Veiculo } from '@/types/logistica';
import { buildTrackerParametersSms, configurarRastreador, getTrackerRenderedCommands, TrackerModelLite } from '@/lib/trackerConfig';
import { OPERADORAS_APN, findOperadoraByApn } from '@/lib/operadorasSms';
import { VeiculosBulkImportDialog } from './VeiculosBulkImportDialog';
import DispositivosRastreamento from './DispositivosRastreamento';

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
  'Pessoa',
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

const TRACKING_URL = `${import.meta.env.VITE_SUPABASE_URL || 'https://ioxugupvxlcdweldocmq.supabase.co'}/functions/v1/rastreamento-posicao`;

export const VeiculosCRUD: React.FC<VeiculosCRUDProps> = ({ estabelecimentoId }) => {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoAprovado[]>([]);
  const [trackerModels, setTrackerModels] = useState<TrackerModelLite[]>([]);
  const [ultimasPosicoes, setUltimasPosicoes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<Veiculo | null>(null);
  const [bloqueioOpen, setBloqueioOpen] = useState(false);
  const [veiculoBloqueio, setVeiculoBloqueio] = useState<Veiculo | null>(null);
  const [dispositivoTab, setDispositivoTab] = useState<'selecionar' | 'digitar'>('selecionar');
  const [enviandoSms, setEnviandoSms] = useState(false);
  const [configurandoTracker, setConfigurandoTracker] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [mainTab, setMainTab] = useState<'veiculos' | 'dispositivos'>('veiculos');
  const [urlCopiada, setUrlCopiada] = useState(false);
  const [formData, setFormData] = useState({
    placa: '',
    descricao: '',
    motorista: '',
    tipo_veiculo: '',
    traccar_device_id: '',
    dispositivo_id: '',
    tracker_model_id: '',
    telefone_sms: '',
    tipo_chip: 'm2m' as 'normal' | 'm2m',
    operadora_id: '',
    enviar_sms_automatico: false,
    configurar_tracker_ao_salvar: true,
    ativo: true,
    tipo_dispositivo: 'rastreador' as 'rastreador' | 'app' | 'nenhum',
  });

  const isPessoa = formData.tipo_veiculo === 'Pessoa';

  // Aplica override de APN da operadora selecionada em uma cópia do modelo
  const modelComOperadora = (model: TrackerModelLite): TrackerModelLite => {
    const op = OPERADORAS_APN.find(o => o.id === formData.operadora_id);
    if (!op) return model;
    return { ...model, apn: op.apn, apn_user: op.apn_user, apn_password: op.apn_password };
  };

  useEffect(() => {
    fetchVeiculos();
    fetchDispositivos();
    fetchTrackerModels();
  }, [estabelecimentoId]);

  const fetchTrackerModels = async () => {
    try {
      const { data, error } = await supabase
        .from('tracker_device_models')
        .select('id,nome,protocolo,porta,host,senha_padrao,apn,apn_user,apn_password,sms_commands')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      setTrackerModels((data || []) as unknown as TrackerModelLite[]);
    } catch (e) {
      console.error('Error fetching tracker models:', e);
    }
  };

  const fetchVeiculos = async () => {
    try {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('placa');

      if (error) throw error;
      const list = (data || []) as Veiculo[];
      setVeiculos(list);

      // Última posição por veículo (para flag "Rastreador ativo")
      const ids = list.map(v => v.id);
      if (ids.length) {
        const { data: pos } = await supabase
          .from('veiculo_posicoes')
          .select('veiculo_id, data_hora')
          .in('veiculo_id', ids)
          .order('data_hora', { ascending: false });
        const map: Record<string, string> = {};
        (pos || []).forEach((p: any) => {
          if (!map[p.veiculo_id]) map[p.veiculo_id] = p.data_hora;
        });
        setUltimasPosicoes(map);
      } else {
        setUltimasPosicoes({});
      }
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
      const linkedTracker = !!((veiculo as any).tracker_model_id);
      setFormData({
        placa: veiculo.placa,
        descricao: veiculo.descricao || '',
        motorista: veiculo.motorista || '',
        tipo_veiculo: veiculo.tipo_veiculo || '',
        traccar_device_id: veiculo.traccar_device_id || '',
        dispositivo_id: linkedDevice?.id || '',
        tracker_model_id: (veiculo as any).tracker_model_id || '',
        telefone_sms: (veiculo as any).telefone_sms || '',
        tipo_chip: ((veiculo as any).tipo_chip as 'normal' | 'm2m') || 'm2m',
        operadora_id: findOperadoraByApn((veiculo as any).apn_operadora)?.id || '',
        enviar_sms_automatico: false,
        configurar_tracker_ao_salvar: !(veiculo as any).tracker_model_id ? true : false,
        ativo: veiculo.ativo,
        tipo_dispositivo: linkedDevice ? 'app' : (linkedTracker ? 'rastreador' : 'nenhum'),
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
        tracker_model_id: '',
        telefone_sms: '',
        tipo_chip: 'm2m',
        operadora_id: '',
        enviar_sms_automatico: false,
        configurar_tracker_ao_salvar: true,
        ativo: true,
        tipo_dispositivo: 'rastreador',
      });
    }
    setDispositivoTab('selecionar');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const identificador = formData.placa.trim();
    if (!identificador) {
      toast.error(isPessoa ? 'Nome é obrigatório' : 'Placa é obrigatória');
      return;
    }

    // Impede duplicidade de placa/nome no mesmo estabelecimento
    const normalized = isPessoa ? identificador : identificador.toUpperCase();
    const duplicado = veiculos.find(v =>
      v.id !== selectedVeiculo?.id &&
      (v.placa || '').trim().toUpperCase() === normalized.toUpperCase()
    );
    if (duplicado) {
      toast.error(isPessoa
        ? 'Já existe uma pessoa cadastrada com esse nome'
        : 'Já existe um veículo cadastrado com essa placa');
      return;
    }


    try {
      let veiculoId = selectedVeiculo?.id;

      if (selectedVeiculo) {
        const { error } = await supabase
          .from('veiculos')
          .update({
            placa: normalized,
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
            placa: normalized,
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

      // Persist telefone_sms + tracker_model_id + operadora APN na tabela veiculos
      if (veiculoId) {
        const opSel = OPERADORAS_APN.find(o => o.id === formData.operadora_id);
        await supabase
          .from('veiculos')
          .update({
            telefone_sms: formData.telefone_sms || null,
            tipo_chip: formData.tipo_chip || 'm2m',
            tracker_model_id: formData.tracker_model_id || null,
            apn_operadora: opSel?.apn || null,
          } as any)
          .eq('id', veiculoId);
      }

      // Envio automático de SMS com os dados do veículo (texto livre)
      if (formData.enviar_sms_automatico && formData.telefone_sms && veiculoId) {
        await enviarDadosPorSms(veiculoId, formData.telefone_sms);
      }

      // Configuração automática do rastreador físico via SMS.
      // Em celular normal envia apenas 1 SMS consolidado para conferência dos parâmetros.
      if (
        formData.configurar_tracker_ao_salvar &&
        formData.tracker_model_id &&
        formData.telefone_sms &&
        veiculoId
      ) {
        const model = trackerModels.find(m => m.id === formData.tracker_model_id);
        if (model && (model.sms_commands || []).length > 0) {
          if (formData.tipo_chip === 'normal') {
            toast.info('Enviando SMS único de conferência...');
            await enviarParametrosTrackerSmsUnico(modelComOperadora(model), formData.telefone_sms, veiculoId);
          } else {
            toast.info('Enviando configuração do rastreador por SMS...');
            const result = await configurarRastreador({
              estabelecimentoId,
              veiculoId,
              telefone: formData.telefone_sms,
              model: modelComOperadora(model),
              chipType: formData.tipo_chip === 'm2m' ? 'm2m' : 'normal',
            });
            if (result.status === 'configurado') toast.success('Rastreador configurado com sucesso!');
            else if (result.status === 'parcial') toast.warning('Configuração parcial — alguns SMS falharam. Veja o histórico.');
            else if (result.status === 'falhou') toast.error('Falha na configuração do rastreador');
          }
        }
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
    const nomeVeiculo = (formData.descricao || formData.placa || '').trim();
    const tipoVeiculo = (formData.tipo_veiculo || '').trim();

    if (!nomeVeiculo) {
      toast.error('Informe o nome/placa do veículo');
      return;
    }

    const model = trackerModels.find(m => m.id === formData.tracker_model_id);
    if (!model) {
      toast.error('Selecione o modelo do rastreador');
      return;
    }

    const modelOper = modelComOperadora(model);
    const server = (modelOper.host || '').trim();
    const port = String(modelOper.porta || '').trim();
    if (!server || !port) {
      toast.error('Configure host e porta do servidor no modelo do rastreador');
      return;
    }
    const mensagem = '0–3 dias: ainda são mais vulneráveis.\n4–7 dias: a fixação aumenta bastante.\n7–10 dias: a maioria dos enxertos já está bem presa';





    try {
      setEnviandoSms(true);
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          estabelecimento_id: estabelecimentoId,
          destino: telefone,
          mensagem,
          max_tentativas: 1,
        },
      });
      if (error) throw error;

      const ok = !!(data as any)?.success;
      if (ok) toast.success('SMS de dados enviado');
      else toast.error((data as any)?.erro || 'Falha ao enviar SMS');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar SMS');
    } finally {
      setEnviandoSms(false);
    }
  };

  const enviarParametrosTrackerSmsUnico = async (
    model: TrackerModelLite,
    telefoneOverride?: string,
    veiculoId?: string | null,
  ) => {
    const telefone = telefoneOverride || formData.telefone_sms;
    if (!telefone) {
      toast.error('Informe o telefone do chip do rastreador');
      return false;
    }

    const mensagem = buildTrackerParametersSms(model);
    const at = new Date().toISOString();

    try {
      const { data, error } = await supabase.functions.invoke('send-sms', {
        body: {
          estabelecimento_id: estabelecimentoId,
          destino: telefone,
          mensagem,
          max_tentativas: 1,
        },
      });
      if (error) throw error;

      const ok = !!(data as any)?.success;
      if (veiculoId) {
        await supabase
          .from('veiculos')
          .update({
            tracker_model_id: model.id,
            tracker_config_status: ok ? 'pendente' : 'falhou',
            tracker_config_at: at,
            tracker_config_log: [{
              label: 'Conferência em celular normal',
              template: 'sms_unico_parametros',
              rendered: mensagem,
              ok,
              provider_message_id: (data as any)?.provider_message_id ?? null,
              erro: ok ? null : ((data as any)?.erro || 'Falha ao enviar SMS'),
              at,
            }] as any,
            tracker_config_error: ok ? null : ((data as any)?.erro || 'Falha ao enviar SMS'),
          } as any)
          .eq('id', veiculoId);
      }

      if (ok) toast.success('SMS único de conferência enviado');
      else toast.error((data as any)?.erro || 'Falha ao enviar SMS');
      return ok;
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar SMS');
      return false;
    }
  };

  const configurarTrackerAgora = async () => {
    if (!formData.telefone_sms) {
      toast.error('Informe o telefone do chip do rastreador');
      return;
    }
    if (!formData.tracker_model_id) {
      toast.error('Selecione o modelo do rastreador');
      return;
    }
    const model = trackerModels.find(m => m.id === formData.tracker_model_id);
    if (!model) return;
    if ((model.sms_commands || []).length === 0) {
      toast.info('Este modelo não tem comandos SMS (é configurado por app).');
      return;
    }
    setConfigurandoTracker(true);
    try {
      if (formData.tipo_chip === 'normal') {
        await enviarParametrosTrackerSmsUnico(modelComOperadora(model), formData.telefone_sms, selectedVeiculo?.id || null);
        fetchVeiculos();
        return;
      }

      const result = await configurarRastreador({
        estabelecimentoId,
        veiculoId: selectedVeiculo?.id || null,
        telefone: formData.telefone_sms,
        model: modelComOperadora(model),
        chipType: formData.tipo_chip === 'm2m' ? 'm2m' : 'normal',
      });
      if (result.status === 'configurado') toast.success('Rastreador configurado!');
      else if (result.status === 'parcial') toast.warning('Parcial — alguns SMS falharam');
      else toast.error('Falha ao configurar');
      fetchVeiculos();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao configurar');
    } finally {
      setConfigurandoTracker(false);
    }
  };

  const reconfigurarVeiculo = async (v: Veiculo) => {
    const telefone = (v as any).telefone_sms as string | null;
    const modelId = (v as any).tracker_model_id as string | null;
    if (!telefone || !modelId) {
      toast.error('Este veículo não tem modelo ou telefone cadastrado');
      return;
    }
    const model = trackerModels.find(m => m.id === modelId);
    if (!model) { toast.error('Modelo não encontrado'); return; }
    toast.info('Reenviando configuração via SMS...');
    const result = await configurarRastreador({
      estabelecimentoId, veiculoId: v.id, telefone, model,
      chipType: (v as any).tipo_chip === 'm2m' ? 'm2m' : 'normal',
    });
    if (result.status === 'configurado') toast.success('Rastreador reconfigurado!');
    else if (result.status === 'parcial') toast.warning('Parcial — alguns SMS falharam');
    else toast.error('Falha ao reconfigurar');
    fetchVeiculos();
  };

  const renderTrackerStatusBadge = (v: Veiculo) => {
    const status = (v as any).tracker_config_status as string | undefined;
    const modelId = (v as any).tracker_model_id as string | undefined;
    if (!modelId) return null;
    switch (status) {
      case 'configurado':
        return <Badge className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" />Configurado</Badge>;
      case 'falhou':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="h-3 w-3" />Falhou</Badge>;
      case 'enviando':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Enviando</Badge>;
      default:
        return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" />Pendente</Badge>;
    }
  };

  // Flag "Rastreador ativo e funcionando": baseado na última posição recebida
  const renderTrackerOnlineBadge = (v: Veiculo) => {
    const modelId = (v as any).tracker_model_id as string | undefined;
    if (!modelId) return null;
    const last = ultimasPosicoes[v.id];
    if (!last) {
      return (
        <Badge variant="outline" className="gap-1" title="Nenhuma posição recebida ainda">
          <Radio className="h-3 w-3 text-muted-foreground" />Sem sinal
        </Badge>
      );
    }
    const diffMin = (Date.now() - new Date(last).getTime()) / 60000;
    const when = new Date(last).toLocaleString('pt-BR');
    if (diffMin <= 30) {
      return (
        <Badge className="bg-emerald-500 gap-1" title={`Última posição: ${when}`}>
          <Radio className="h-3 w-3" />Online
        </Badge>
      );
    }
    if (diffMin <= 24 * 60) {
      return (
        <Badge className="bg-amber-500 gap-1" title={`Última posição: ${when}`}>
          <Radio className="h-3 w-3" />Inativo
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="gap-1" title={`Última posição: ${when}`}>
        <Radio className="h-3 w-3" />Offline
      </Badge>
    );
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
    <div className="space-y-4 max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 sm:max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar veículos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="grid grid-cols-1 sm:flex sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setBulkOpen(true)} className="w-full sm:w-auto justify-center">
            <Plus className="h-4 w-4 mr-2" />
            Cadastro em massa
          </Button>
          <Button onClick={() => handleOpenDialog()} className="w-full sm:w-auto justify-center">
            <Plus className="h-4 w-4 mr-2" />
            Novo Veículo
          </Button>
        </div>
      </div>


      {/* Desktop / tablet grande: tabela */}
      <div className="hidden lg:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Placa</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Motorista</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Rastreador</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[180px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredVeiculos.map(veiculo => {
              const modelId = (veiculo as any).tracker_model_id as string | undefined;
              const model = modelId ? trackerModels.find(m => m.id === modelId) : null;
              return (
              <TableRow key={veiculo.id}>
                <TableCell className="font-mono font-medium">{veiculo.placa}</TableCell>
                <TableCell>{veiculo.descricao || '-'}</TableCell>
                <TableCell>{veiculo.motorista || '-'}</TableCell>
                <TableCell>{veiculo.tipo_veiculo || '-'}</TableCell>
                <TableCell>
                  {model ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium">{model.nome}</span>
                      <div className="flex flex-wrap gap-1">
                        {renderTrackerStatusBadge(veiculo)}
                        {renderTrackerOnlineBadge(veiculo)}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={veiculo.ativo ? 'default' : 'secondary'}>
                    {veiculo.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {model && (veiculo as any).telefone_sms && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => reconfigurarVeiculo(veiculo)}
                            >
                              <RefreshCw className="h-4 w-4 text-blue-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Reenviar configuração SMS</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Bloqueio de combustível"
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
              );
            })}
            {filteredVeiculos.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {loading ? 'Carregando...' : 'Nenhum veículo encontrado'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile / tablet: cards */}
      <div className="lg:hidden space-y-3">
        {filteredVeiculos.length === 0 && (
          <div className="border rounded-lg py-8 text-center text-sm text-muted-foreground">
            {loading ? 'Carregando...' : 'Nenhum veículo encontrado'}
          </div>
        )}
        {filteredVeiculos.map(veiculo => {
          const modelId = (veiculo as any).tracker_model_id as string | undefined;
          const model = modelId ? trackerModels.find(m => m.id === modelId) : null;
          return (
            <div key={veiculo.id} className="border rounded-lg p-3 space-y-2 bg-card">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-base">{veiculo.placa}</span>
                    <Badge variant={veiculo.ativo ? 'default' : 'secondary'} className="text-[10px]">
                      {veiculo.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  {veiculo.descricao && (
                    <div className="text-xs text-muted-foreground truncate mt-0.5">{veiculo.descricao}</div>
                  )}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  {model && (veiculo as any).telefone_sms && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => reconfigurarVeiculo(veiculo)} title="Reenviar SMS">
                      <RefreshCw className="h-4 w-4 text-blue-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" title="Combustível"
                    onClick={() => { setVeiculoBloqueio(veiculo); setBloqueioOpen(true); }}>
                    <Fuel className="h-4 w-4 text-amber-600" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(veiculo)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => { setSelectedVeiculo(veiculo); setDeleteDialogOpen(true); }}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {veiculo.motorista && (
                  <div className="min-w-0">
                    <span className="text-muted-foreground">Motorista: </span>
                    <span className="truncate">{veiculo.motorista}</span>
                  </div>
                )}
                {veiculo.tipo_veiculo && (
                  <div className="min-w-0">
                    <span className="text-muted-foreground">Tipo: </span>
                    <span>{veiculo.tipo_veiculo}</span>
                  </div>
                )}
              </div>
              {model && (
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
                  <span className="text-[11px] text-muted-foreground">Rastreador:</span>
                  <span className="text-xs font-medium truncate">{model.nome}</span>
                  {renderTrackerStatusBadge(veiculo)}
                  {renderTrackerOnlineBadge(veiculo)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 sm:w-full">
          <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Car className="h-5 w-5 text-primary" />
              {selectedVeiculo ? 'Editar Veículo' : 'Novo Veículo'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-6 py-4 space-y-5">
            {/* Veículo ativo — topo */}
            <div className="flex items-center justify-between border rounded-lg px-3 py-2 bg-muted/30">
              <Label htmlFor="veiculo-ativo" className="cursor-pointer">Veículo ativo</Label>
              <Switch
                id="veiculo-ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, ativo: checked }))}
              />
            </div>

            {/* Bloco: dados básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>


            <div>
              <Label className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Dispositivo de Rastreamento (app aprovado)
              </Label>
              <div className="mt-2">
                <Select
                  value={formData.dispositivo_id || '__none__'}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    dispositivo_id: value === '__none__' ? '' : value,
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
              </div>
            </div>

            {/* Telefone único usado pelos dois blocos */}
            <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
              <Label className="text-xs">Telefone do chip / SIM do equipamento</Label>
              <Input
                value={formData.telefone_sms}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone_sms: e.target.value }))}
                placeholder="+5511999999999"
                className="mt-1"
              />
              <div>
                <Label className="text-xs">IMEI do rastreador</Label>
                <Input
                  value={formData.traccar_device_id}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    traccar_device_id: e.target.value.replace(/\D/g, ''),
                  }))}
                  placeholder="Ex: 353456789012345"
                  inputMode="numeric"
                  maxLength={17}
                  className="mt-1"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  IMEI do aparelho rastreador físico (GT06/J6/JM01 etc.). É este número que vincula as posições recebidas a este veículo.
                </p>
              </div>
              <div>
                <Label className="text-xs">Tipo do chip</Label>
                <Select
                  value={formData.tipo_chip}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, tipo_chip: v as 'normal' | 'm2m' }))}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m2m">M2M / Equipamento rastreador</SelectItem>
                    <SelectItem value="normal">Celular normal (teste — Android/iOS)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Use <b>Celular normal</b> para testes: o SMS será enviado a um telefone comum via app Pilar SMS (Android/iOS).
                  Selecione <b>M2M</b> quando o chip estiver no equipamento rastreador em campo.
                </p>
              </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Bloco Rastreador físico via SMS */}
              <div className="border rounded-lg p-3 space-y-3 bg-primary/5 border-primary/20">
                <Label className="flex items-center gap-2 text-sm font-semibold">
                  <Radio className="h-4 w-4 text-primary" />
                  Rastreador físico (SMS)
                </Label>

                <div>
                  <Label className="text-xs">Modelo do rastreador</Label>
                  <Select
                    value={formData.tracker_model_id || '__none__'}
                    onValueChange={(v) => setFormData(prev => ({
                      ...prev, tracker_model_id: v === '__none__' ? '' : v,
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {trackerModels.map(m => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome} — {m.protocolo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {trackerModels.length === 0 && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Nenhum modelo cadastrado. Vá em Pilar Rastreador → Modelos.
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-xs">Operadora do chip (APN automático)</Label>
                  <Select
                    value={formData.operadora_id || '__model__'}
                    onValueChange={(v) => setFormData(prev => ({
                      ...prev, operadora_id: v === '__model__' ? '' : v,
                    }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Usar APN do modelo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__model__">Usar APN do modelo</SelectItem>
                      {OPERADORAS_APN.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.nome} — {o.apn}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Sobrescreve APN/usuário/senha do modelo apenas para este chip.
                  </p>
                </div>

                {formData.tracker_model_id && (() => {
                  const baseModel = trackerModels.find(m => m.id === formData.tracker_model_id);
                  if (!baseModel) return null;
                  const model = modelComOperadora(baseModel);
                  const cmds = getTrackerRenderedCommands(model);
                  return (
                    <div className="rounded-md border bg-background p-2 space-y-1 max-h-32 overflow-y-auto">
                      <p className="text-[11px] text-muted-foreground mb-1">
                        {formData.tipo_chip === 'normal'
                          ? 'Texto que será enviado em 1 SMS de conferência:'
                          : `SMS que serão enviados (${cmds.length}):`}
                      </p>
                      {cmds.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sem comandos — configure pelo app.</p>
                      ) : formData.tipo_chip === 'normal' ? (
                        <div className="text-[11px] leading-tight break-words">
                          <code className="text-[10px] break-all">{buildTrackerParametersSms(model)}</code>
                        </div>
                      ) : cmds.map((c, i) => (
                        <div key={i} className="text-[11px] leading-tight break-words">
                          <span className="font-medium">{c.label}:</span>{' '}
                          <code className="text-[10px] break-all">{c.rendered}</code>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {formData.tipo_chip === 'normal' && (
                  <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-900 dark:text-amber-200">
                    ⚠️ O envio para <b>celular normal</b> pode chegar com parâmetros faltando devido a bloqueios da operadora contra SMS em lote.
                    Para configuração confiável, use um <b>chip M2M</b> instalado no equipamento rastreador.
                  </div>
                )}


                <Button
                  type="button" variant="outline" size="sm" className="w-full"
                  disabled={configurandoTracker || !formData.tracker_model_id || !formData.telefone_sms}
                  onClick={configurarTrackerAgora}
                >
                  {configurandoTracker
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Configurando...</>
                    : formData.tipo_chip === 'normal'
                      ? <><Send className="h-4 w-4 mr-2" />Enviar conferência em 1 SMS</>
                      : <><Radio className="h-4 w-4 mr-2" />Configurar agora</>}
                </Button>

                {selectedVeiculo && (selectedVeiculo as any).tracker_config_status && (
                  <div className="rounded-md border bg-background p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium">Último resultado:</span>
                      {renderTrackerStatusBadge(selectedVeiculo)}
                    </div>
                    {Array.isArray((selectedVeiculo as any).tracker_config_log) &&
                      (selectedVeiculo as any).tracker_config_log.length > 0 && (
                      <div className="space-y-1 max-h-24 overflow-y-auto">
                        {((selectedVeiculo as any).tracker_config_log as any[]).map((l, i) => (
                          <div key={i} className="text-xs flex items-start gap-2">
                            {l.ok
                              ? <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />
                              : <AlertCircle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">{l.label}</span>
                              {l.erro && <div className="text-destructive text-[10px] break-words">{l.erro}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

          </div>


          <DialogFooter className="px-4 sm:px-6 py-3 border-t bg-muted/30 gap-2 flex-col-reverse sm:flex-row">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">
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

      <VeiculosBulkImportDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        estabelecimentoId={estabelecimentoId}
        trackerModels={trackerModels}
        onDone={fetchVeiculos}
      />
    </div>
  );
};