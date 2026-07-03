import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Trash2, Radio, Zap, Copy, Check, RotateCcw } from 'lucide-react';

interface SmsCommand {
  label: string;
  template: string;
  descricao?: string;
}

interface TrackerModel {
  id: string;
  estabelecimento_id: string;
  nome: string;
  protocolo: string;
  porta: number;
  host: string | null;
  senha_padrao: string | null;
  apn: string | null;
  apn_user: string | null;
  apn_password: string | null;
  descricao: string | null;
  supports_bloqueio: boolean;
  sms_commands: SmsCommand[];
  is_default: boolean;
  ativo: boolean;
  ordem: number;
}

interface Props { estabelecimentoId: string; }

const DEFAULT_MODELS_TEMPLATE = [
  {
    nome: 'TK103 / GPS103', protocolo: 'gps103', porta: 5001, host: 'crm.pilar.com.br',
    senha_padrao: '123456', apn: 'zap.vivo.com.br', apn_user: '', apn_password: '',
    descricao: 'Rastreadores TK103/GPS103. Envie os SMS abaixo para o número do chip.',
    supports_bloqueio: false, ordem: 1, is_default: true,
    sms_commands: [
      { label: 'Iniciar rastreador', template: 'begin{password}', descricao: 'Ativa o aparelho' },
      { label: 'Configurar APN', template: 'apn{password} {apn}', descricao: 'Define o APN da operadora' },
      { label: 'Configurar servidor', template: 'adminip{password} {host} {port}', descricao: 'Aponta para o servidor Pilar' },
      { label: 'Intervalo de envio (30s)', template: 'fix030s***n{password}', descricao: 'Reporta posição a cada 30s' },
    ],
  },
  {
    nome: 'GT06 / J16 / TK100', protocolo: 'gt06', porta: 5023, host: 'crm.pilar.com.br',
    senha_padrao: '123456', apn: 'zap.vivo.com.br', apn_user: '', apn_password: '',
    descricao: 'Rastreadores GT06/J16/TK100 (com corte de ignição).',
    supports_bloqueio: true, ordem: 2, is_default: true,
    sms_commands: [
      { label: 'Configurar servidor', template: 'SERVER,1,{host},{port},0#', descricao: 'Aponta para o servidor Pilar' },
      { label: 'Configurar APN', template: 'APN,{apn},{apn_user},{apn_password}#', descricao: 'Define APN da operadora' },
      { label: 'Intervalo de envio', template: 'TIMER,30,60#', descricao: '30s em movimento, 60s parado' },
      { label: 'Ativar GPRS', template: 'GPRSON,1#', descricao: 'Liga transmissão via dados' },
      { label: 'Bloquear combustível', template: 'RELAY,1#', descricao: 'Corta ignição/combustível' },
      { label: 'Liberar combustível', template: 'RELAY,0#', descricao: 'Restaura ignição/combustível' },
    ],
  },
  {
    nome: 'Mictrack MT532 / MT600', protocolo: 'mictrack', porta: 5031, host: 'crm.pilar.com.br',
    senha_padrao: '123456', apn: 'zap.vivo.com.br', apn_user: '', apn_password: '',
    descricao: 'Rastreadores Mictrack MT532 / MT600.',
    supports_bloqueio: false, ordem: 3, is_default: true,
    sms_commands: [
      { label: 'Configurar servidor', template: 'A21,1,{host},{port},{apn},{apn_user},{apn_password}#', descricao: 'Servidor + APN em um único SMS' },
      { label: 'Intervalo de envio', template: 'A22,30,60#', descricao: '30s em movimento, 60s parado' },
      { label: 'Reiniciar', template: 'E91#', descricao: 'Reinicia o rastreador' },
    ],
  },
  {
    nome: 'Suntech ST300 / ST340', protocolo: 'suntech', porta: 5011, host: 'crm.pilar.com.br',
    senha_padrao: '123456', apn: 'zap.vivo.com.br', apn_user: '', apn_password: '',
    descricao: 'Rastreadores Suntech ST300/ST340.',
    supports_bloqueio: false, ordem: 4, is_default: true,
    sms_commands: [
      { label: 'Configurar servidor', template: 'ST300NTW;IMEI;01;1;{apn};{apn_user};{apn_password};{host};{port};;;;', descricao: 'Substitua IMEI pelo número do aparelho' },
      { label: 'Intervalo de envio', template: 'ST300RPT;IMEI;01;30;60', descricao: '30s em movimento, 60s parado' },
    ],
  },
  {
    nome: 'Traccar Client / OsmAnd', protocolo: 'osmand', porta: 5055, host: 'crm.pilar.com.br',
    senha_padrao: '', apn: '', apn_user: '', apn_password: '',
    descricao: 'App Traccar Client ou OsmAnd rodando no celular. Sem SMS — configure diretamente no app.',
    supports_bloqueio: false, ordem: 5, is_default: true,
    sms_commands: [],
  },
];

