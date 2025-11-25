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
import { Pencil, Trash2, Plus, Clock, AlertTriangle, TrendingUp, HelpCircle } from 'lucide-react';
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
            <DialogTitle className="text-xl">
              {selectedConfig ? "Editar Configuração SLA" : "Nova Configuração SLA"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Informações Básicas */}
            <div className="border rounded-lg p-3 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Informações Básicas
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label htmlFor="nome" className="text-sm">
                    Nome da Configuração *
                  </Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) =>
                      setFormData({ ...formData, nome: e.target.value })
                    }
                    placeholder="Ex: SLA Suporte Básico"
                    className="mt-1"
                    maxLength={100}
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="descricao" className="text-sm">
                    Descrição
                  </Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao: e.target.value })
                    }
                    placeholder="Descreva quando esta configuração deve ser aplicada"
                    className="mt-1 min-h-[60px] resize-none"
                    maxLength={500}
                  />
                </div>

                <div>
                  <Label htmlFor="fila_id" className="text-sm">
                    Fila de Atendimento
                  </Label>
                  <Select
                    value={formData.fila_id || undefined}
                    onValueChange={(value) =>
                      setFormData({ ...formData, fila_id: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Todas as filas" />
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

                <div className="flex items-end">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="ativo"
                      checked={formData.ativo}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, ativo: checked })
                      }
                    />
                    <Label htmlFor="ativo" className="text-sm cursor-pointer">
                      Configuração Ativa
                    </Label>
                  </div>
                </div>
              </div>
            </div>


            {/* Tempos de SLA */}
            <div className="border rounded-lg p-3 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-primary" />
                Tempos de SLA (minutos)
              </h3>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="tempo_primeira_resposta" className="text-sm">
                    Primeira Resposta *
                  </Label>
                  <Input
                    id="tempo_primeira_resposta"
                    type="number"
                    min="1"
                    value={Math.floor(formData.tempo_primeira_resposta / 60)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tempo_primeira_resposta: (parseInt(e.target.value) || 0) * 60,
                      })
                    }
                    placeholder="5"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tempo_resposta_subsequente" className="text-sm">
                    Resp. Subsequente *
                  </Label>
                  <Input
                    id="tempo_resposta_subsequente"
                    type="number"
                    min="1"
                    value={Math.floor(formData.tempo_resposta_subsequente / 60)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tempo_resposta_subsequente: (parseInt(e.target.value) || 0) * 60,
                      })
                    }
                    placeholder="10"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="tempo_resolucao" className="text-sm">
                    Resolução Total *
                  </Label>
                  <Input
                    id="tempo_resolucao"
                    type="number"
                    min="1"
                    value={Math.floor(formData.tempo_resolucao / 60)}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        tempo_resolucao: (parseInt(e.target.value) || 0) * 60,
                      })
                    }
                    placeholder="60"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Alertas */}
            <div className="border rounded-lg p-3 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Alertas
              </h3>
              
              <div>
                <Label htmlFor="alerta_porcentagem" className="text-sm">
                  Porcentagem para Alerta (%) *
                </Label>
                <Input
                  id="alerta_porcentagem"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.alerta_porcentagem}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      alerta_porcentagem: parseInt(e.target.value) || 0,
                    })
                  }
                  placeholder="80"
                  className="mt-1 max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Alerta quando atingir este percentual do tempo SLA
                </p>
              </div>
            </div>

            {/* Ações Automáticas */}
            <div className="border rounded-lg p-3 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="text-primary">⚡</span>
                Ações Automáticas
              </h3>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 border rounded p-2">
                  <Switch
                    id="notificar_supervisor"
                    checked={formData.notificar_supervisor}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, notificar_supervisor: checked })
                    }
                  />
                  <Label htmlFor="notificar_supervisor" className="text-sm cursor-pointer">
                    Notificar Supervisor
                  </Label>
                </div>

                {formData.notificar_supervisor && (
                  <div className={`ml-6 ${formData.notificar_supervisor && !formData.supervisor_id ? "border-destructive" : "border-border"} border rounded p-2`}>
                    <Label htmlFor="supervisor_id" className="text-sm">
                      Supervisor Responsável *
                    </Label>
                    <Select
                      value={formData.supervisor_id || ""}
                      onValueChange={(value) =>
                        setFormData({ ...formData, supervisor_id: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione o supervisor" />
                      </SelectTrigger>
                      <SelectContent>
                        {usuarios.map((usuario) => (
                          <SelectItem key={usuario.id} value={usuario.id}>
                            {usuario.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.notificar_supervisor && !formData.supervisor_id && (
                      <p className="text-xs text-destructive mt-1">
                        ⚠️ Supervisor obrigatório
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center space-x-2 border rounded p-2">
                  <Switch
                    id="aumentar_prioridade_automatica"
                    checked={formData.aumentar_prioridade_automatica}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, aumentar_prioridade_automatica: checked })
                    }
                  />
                  <Label htmlFor="aumentar_prioridade_automatica" className="text-sm cursor-pointer">
                    Aumentar Prioridade Automaticamente
                  </Label>
                </div>

                <div className="flex items-center space-x-2 border rounded p-2">
                  <Switch
                    id="escalar_automaticamente"
                    checked={formData.escalar_automaticamente}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        escalar_automaticamente: checked,
                      })
                    }
                  />
                  <Label htmlFor="escalar_automaticamente" className="text-sm cursor-pointer">
                    Escalar Automaticamente
                  </Label>
                </div>

                {formData.escalar_automaticamente && (
                  <div className={`ml-6 ${formData.escalar_automaticamente && !formData.fila_escalacao_id ? "border-destructive" : "border-border"} border rounded p-2`}>
                    <Label htmlFor="fila_escalacao_id" className="text-sm">
                      Fila de Escalação *
                    </Label>
                    <Select
                      value={formData.fila_escalacao_id || ""}
                      onValueChange={(value) =>
                        setFormData({ ...formData, fila_escalacao_id: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Selecione a fila" />
                      </SelectTrigger>
                      <SelectContent>
                        {filas.map((fila) => (
                          <SelectItem key={fila.id} value={fila.id}>
                            {fila.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.escalar_automaticamente && !formData.fila_escalacao_id && (
                      <p className="text-xs text-destructive mt-1">
                        ⚠️ Fila obrigatória
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Status removido daqui pois já está em Informações Básicas */}
          </div>

          <DialogFooter className="mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={!formData.nome}>
              {selectedConfig ? "Atualizar" : "Criar"}
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
