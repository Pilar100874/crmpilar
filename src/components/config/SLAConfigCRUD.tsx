import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/lib/toast-config';
import { Pencil, Trash2, Plus, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { z } from 'zod';

interface SLAConfig {
  id: string;
  estabelecimento_id: string;
  fila_id: string | null;
  nome: string;
  descricao: string | null;
  tempo_primeira_resposta: number;
  tempo_resposta_subsequente: number;
  tempo_resolucao: number;
  considera_horario_comercial: boolean;
  horario_funcionamento: any;
  multiplicador_urgente: number;
  multiplicador_alta: number;
  multiplicador_normal: number;
  multiplicador_baixa: number;
  alerta_porcentagem: number;
  notificar_supervisor: boolean;
  aumentar_prioridade_automatica: boolean;
  supervisor_id: string | null;
  escalar_automaticamente: boolean;
  fila_escalacao_id: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

interface Fila {
  id: string;
  nome: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

const slaConfigSchema = z.object({
  nome: z.string().trim().min(1, { message: "Nome é obrigatório" }).max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  descricao: z.string().max(500, { message: "Descrição deve ter no máximo 500 caracteres" }).optional(),
  tempo_primeira_resposta: z.number().min(1, { message: "Tempo de primeira resposta deve ser maior que 0" }),
  tempo_resposta_subsequente: z.number().min(1, { message: "Tempo de resposta subsequente deve ser maior que 0" }),
  tempo_resolucao: z.number().min(1, { message: "Tempo de resolução deve ser maior que 0" }),
  alerta_porcentagem: z.number().min(1).max(100, { message: "Porcentagem deve estar entre 1 e 100" }),
  notificar_supervisor: z.boolean(),
  supervisor_id: z.string().optional(),
  escalar_automaticamente: z.boolean(),
  fila_escalacao_id: z.string().optional(),
}).refine((data) => {
  // Se notificar supervisor estiver ativo, supervisor_id é obrigatório
  if (data.notificar_supervisor && !data.supervisor_id) {
    return false;
  }
  return true;
}, {
  message: "Supervisor é obrigatório quando a notificação estiver ativada",
  path: ["supervisor_id"],
}).refine((data) => {
  // Se escalar automaticamente estiver ativo, fila_escalacao_id é obrigatória
  if (data.escalar_automaticamente && !data.fila_escalacao_id) {
    return false;
  }
  return true;
}, {
  message: "Fila de escalação é obrigatória quando a escalação automática estiver ativada",
  path: ["fila_escalacao_id"],
});

export default function SLAConfigCRUD({ estabelecimentoId }: { estabelecimentoId: string }) {
  const [configs, setConfigs] = useState<SLAConfig[]>([]);
  const [filas, setFilas] = useState<Fila[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<SLAConfig | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    fila_id: '',
    tempo_primeira_resposta: 300,
    tempo_resposta_subsequente: 600,
    tempo_resolucao: 3600,
    considera_horario_comercial: true,
    multiplicador_urgente: 0.5,
    multiplicador_alta: 0.75,
    multiplicador_normal: 1.0,
    multiplicador_baixa: 1.5,
    alerta_porcentagem: 80,
    notificar_supervisor: true,
    aumentar_prioridade_automatica: false,
    supervisor_id: '',
    escalar_automaticamente: false,
    fila_escalacao_id: '',
    ativo: true,
  });

  useEffect(() => {
    loadConfigs();
    loadFilas();
    loadUsuarios();
  }, [estabelecimentoId]);

  const loadConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('sla_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConfigs(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar configurações de SLA:', error);
      toast.error('Erro ao carregar configurações de SLA');
    } finally {
      setLoading(false);
    }
  };

  const loadFilas = async () => {
    try {
      const { data, error } = await supabase
        .from('filas_atendimento')
        .select('id, nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativa', true)
        .order('nome');

      if (error) throw error;
      setFilas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar filas:', error);
    }
  };

  const loadUsuarios = async () => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setUsuarios(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  const handleSave = async () => {
    try {
      // Validar dados do formulário
      const validationResult = slaConfigSchema.safeParse({
        nome: formData.nome,
        descricao: formData.descricao,
        tempo_primeira_resposta: formData.tempo_primeira_resposta,
        tempo_resposta_subsequente: formData.tempo_resposta_subsequente,
        tempo_resolucao: formData.tempo_resolucao,
        alerta_porcentagem: formData.alerta_porcentagem,
        notificar_supervisor: formData.notificar_supervisor,
        supervisor_id: formData.supervisor_id,
        escalar_automaticamente: formData.escalar_automaticamente,
        fila_escalacao_id: formData.fila_escalacao_id,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        return;
      }

      const dataToSave = {
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome.trim(),
        descricao: formData.descricao?.trim() || null,
        fila_id: formData.fila_id || null,
        tempo_primeira_resposta: formData.tempo_primeira_resposta,
        tempo_resposta_subsequente: formData.tempo_resposta_subsequente,
        tempo_resolucao: formData.tempo_resolucao,
        considera_horario_comercial: formData.considera_horario_comercial,
        multiplicador_urgente: formData.multiplicador_urgente,
        multiplicador_alta: formData.multiplicador_alta,
        multiplicador_normal: formData.multiplicador_normal,
        multiplicador_baixa: formData.multiplicador_baixa,
        alerta_porcentagem: formData.alerta_porcentagem,
        notificar_supervisor: formData.notificar_supervisor,
        aumentar_prioridade_automatica: formData.aumentar_prioridade_automatica,
        supervisor_id: formData.supervisor_id || null,
        escalar_automaticamente: formData.escalar_automaticamente,
        fila_escalacao_id: formData.fila_escalacao_id || null,
        ativo: formData.ativo,
      };

      if (selectedConfig) {
        const { error } = await supabase
          .from('sla_config')
          .update(dataToSave)
          .eq('id', selectedConfig.id);

        if (error) throw error;
        toast.success('Configuração de SLA atualizada!');
      } else {
        const { error } = await supabase
          .from('sla_config')
          .insert(dataToSave);

        if (error) throw error;
        toast.success('Configuração de SLA criada!');
      }

      setDialogOpen(false);
      loadConfigs();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração de SLA');
    }
  };

  const handleEdit = (config: SLAConfig) => {
    setSelectedConfig(config);
    setFormData({
      nome: config.nome,
      descricao: config.descricao || '',
      fila_id: config.fila_id || '',
      tempo_primeira_resposta: config.tempo_primeira_resposta,
      tempo_resposta_subsequente: config.tempo_resposta_subsequente,
      tempo_resolucao: config.tempo_resolucao,
      considera_horario_comercial: config.considera_horario_comercial,
      multiplicador_urgente: config.multiplicador_urgente,
      multiplicador_alta: config.multiplicador_alta,
      multiplicador_normal: config.multiplicador_normal,
      multiplicador_baixa: config.multiplicador_baixa,
      alerta_porcentagem: config.alerta_porcentagem,
      notificar_supervisor: config.notificar_supervisor,
      aumentar_prioridade_automatica: config.aumentar_prioridade_automatica,
      supervisor_id: config.supervisor_id || '',
      escalar_automaticamente: config.escalar_automaticamente,
      fila_escalacao_id: config.fila_escalacao_id || '',
      ativo: config.ativo,
    });
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedConfig) return;

    try {
      const { error } = await supabase
        .from('sla_config')
        .delete()
        .eq('id', selectedConfig.id);

      if (error) throw error;

      toast.success('Configuração de SLA excluída!');
      setDeleteDialogOpen(false);
      setSelectedConfig(null);
      loadConfigs();
    } catch (error: any) {
      console.error('Erro ao excluir configuração:', error);
      toast.error('Erro ao excluir configuração de SLA');
    }
  };

  const resetForm = () => {
    setSelectedConfig(null);
    setFormData({
      nome: '',
      descricao: '',
      fila_id: '',
      tempo_primeira_resposta: 300,
      tempo_resposta_subsequente: 600,
      tempo_resolucao: 3600,
      considera_horario_comercial: true,
      multiplicador_urgente: 0.5,
      multiplicador_alta: 0.75,
      multiplicador_normal: 1.0,
      multiplicador_baixa: 1.5,
      alerta_porcentagem: 80,
      notificar_supervisor: true,
      aumentar_prioridade_automatica: false,
      supervisor_id: '',
      escalar_automaticamente: false,
      fila_escalacao_id: '',
      ativo: true,
    });
  };

  const formatarTempo = (segundos: number) => {
    const horas = Math.floor(segundos / 3600);
    const minutos = Math.floor((segundos % 3600) / 60);
    if (horas > 0) return `${horas}h ${minutos}min`;
    return `${minutos}min`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Configurações de SLA</CardTitle>
              <CardDescription>
                Gerencie os níveis de serviço (SLA) para suas filas de atendimento
              </CardDescription>
            </div>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              Nova Configuração
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Carregando...</div>
          ) : configs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma configuração de SLA cadastrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Fila</TableHead>
                  <TableHead>Primeira Resposta</TableHead>
                  <TableHead>Resolução</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell className="font-medium">{config.nome}</TableCell>
                    <TableCell>
                      {config.fila_id
                        ? filas.find(f => f.id === config.fila_id)?.nome || 'Fila não encontrada'
                        : 'Todas as filas'}
                    </TableCell>
                    <TableCell>{formatarTempo(config.tempo_primeira_resposta)}</TableCell>
                    <TableCell>{formatarTempo(config.tempo_resolucao)}</TableCell>
                    <TableCell>
                      {config.ativo ? (
                        <span className="text-green-600">Ativo</span>
                      ) : (
                        <span className="text-muted-foreground">Inativo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(config)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedConfig(config);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedConfig ? 'Editar' : 'Nova'} Configuração de SLA
            </DialogTitle>
            <DialogDescription>
              Configure os tempos de resposta e resolução esperados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Informações Básicas
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: SLA Padrão, SLA Suporte Premium"
                    required
                    maxLength={100}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição opcional desta configuração"
                    maxLength={500}
                  />
                </div>

                <div>
                  <Label>Fila</Label>
                  <Select
                    value={formData.fila_id || undefined}
                    onValueChange={(value) => setFormData({ ...formData, fila_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as filas (padrão)" />
                    </SelectTrigger>
                    <SelectContent>
                      {filas.map((fila) => (
                        <SelectItem key={fila.id} value={fila.id}>
                          {fila.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label>Configuração ativa</Label>
                </div>
              </div>
            </div>

            {/* Tempos de Resposta */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Tempos de Resposta (em segundos)
              </h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Primeira Resposta *</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={formData.tempo_primeira_resposta}
                    onChange={(e) => setFormData({ ...formData, tempo_primeira_resposta: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatarTempo(formData.tempo_primeira_resposta)}
                  </p>
                </div>

                <div>
                  <Label>Respostas Subsequentes *</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={formData.tempo_resposta_subsequente}
                    onChange={(e) => setFormData({ ...formData, tempo_resposta_subsequente: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatarTempo(formData.tempo_resposta_subsequente)}
                  </p>
                </div>

                <div>
                  <Label>Resolução Total *</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={formData.tempo_resolucao}
                    onChange={(e) => setFormData({ ...formData, tempo_resolucao: parseInt(e.target.value) || 1 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatarTempo(formData.tempo_resolucao)}
                  </p>
                </div>
              </div>
            </div>

            {/* Multiplicadores de Prioridade */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Multiplicadores por Prioridade
              </h3>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <Label>Urgente</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.multiplicador_urgente}
                    onChange={(e) => setFormData({ ...formData, multiplicador_urgente: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(formData.multiplicador_urgente * 100).toFixed(0)}%
                  </p>
                </div>

                <div>
                  <Label>Alta</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.multiplicador_alta}
                    onChange={(e) => setFormData({ ...formData, multiplicador_alta: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(formData.multiplicador_alta * 100).toFixed(0)}%
                  </p>
                </div>

                <div>
                  <Label>Normal</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.multiplicador_normal}
                    onChange={(e) => setFormData({ ...formData, multiplicador_normal: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(formData.multiplicador_normal * 100).toFixed(0)}%
                  </p>
                </div>

                <div>
                  <Label>Baixa</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.multiplicador_baixa}
                    onChange={(e) => setFormData({ ...formData, multiplicador_baixa: parseFloat(e.target.value) })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {(formData.multiplicador_baixa * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            {/* Alertas e Escalação */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Alertas e Escalação
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Porcentagem para Alerta (%) *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.alerta_porcentagem}
                    onChange={(e) => setFormData({ ...formData, alerta_porcentagem: parseInt(e.target.value) || 80 })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Alertar quando atingir {formData.alerta_porcentagem}% do tempo
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    checked={formData.notificar_supervisor}
                    onCheckedChange={(checked) => setFormData({ ...formData, notificar_supervisor: checked })}
                  />
                  <Label>Notificar supervisor</Label>
                </div>

                {formData.notificar_supervisor && (
                  <div className="col-span-2">
                    <Label>Supervisor *</Label>
                    <Select
                      value={formData.supervisor_id || undefined}
                      onValueChange={(value) => setFormData({ ...formData, supervisor_id: value })}
                      required
                    >
                      <SelectTrigger className={!formData.supervisor_id ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Selecione o supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuarios.map((usuario) => (
                          <SelectItem key={usuario.id} value={usuario.id}>
                            {usuario.nome} ({usuario.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Obrigatório quando notificação de supervisor estiver ativa
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.aumentar_prioridade_automatica}
                    onCheckedChange={(checked) => setFormData({ ...formData, aumentar_prioridade_automatica: checked })}
                  />
                  <Label>Aumentar prioridade automaticamente</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.escalar_automaticamente}
                    onCheckedChange={(checked) => setFormData({ ...formData, escalar_automaticamente: checked })}
                  />
                  <Label>Escalar automaticamente</Label>
                </div>

                {formData.escalar_automaticamente && (
                  <div className="col-span-2">
                    <Label>Fila de Escalação *</Label>
                    <Select
                      value={formData.fila_escalacao_id}
                      onValueChange={(value) => setFormData({ ...formData, fila_escalacao_id: value })}
                      required
                    >
                      <SelectTrigger className={!formData.fila_escalacao_id ? 'border-destructive' : ''}>
                        <SelectValue placeholder="Selecione a fila para escalação" />
                      </SelectTrigger>
                      <SelectContent>
                        {filas.map((fila) => (
                          <SelectItem key={fila.id} value={fila.id}>
                            {fila.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Obrigatório quando escalação automática estiver ativa
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.nome}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Excluir configuração de SLA"
        description="Tem certeza que deseja excluir esta configuração? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