export const TrackerDeviceModels: React.FC<Props> = ({ estabelecimentoId }) => {
  const [models, setModels] = useState<TrackerModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<TrackerModel | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState<TrackerModel>(emptyForm(estabelecimentoId));

  function emptyForm(estabId: string): TrackerModel {
    return {
      id: '', estabelecimento_id: estabId, nome: '', protocolo: '', porta: 5023,
      host: 'crm.pilar.com.br', senha_padrao: '123456', apn: 'zap.vivo.com.br',
      apn_user: '', apn_password: '', descricao: '',
      supports_bloqueio: false, sms_commands: [], is_default: false, ativo: true, ordem: 99,
    };
  }

  useEffect(() => { if (estabelecimentoId) load(); }, [estabelecimentoId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tracker_device_models')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem', { ascending: true });
      if (error) throw error;
      let list = (data || []) as unknown as TrackerModel[];
      // Auto-seed if empty
      if (list.length === 0) {
        const inserts = DEFAULT_MODELS_TEMPLATE.map(m => ({
          ...m,
          estabelecimento_id: estabelecimentoId,
          sms_commands: m.sms_commands as any,
        }));
        const { data: inserted, error: e2 } = await supabase
          .from('tracker_device_models')
          .insert(inserts as any)
          .select('*')
          .order('ordem', { ascending: true });
        if (e2) throw e2;
        list = (inserted || []) as unknown as TrackerModel[];
      }
      setModels(list);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erro ao carregar modelos');
    } finally { setLoading(false); }
  };

  const openNew = () => {
    setSelected(null);
    setForm(emptyForm(estabelecimentoId));
    setDialogOpen(true);
  };

  const openEdit = (m: TrackerModel) => {
    setSelected(m);
    setForm({ ...m, sms_commands: Array.isArray(m.sms_commands) ? m.sms_commands : [] });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.nome.trim() || !form.protocolo.trim()) {
      toast.error('Nome e protocolo são obrigatórios');
      return;
    }
    try {
      const payload: any = {
        estabelecimento_id: estabelecimentoId,
        nome: form.nome.trim(),
        protocolo: form.protocolo.trim(),
        porta: Number(form.porta) || 0,
        host: form.host || null,
        senha_padrao: form.senha_padrao || null,
        apn: form.apn || null,
        apn_user: form.apn_user || null,
        apn_password: form.apn_password || null,
        descricao: form.descricao || null,
        supports_bloqueio: !!form.supports_bloqueio,
        sms_commands: form.sms_commands || [],
        ativo: form.ativo,
        ordem: Number(form.ordem) || 99,
      };
      if (selected) {
        const { error } = await supabase
          .from('tracker_device_models')
          .update(payload)
          .eq('id', selected.id);
        if (error) throw error;
        toast.success('Modelo atualizado');
      } else {
        const { error } = await supabase.from('tracker_device_models').insert(payload);
        if (error) throw error;
        toast.success('Modelo criado');
      }
      setDialogOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    }
  };

  const remove = async () => {
    if (!selected) return;
    try {
      const { error } = await supabase
        .from('tracker_device_models')
        .delete()
        .eq('id', selected.id);
      if (error) throw error;
      toast.success('Modelo excluído');
      setDeleteOpen(false);
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir');
    }
  };

  const resetToDefaults = async () => {
    try {
      await supabase.from('tracker_device_models').delete().eq('estabelecimento_id', estabelecimentoId);
      toast.success('Modelos padrão restaurados');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao restaurar');
    }
  };

  const updateCommand = (idx: number, key: keyof SmsCommand, value: string) => {
    setForm(prev => ({
      ...prev,
      sms_commands: prev.sms_commands.map((c, i) => i === idx ? { ...c, [key]: value } : c),
    }));
  };
  const addCommand = () => setForm(prev => ({
    ...prev, sms_commands: [...prev.sms_commands, { label: '', template: '', descricao: '' }],
  }));
  const removeCommand = (idx: number) => setForm(prev => ({
    ...prev, sms_commands: prev.sms_commands.filter((_, i) => i !== idx),
  }));

  const copyValue = async (v: string) => {
    await navigator.clipboard.writeText(v);
    setCopied(v);
    setTimeout(() => setCopied(null), 1500);
    toast.success('Copiado');
  };

  if (loading) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando modelos...</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-5 w-5 text-primary" />
              Modelos de Rastreador
            </CardTitle>
            <CardDescription>
              Cadastre e ajuste os parâmetros padrão de cada rastreador. Estes modelos ficam disponíveis para
              seleção rápida no cadastro de veículos.
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={resetToDefaults}>
              <RotateCcw className="h-4 w-4 mr-1" /> Restaurar padrões
            </Button>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Novo modelo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Modelo</TableHead>
                <TableHead>Protocolo</TableHead>
                <TableHead>Host / Porta</TableHead>
                <TableHead>APN</TableHead>
                <TableHead>Comandos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[120px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{m.nome}</div>
                    {m.supports_bloqueio && (
                      <Badge variant="outline" className="text-xs mt-1">
                        <Zap className="h-3 w-3 mr-1" /> Corte de combustível
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell><Badge variant="secondary">{m.protocolo}</Badge></TableCell>
                  <TableCell className="text-xs font-mono">{m.host || '-'}:{m.porta}</TableCell>
                  <TableCell className="text-xs font-mono">{m.apn || '-'}</TableCell>
                  <TableCell>{(m.sms_commands || []).length} SMS</TableCell>
                  <TableCell>
                    {m.ativo
                      ? <Badge className="bg-green-500">Ativo</Badge>
                      : <Badge variant="secondary">Inativo</Badge>}
                    {m.is_default && <Badge variant="outline" className="ml-1 text-xs">Padrão</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon"
                      onClick={() => { setSelected(m); setDeleteOpen(true); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {models.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Nenhum modelo cadastrado
                </TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selected ? 'Editar Modelo' : 'Novo Modelo de Rastreador'}</DialogTitle>
            <DialogDescription>
              Placeholders disponíveis nos comandos: <code>{'{host}'}</code>, <code>{'{port}'}</code>,
              <code> {'{password}'}</code>, <code>{'{apn}'}</code>, <code>{'{apn_user}'}</code>,
              <code> {'{apn_password}'}</code>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nome *</Label>
                <Input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} />
              </div>
              <div><Label>Protocolo *</Label>
                <Input value={form.protocolo} onChange={e => setForm(p => ({ ...p, protocolo: e.target.value }))}
                  placeholder="gt06, gps103, mictrack..." />
              </div>
              <div><Label>Host</Label>
                <Input value={form.host || ''} onChange={e => setForm(p => ({ ...p, host: e.target.value }))} />
              </div>
              <div><Label>Porta</Label>
                <Input type="number" value={form.porta}
                  onChange={e => setForm(p => ({ ...p, porta: Number(e.target.value) }))} />
              </div>
              <div><Label>Senha padrão</Label>
                <Input value={form.senha_padrao || ''}
                  onChange={e => setForm(p => ({ ...p, senha_padrao: e.target.value }))} />
              </div>
              <div><Label>APN</Label>
                <Input value={form.apn || ''} onChange={e => setForm(p => ({ ...p, apn: e.target.value }))} />
              </div>
              <div><Label>Usuário APN</Label>
                <Input value={form.apn_user || ''}
                  onChange={e => setForm(p => ({ ...p, apn_user: e.target.value }))} />
              </div>
              <div><Label>Senha APN</Label>
                <Input value={form.apn_password || ''}
                  onChange={e => setForm(p => ({ ...p, apn_password: e.target.value }))} />
              </div>
              <div><Label>Ordem</Label>
                <Input type="number" value={form.ordem}
                  onChange={e => setForm(p => ({ ...p, ordem: Number(e.target.value) }))} />
              </div>
              <div className="flex items-center justify-between pt-6">
                <div className="flex items-center gap-2">
                  <Switch checked={form.supports_bloqueio}
                    onCheckedChange={c => setForm(p => ({ ...p, supports_bloqueio: c }))} />
                  <Label className="text-sm">Corte de combustível</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={form.ativo}
                    onCheckedChange={c => setForm(p => ({ ...p, ativo: c }))} />
                  <Label className="text-sm">Ativo</Label>
                </div>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.descricao || ''}
                onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Comandos SMS de configuração</Label>
                <Button size="sm" variant="outline" onClick={addCommand}>
                  <Plus className="h-3 w-3 mr-1" /> Comando
                </Button>
              </div>
              <div className="space-y-2">
                {form.sms_commands.map((c, i) => (
                  <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/30">
                    <div className="grid grid-cols-[1fr_auto] gap-2 items-start">
                      <div className="space-y-2">
                        <Input placeholder="Nome do comando (ex: Configurar servidor)"
                          value={c.label} onChange={e => updateCommand(i, 'label', e.target.value)} />
                        <Input className="font-mono text-xs" placeholder="Template SMS com placeholders"
                          value={c.template} onChange={e => updateCommand(i, 'template', e.target.value)} />
                        <Input placeholder="Descrição opcional" value={c.descricao || ''}
                          onChange={e => updateCommand(i, 'descricao', e.target.value)} />
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeCommand(i)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
                {form.sms_commands.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    Nenhum comando cadastrado — este modelo será tratado como configurável manualmente pelo app.
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={remove}
        title="Excluir modelo?"
        description={`Tem certeza que deseja excluir o modelo ${selected?.nome}?`}
      />
    </div>
  );
};

export default TrackerDeviceModels;
