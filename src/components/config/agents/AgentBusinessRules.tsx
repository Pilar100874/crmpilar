import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Shield, AlertTriangle, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface BusinessRule {
  id: string;
  categoria: string;
  nome: string;
  descricao: string | null;
  condicao: string;
  acao: string;
  prioridade: number;
  ativo: boolean;
}

interface Objection {
  id: string;
  categoria: string;
  objecao: string;
  resposta_sugerida: string;
  gatilhos_mentais: string | null;
  argumentos: string | null;
  eficacia_percentual: number;
  vezes_usada: number;
  ativo: boolean;
}

interface CrossSell {
  id: string;
  produto_origem: string;
  produto_sugerido: string;
  tipo: string;
  motivo: string | null;
  prioridade: number;
  ativo: boolean;
}

const RULE_CATEGORIES = [
  { id: 'escalonamento', label: 'Escalonamento', icone: '🔄' },
  { id: 'venda', label: 'Venda', icone: '💼' },
  { id: 'credito', label: 'Crédito', icone: '💳' },
  { id: 'desconto', label: 'Desconto', icone: '🏷️' },
  { id: 'frete', label: 'Frete', icone: '🚚' },
  { id: 'objecao', label: 'Objeção', icone: '🎙️' },
];

const OBJECTION_CATEGORIES = [
  { id: 'preco', label: 'Preço' },
  { id: 'prazo', label: 'Prazo' },
  { id: 'qualidade', label: 'Qualidade' },
  { id: 'confianca', label: 'Confiança' },
  { id: 'concorrencia', label: 'Concorrência' },
  { id: 'outros', label: 'Outros' },
];

interface Props {
  estabelecimentoId: string;
}

