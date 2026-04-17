import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { KNOWLEDGE_BASE_DOMAINS } from '@/constants/agentTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Database, Search } from 'lucide-react';
import { toast } from 'sonner';

interface KbEntry {
  id: string;
  dominio: string;
  titulo: string;
  conteudo: string;
  tipo: string;
  ativo: boolean;
  ordem: number;
  origem?: string;
}

type OrigemFiltro = 'todas' | 'manual' | 'lacuna' | 'importada';

interface Props {
  estabelecimentoId: string;
}

export default function AgentKnowledgeBaseManager({ estabelecimentoId }: Props) {
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<KbEntry | null>(null);
  const [activeDomain, setActiveDomain] = useState('comercial');
  const [searchTerm, setSearchTerm] = useState('');
  const [form, setForm] = useState({ dominio: 'comercial', titulo: '', conteudo: '', tipo: 'texto' });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('agent_knowledge_bases')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('ordem');
    setEntries((data || []) as KbEntry[]);
    setLoading(false);
  }, [estabelecimentoId]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const handleSave = async () => {
    if (!form.titulo.trim() || !form.conteudo.trim()) {
      toast.error('Título e conteúdo são obrigatórios');
      return;
    }
    if (editing) {
      await supabase.from('agent_knowledge_bases').update({ ...form } as any).eq('id', editing.id);
      toast.success('Entrada atualizada');
    } else {
      await supabase.from('agent_knowledge_bases').insert({ ...form, estabelecimento_id: estabelecimentoId } as any);
      toast.success('Entrada criada');
    }
    setDialogOpen(false);
    setEditing(null);
    setForm({ dominio: activeDomain, titulo: '', conteudo: '', tipo: 'texto' });
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('agent_knowledge_bases').delete().eq('id', id);
    toast.success('Entrada removida');
    fetchEntries();
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ dominio: activeDomain, titulo: '', conteudo: '', tipo: 'texto' });
    setDialogOpen(true);
  };

  const openEdit = (entry: KbEntry) => {
    setEditing(entry);
    setForm({ dominio: entry.dominio, titulo: entry.titulo, conteudo: entry.conteudo, tipo: entry.tipo });
    setDialogOpen(true);
  };

  const filtered = entries.filter(e =>
    e.dominio === activeDomain &&
    (searchTerm ? e.titulo.toLowerCase().includes(searchTerm.toLowerCase()) || e.conteudo.toLowerCase().includes(searchTerm.toLowerCase()) : true)
  );

  const domainCounts = KNOWLEDGE_BASE_DOMAINS.reduce((acc, d) => {
    acc[d.id] = entries.filter(e => e.dominio === d.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Bases de Conhecimento por Domínio
          </h3>
          <p className="text-xs text-muted-foreground">Cada agente especialista tem sua própria base editável</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> Nova Entrada
        </Button>
      </div>

      <Tabs value={activeDomain} onValueChange={setActiveDomain}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent p-0">
          {KNOWLEDGE_BASE_DOMAINS.map(d => (
            <TabsTrigger key={d.id} value={d.id} className="text-xs gap-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <span>{d.icone}</span>
              <span className="hidden sm:inline">{d.nome.replace('Base ', '')}</span>
              {domainCounts[d.id] > 0 && (
                <Badge variant="secondary" className="text-xs px-1 py-0 ml-1">{domainCounts[d.id]}</Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <div className="flex gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9" />
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-8 border rounded-lg border-dashed">
              <p className="text-sm text-muted-foreground">Nenhuma entrada nesta base</p>
              <Button variant="link" size="sm" onClick={openCreate}>Adicionar primeira entrada</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map(entry => (
                <Card key={entry.id}>
                  <CardContent className="p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{entry.titulo}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{entry.conteudo}</p>
                      <Badge variant="outline" className="text-xs mt-1">{entry.tipo}</Badge>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Entrada' : 'Nova Entrada na Base'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Domínio</Label>
              <Select value={form.dominio} onValueChange={v => setForm({ ...form, dominio: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KNOWLEDGE_BASE_DOMAINS.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.icone} {d.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título</Label>
              <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="texto">Texto</SelectItem>
                  <SelectItem value="json">JSON / Dados Estruturados</SelectItem>
                  <SelectItem value="regra">Regra de Negócio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conteúdo</Label>
              <Textarea value={form.conteudo} onChange={e => setForm({ ...form, conteudo: e.target.value })} rows={8} className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
