import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Trash2 } from 'lucide-react';
import { AGENT_ORDER } from './types';
import { toast } from 'sonner';

const ICON_OPTIONS = ['🤖', '🧠', '📊', '🎯', '💡', '🔬', '📈', '🛠️', '🎨', '📝', '🔍', '⚡', '🌟', '🏆', '📦', '🗂️', '💬', '🎪'];
const COLOR_OPTIONS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16', '#A855F7'];

interface Props {
  onCreate: (agent: any) => Promise<any>;
  existingKeys: string[];
}

export function CreateAgentDialog({ onCreate, existingKeys }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    agent_key: '',
    name: '',
    icon: '🤖',
    color: '#8B5CF6',
    description: '',
    system_prompt: '',
    dependencies: [] as string[],
    output_schema: '{}',
    ordem: 100,
  });

  const handleSubmit = async () => {
    if (!form.agent_key.trim()) { toast.error('Informe uma chave para o agente'); return; }
    if (!form.name.trim()) { toast.error('Informe o nome do agente'); return; }
    if (existingKeys.includes(form.agent_key)) { toast.error('Já existe um agente com essa chave'); return; }
    if (!/^[a-z_]+$/.test(form.agent_key)) { toast.error('A chave deve conter apenas letras minúsculas e _'); return; }

    setSaving(true);
    let schema = {};
    try { schema = JSON.parse(form.output_schema); } catch { /* use empty */ }

    const result = await onCreate({
      ...form,
      output_schema: schema,
    });

    setSaving(false);
    if (result) {
      setOpen(false);
      setForm({
        agent_key: '', name: '', icon: '🤖', color: '#8B5CF6',
        description: '', system_prompt: '', dependencies: [],
        output_schema: '{}', ordem: 100,
      });
    }
  };

  const toggleDep = (dep: string) => {
    setForm(prev => ({
      ...prev,
      dependencies: prev.dependencies.includes(dep)
        ? prev.dependencies.filter(d => d !== dep)
        : [...prev.dependencies, dep],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          Novo Agente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{form.icon}</span>
            Criar Novo Agente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Identity */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Chave (ID único)</Label>
              <Input
                value={form.agent_key}
                onChange={e => setForm(prev => ({ ...prev, agent_key: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') }))}
                placeholder="meu_agente"
                className="text-sm h-9"
              />
              <p className="text-[10px] text-muted-foreground">Apenas letras minúsculas e _</p>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nome do Agente</Label>
              <Input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Meu Agente Personalizado"
                className="text-sm h-9"
              />
            </div>
          </div>

          {/* Icon & Color */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Ícone</Label>
              <div className="flex flex-wrap gap-1">
                {ICON_OPTIONS.map(icon => (
                  <button
                    key={icon}
                    onClick={() => setForm(prev => ({ ...prev, icon }))}
                    className={`text-lg p-1 rounded cursor-pointer hover:bg-muted ${form.icon === icon ? 'bg-primary/20 ring-1 ring-primary' : ''}`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Cor</Label>
              <div className="flex flex-wrap gap-1">
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    onClick={() => setForm(prev => ({ ...prev, color }))}
                    className={`w-6 h-6 rounded-full cursor-pointer ${form.color === color ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Descrição Curta</Label>
              <Input
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="O que este agente faz..."
                className="text-sm h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Ordem na Timeline</Label>
              <Input
                type="number"
                value={form.ordem}
                onChange={e => setForm(prev => ({ ...prev, ordem: parseInt(e.target.value) || 100 }))}
                className="text-sm h-9"
              />
            </div>
          </div>

          {/* Dependencies */}
          <div className="space-y-1">
            <Label className="text-xs">Dependências (dados de quais agentes este agente precisa)</Label>
            <div className="flex flex-wrap gap-1">
              {[...AGENT_ORDER, ...existingKeys.filter(k => !AGENT_ORDER.includes(k))].map(dep => (
                <Badge
                  key={dep}
                  variant={form.dependencies.includes(dep) ? 'default' : 'outline'}
                  className="text-xs cursor-pointer"
                  onClick={() => toggleDep(dep)}
                >
                  {dep}
                </Badge>
              ))}
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-1">
            <Label className="text-xs">System Prompt</Label>
            <p className="text-[10px] text-muted-foreground">
              Instruções detalhadas para a IA. O agente receberá a descrição do negócio e os dados dos agentes dependentes automaticamente.
            </p>
            <Textarea
              value={form.system_prompt}
              onChange={e => setForm(prev => ({ ...prev, system_prompt: e.target.value }))}
              rows={10}
              className="text-xs font-mono"
              placeholder={`Você é o [Nome do Agente], especialista em [área].\n\nSua missão é [objetivo].\n\nVocê DEVE retornar um JSON com a seguinte estrutura:\n{\n  "campo1": "...",\n  "campo2": [...]\n}`}
            />
          </div>

          {/* Output Schema */}
          <div className="space-y-1">
            <Label className="text-xs">Output Schema (JSON)</Label>
            <Textarea
              value={form.output_schema}
              onChange={e => setForm(prev => ({ ...prev, output_schema: e.target.value }))}
              rows={4}
              className="text-xs font-mono"
              placeholder='{ "campo": "tipo de valor esperado" }'
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              Criar Agente
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