export default function AgentBusinessRules({ estabelecimentoId }: Props) {
  const [activeTab, setActiveTab] = useState('regras');
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [objections, setObjections] = useState<Objection[]>([]);
  const [crossSells, setCrossSells] = useState<CrossSell[]>([]);
  const [ruleDialog, setRuleDialog] = useState(false);
  const [objDialog, setObjDialog] = useState(false);
  const [crossDialog, setCrossDialog] = useState(false);
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null);
  const [editingObj, setEditingObj] = useState<Objection | null>(null);
  const [editingCross, setEditingCross] = useState<CrossSell | null>(null);
  const [ruleForm, setRuleForm] = useState({ categoria: 'venda', nome: '', descricao: '', condicao: '', acao: '', prioridade: 0 });
  const [objForm, setObjForm] = useState({ categoria: 'preco', objecao: '', resposta_sugerida: '', gatilhos_mentais: '', argumentos: '' });
  const [crossForm, setCrossForm] = useState({ produto_origem: '', produto_sugerido: '', tipo: 'complementar', motivo: '', prioridade: 0 });

  const fetchAll = useCallback(async () => {
    const [r, o, c] = await Promise.all([
      supabase.from('agent_business_rules').select('*').eq('estabelecimento_id', estabelecimentoId).order('prioridade'),
      supabase.from('agent_objections').select('*').eq('estabelecimento_id', estabelecimentoId).order('categoria'),
      supabase.from('agent_cross_sell_rules').select('*').eq('estabelecimento_id', estabelecimentoId).order('prioridade'),
    ]);
    setRules((r.data || []) as BusinessRule[]);
    setObjections((o.data || []) as Objection[]);
    setCrossSells((c.data || []) as CrossSell[]);
  }, [estabelecimentoId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Rules CRUD
  const saveRule = async () => {
    if (!ruleForm.nome.trim()) { toast.error('Nome obrigatório'); return; }
    if (editingRule) {
      await supabase.from('agent_business_rules').update(ruleForm as any).eq('id', editingRule.id);
    } else {
      await supabase.from('agent_business_rules').insert({ ...ruleForm, estabelecimento_id: estabelecimentoId } as any);
    }
    toast.success('Regra salva');
    setRuleDialog(false);
    setEditingRule(null);
    fetchAll();
  };

  const deleteRule = async (id: string) => {
    await supabase.from('agent_business_rules').delete().eq('id', id);
    toast.success('Regra removida');
    fetchAll();
  };

  // Objections CRUD
  const saveObj = async () => {
    if (!objForm.objecao.trim()) { toast.error('Objeção obrigatória'); return; }
    if (editingObj) {
      await supabase.from('agent_objections').update(objForm as any).eq('id', editingObj.id);
    } else {
      await supabase.from('agent_objections').insert({ ...objForm, estabelecimento_id: estabelecimentoId } as any);
    }
    toast.success('Objeção salva');
    setObjDialog(false);
    setEditingObj(null);
    fetchAll();
  };

  const deleteObj = async (id: string) => {
    await supabase.from('agent_objections').delete().eq('id', id);
    toast.success('Objeção removida');
    fetchAll();
  };

  // Cross-sell CRUD
  const saveCross = async () => {
    if (!crossForm.produto_origem.trim()) { toast.error('Produto origem obrigatório'); return; }
    if (editingCross) {
      await supabase.from('agent_cross_sell_rules').update(crossForm as any).eq('id', editingCross.id);
    } else {
      await supabase.from('agent_cross_sell_rules').insert({ ...crossForm, estabelecimento_id: estabelecimentoId } as any);
    }
    toast.success('Regra de cross-sell salva');
    setCrossDialog(false);
    setEditingCross(null);
    fetchAll();
  };

  const deleteCross = async (id: string) => {
    await supabase.from('agent_cross_sell_rules').delete().eq('id', id);
    toast.success('Regra removida');
    fetchAll();
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="regras" className="gap-1"><Shield className="h-4 w-4" /> Regras de Negócio ({rules.length})</TabsTrigger>
          <TabsTrigger value="objecoes" className="gap-1"><MessageSquare className="h-4 w-4" /> Objeções ({objections.length})</TabsTrigger>
          <TabsTrigger value="crosssell" className="gap-1"><AlertTriangle className="h-4 w-4" /> Cross-sell ({crossSells.length})</TabsTrigger>
        </TabsList>

        {/* REGRAS */}
        <TabsContent value="regras" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingRule(null); setRuleForm({ categoria: 'venda', nome: '', descricao: '', condicao: '', acao: '', prioridade: 0 }); setRuleDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova Regra
            </Button>
          </div>
          {rules.length === 0 ? (
            <div className="text-center py-8 border rounded-lg border-dashed text-sm text-muted-foreground">Nenhuma regra cadastrada</div>
          ) : (
            <div className="space-y-2">
              {rules.map(r => (
                <Card key={r.id}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{RULE_CATEGORIES.find(c => c.id === r.categoria)?.icone} {r.categoria}</Badge>
                        <span className="text-sm font-medium">{r.nome}</span>
                        <Badge variant={r.ativo ? 'default' : 'secondary'} className="text-xs">{r.ativo ? 'Ativa' : 'Inativa'}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1"><strong>Se:</strong> {r.condicao}</p>
                      <p className="text-xs text-muted-foreground"><strong>Então:</strong> {r.acao}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingRule(r); setRuleForm({ categoria: r.categoria, nome: r.nome, descricao: r.descricao || '', condicao: r.condicao, acao: r.acao, prioridade: r.prioridade }); setRuleDialog(true); }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteRule(r.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* OBJEÇÕES */}
        <TabsContent value="objecoes" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingObj(null); setObjForm({ categoria: 'preco', objecao: '', resposta_sugerida: '', gatilhos_mentais: '', argumentos: '' }); setObjDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova Objeção
            </Button>
          </div>
          {objections.length === 0 ? (
            <div className="text-center py-8 border rounded-lg border-dashed text-sm text-muted-foreground">Nenhuma objeção cadastrada</div>
          ) : (
            <div className="space-y-2">
              {objections.map(o => (
                <Card key={o.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Badge variant="outline" className="text-xs mb-1">{o.categoria}</Badge>
                        <p className="text-sm font-medium">❝ {o.objecao} ❞</p>
                        <p className="text-xs text-muted-foreground mt-1"><strong>Resposta:</strong> {o.resposta_sugerida}</p>
                        {o.gatilhos_mentais && <p className="text-xs text-muted-foreground"><strong>Gatilhos:</strong> {o.gatilhos_mentais}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingObj(o); setObjForm({ categoria: o.categoria, objecao: o.objecao, resposta_sugerida: o.resposta_sugerida, gatilhos_mentais: o.gatilhos_mentais || '', argumentos: o.argumentos || '' }); setObjDialog(true); }}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteObj(o.id)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* CROSS-SELL */}
        <TabsContent value="crosssell" className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingCross(null); setCrossForm({ produto_origem: '', produto_sugerido: '', tipo: 'complementar', motivo: '', prioridade: 0 }); setCrossDialog(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Nova Regra
            </Button>
          </div>
          {crossSells.length === 0 ? (
            <div className="text-center py-8 border rounded-lg border-dashed text-sm text-muted-foreground">Nenhuma regra de cross-sell cadastrada</div>
          ) : (
            <div className="space-y-2">
              {crossSells.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium">{c.produto_origem}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium text-primary">{c.produto_sugerido}</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        <Badge variant="outline" className="text-xs">{c.tipo}</Badge>
                        {c.motivo && <span className="text-xs text-muted-foreground">{c.motivo}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingCross(c); setCrossForm({ produto_origem: c.produto_origem, produto_sugerido: c.produto_sugerido, tipo: c.tipo, motivo: c.motivo || '', prioridade: c.prioridade }); setCrossDialog(true); }}>
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteCross(c.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rule Dialog */}
      <Dialog open={ruleDialog} onOpenChange={setRuleDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingRule ? 'Editar Regra' : 'Nova Regra de Negócio'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Categoria</Label>
              <Select value={ruleForm.categoria} onValueChange={v => setRuleForm({ ...ruleForm, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RULE_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.icone} {c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nome</Label><Input value={ruleForm.nome} onChange={e => setRuleForm({ ...ruleForm, nome: e.target.value })} /></div>
            <div><Label>Condição (Se...)</Label><Textarea value={ruleForm.condicao} onChange={e => setRuleForm({ ...ruleForm, condicao: e.target.value })} rows={2} /></div>
            <div><Label>Ação (Então...)</Label><Textarea value={ruleForm.acao} onChange={e => setRuleForm({ ...ruleForm, acao: e.target.value })} rows={2} /></div>
            <div><Label>Prioridade</Label><Input type="number" value={ruleForm.prioridade} onChange={e => setRuleForm({ ...ruleForm, prioridade: parseInt(e.target.value) || 0 })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialog(false)}>Cancelar</Button>
            <Button onClick={saveRule}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Objection Dialog */}
      <Dialog open={objDialog} onOpenChange={setObjDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingObj ? 'Editar Objeção' : 'Nova Objeção'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Categoria</Label>
              <Select value={objForm.categoria} onValueChange={v => setObjForm({ ...objForm, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{OBJECTION_CATEGORIES.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Objeção do cliente</Label><Textarea value={objForm.objecao} onChange={e => setObjForm({ ...objForm, objecao: e.target.value })} rows={2} /></div>
            <div><Label>Resposta sugerida</Label><Textarea value={objForm.resposta_sugerida} onChange={e => setObjForm({ ...objForm, resposta_sugerida: e.target.value })} rows={3} /></div>
            <div><Label>Gatilhos mentais</Label><Input value={objForm.gatilhos_mentais} onChange={e => setObjForm({ ...objForm, gatilhos_mentais: e.target.value })} placeholder="Ex: escassez, prova social, reciprocidade" /></div>
            <div><Label>Argumentos de valor</Label><Textarea value={objForm.argumentos} onChange={e => setObjForm({ ...objForm, argumentos: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setObjDialog(false)}>Cancelar</Button>
            <Button onClick={saveObj}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cross-sell Dialog */}
      <Dialog open={crossDialog} onOpenChange={setCrossDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingCross ? 'Editar Cross-sell' : 'Nova Regra de Cross-sell'}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Produto Origem</Label><Input value={crossForm.produto_origem} onChange={e => setCrossForm({ ...crossForm, produto_origem: e.target.value })} placeholder="Ex: Papel Sulfite A4" /></div>
            <div><Label>Produto Sugerido</Label><Input value={crossForm.produto_sugerido} onChange={e => setCrossForm({ ...crossForm, produto_sugerido: e.target.value })} placeholder="Ex: Toner HP 12A" /></div>
            <div><Label>Tipo</Label>
              <Select value={crossForm.tipo} onValueChange={v => setCrossForm({ ...crossForm, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="complementar">Complementar</SelectItem>
                  <SelectItem value="similar">Similar</SelectItem>
                  <SelectItem value="upsell">Upsell</SelectItem>
                  <SelectItem value="kit">Kit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Motivo da sugestão</Label><Input value={crossForm.motivo} onChange={e => setCrossForm({ ...crossForm, motivo: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCrossDialog(false)}>Cancelar</Button>
            <Button onClick={saveCross}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
