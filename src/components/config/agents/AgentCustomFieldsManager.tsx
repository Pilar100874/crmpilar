import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, GripVertical, Edit2, Check, X, Save } from 'lucide-react';
import { toast } from 'sonner';

interface CustomField {
  id?: string;
  agent_id: string;
  estabelecimento_id: string;
  nome: string;
  tipo: string;
  descricao: string;
  obrigatorio: boolean;
  opcoes: string[] | null;
  ordem: number;
  ativo: boolean;
  isNew?: boolean;
}

const FIELD_TYPES = [
  { value: 'texto', label: 'Texto' },
  { value: 'numero', label: 'Número' },
  { value: 'lista', label: 'Lista (opções)' },
  { value: 'booleano', label: 'Sim/Não' },
  { value: 'data', label: 'Data' },
  { value: 'textarea', label: 'Texto Longo' },
];

interface Props {
  agentId: string;
  estabelecimentoId: string;
}

export default function AgentCustomFieldsManager({ agentId, estabelecimentoId }: Props) {
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CustomField>>({});
  const [newOptionText, setNewOptionText] = useState('');

  const loadFields = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('chat_agent_custom_fields')
      .select('*')
      .eq('agent_id', agentId)
      .eq('estabelecimento_id', estabelecimentoId)
      .order('ordem');
    if (!error && data) {
      setFields(data as unknown as CustomField[]);
    }
    setLoading(false);
  }, [agentId, estabelecimentoId]);

  useEffect(() => { loadFields(); }, [loadFields]);

  const handleAddField = async () => {
    const newField: any = {
      agent_id: agentId,
      estabelecimento_id: estabelecimentoId,
      nome: 'Novo Campo',
      tipo: 'texto',
      descricao: '',
      obrigatorio: false,
      opcoes: null,
      ordem: fields.length,
      ativo: true,
    };
    const { data, error } = await supabase
      .from('chat_agent_custom_fields')
      .insert(newField)
      .select()
      .single();
    if (error) {
      toast.error('Erro ao criar campo');
      return;
    }
    const created = data as unknown as CustomField;
    setFields([...fields, created]);
    setEditingId(created.id!);
    setEditForm(created);
    toast.success('Campo criado');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editForm.nome?.trim()) {
      toast.error('Nome do campo é obrigatório');
      return;
    }
    const { error } = await supabase
      .from('chat_agent_custom_fields')
      .update({
        nome: editForm.nome,
        tipo: editForm.tipo,
        descricao: editForm.descricao || '',
        obrigatorio: editForm.obrigatorio,
        opcoes: editForm.tipo === 'lista' ? editForm.opcoes : null,
        ativo: editForm.ativo,
      } as any)
      .eq('id', editingId);
    if (error) {
      toast.error('Erro ao salvar');
      return;
    }
    setEditingId(null);
    await loadFields();
    toast.success('Campo atualizado');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('chat_agent_custom_fields')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Erro ao excluir');
      return;
    }
    setFields(fields.filter(f => f.id !== id));
    if (editingId === id) setEditingId(null);
    toast.success('Campo removido');
  };

  const handleToggleActive = async (id: string, ativo: boolean) => {
    await supabase
      .from('chat_agent_custom_fields')
      .update({ ativo } as any)
      .eq('id', id);
    setFields(fields.map(f => f.id === id ? { ...f, ativo } : f));
  };

  const addOption = () => {
    if (!newOptionText.trim()) return;
    const current = editForm.opcoes || [];
    setEditForm({ ...editForm, opcoes: [...current, newOptionText.trim()] });
    setNewOptionText('');
  };

  const removeOption = (idx: number) => {
    const current = editForm.opcoes || [];
    setEditForm({ ...editForm, opcoes: current.filter((_, i) => i !== idx) });
  };

  if (loading) return <div className="text-center py-4 text-muted-foreground text-sm">Carregando campos...</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Campos Personalizados</p>
          <p className="text-xs text-muted-foreground">Defina os campos que este agente deve conhecer e utilizar</p>
        </div>
        <Button size="sm" onClick={handleAddField}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar Campo
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <p className="text-sm text-muted-foreground">Nenhum campo personalizado</p>
          <p className="text-xs text-muted-foreground mt-1">Adicione campos para definir quais informações este agente gerencia</p>
        </div>
      ) : (
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-2">
            {fields.map((field) => (
              <Card key={field.id} className={`transition-opacity ${!field.ativo ? 'opacity-50' : ''}`}>
                <CardContent className="p-3">
                  {editingId === field.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Nome do Campo *</Label>
                          <Input
                            value={editForm.nome || ''}
                            onChange={e => setEditForm({ ...editForm, nome: e.target.value })}
                            placeholder="Ex: Gramatura"
                            className="h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tipo</Label>
                          <Select value={editForm.tipo || 'texto'} onValueChange={v => setEditForm({ ...editForm, tipo: v })}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {FIELD_TYPES.map(t => (
                                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Descrição</Label>
                        <Input
                          value={editForm.descricao || ''}
                          onChange={e => setEditForm({ ...editForm, descricao: e.target.value })}
                          placeholder="Descreva o que este campo representa"
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editForm.obrigatorio || false}
                            onCheckedChange={v => setEditForm({ ...editForm, obrigatorio: v })}
                          />
                          <Label className="text-xs">Obrigatório</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editForm.ativo !== false}
                            onCheckedChange={v => setEditForm({ ...editForm, ativo: v })}
                          />
                          <Label className="text-xs">Ativo</Label>
                        </div>
                      </div>
                      {editForm.tipo === 'lista' && (
                        <div>
                          <Label className="text-xs">Opções da Lista</Label>
                          <div className="flex gap-2 mb-2">
                            <Input
                              value={newOptionText}
                              onChange={e => setNewOptionText(e.target.value)}
                              placeholder="Nova opção..."
                              className="h-8 text-sm"
                              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addOption())}
                            />
                            <Button size="sm" variant="outline" onClick={addOption} className="h-8">
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {(editForm.opcoes || []).map((opt, idx) => (
                              <Badge key={idx} variant="secondary" className="gap-1">
                                {opt}
                                <X className="h-3 w-3 cursor-pointer" onClick={() => removeOption(idx)} />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          <X className="h-3 w-3 mr-1" /> Cancelar
                        </Button>
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="h-3 w-3 mr-1" /> Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{field.nome}</span>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {FIELD_TYPES.find(t => t.value === field.tipo)?.label || field.tipo}
                            </Badge>
                            {field.obrigatorio && <Badge variant="destructive" className="text-[10px] shrink-0">Obrigatório</Badge>}
                          </div>
                          {field.descricao && <p className="text-xs text-muted-foreground truncate">{field.descricao}</p>}
                          {field.tipo === 'lista' && field.opcoes?.length && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {field.opcoes.slice(0, 5).map((o, i) => (
                                <Badge key={i} variant="secondary" className="text-[10px]">{o}</Badge>
                              ))}
                              {field.opcoes.length > 5 && <Badge variant="secondary" className="text-[10px]">+{field.opcoes.length - 5}</Badge>}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Switch
                          checked={field.ativo}
                          onCheckedChange={v => handleToggleActive(field.id!, v)}
                        />
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingId(field.id!); setEditForm(field); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(field.id!)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
