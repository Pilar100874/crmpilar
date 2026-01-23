import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search, RefreshCw, Plus, Trash2, ExternalLink, Bot, 
  Settings, Play, Eye, Sparkles, Filter, TrendingUp,
  Building2, MapPin, Calendar, DollarSign, Tag
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LicitacoesBotProps {
  estabelecimentoId: string;
}

interface Opportunity {
  id: string;
  orgao_nome: string | null;
  uf: string | null;
  municipio: string | null;
  objeto: string | null;
  valor_estimado: number | null;
  data_abertura: string | null;
  score: number;
  status: string;
  keywords_matched: string[];
  url_detalhe: string | null;
  summary_ai: string | null;
  descartado: boolean;
  created_at: string;
}

interface Keyword {
  id: string;
  keyword: string;
  categoria: string;
  peso: number;
  ativo: boolean;
}

const DEFAULT_KEYWORDS = [
  // tissue_higiene
  { keyword: 'papel toalha', categoria: 'tissue_higiene', peso: 6 },
  { keyword: 'toalha de papel', categoria: 'tissue_higiene', peso: 6 },
  { keyword: 'papel higiênico', categoria: 'tissue_higiene', peso: 6 },
  { keyword: 'papel higienico', categoria: 'tissue_higiene', peso: 6 },
  { keyword: 'rolão', categoria: 'tissue_higiene', peso: 6 },
  { keyword: 'interfolha', categoria: 'tissue_higiene', peso: 6 },
  { keyword: 'guardanapo papel', categoria: 'tissue_higiene', peso: 5 },
  { keyword: 'tissue', categoria: 'tissue_higiene', peso: 6 },
  { keyword: 'bobina tissue', categoria: 'tissue_higiene', peso: 6 },
  // bobinas_industriais
  { keyword: 'bobina papel', categoria: 'bobinas_industriais', peso: 5 },
  { keyword: 'bobina kraft', categoria: 'bobinas_industriais', peso: 5 },
  { keyword: 'bobina industrial', categoria: 'bobinas_industriais', peso: 5 },
  { keyword: 'papel em bobina', categoria: 'bobinas_industriais', peso: 5 },
  // embalagens_papel
  { keyword: 'papel kraft', categoria: 'embalagens_papel', peso: 4 },
  { keyword: 'saco kraft', categoria: 'embalagens_papel', peso: 4 },
  { keyword: 'papel embalagem', categoria: 'embalagens_papel', peso: 4 },
  { keyword: 'papel pardo', categoria: 'embalagens_papel', peso: 4 },
  // ondulado
  { keyword: 'papel ondulado', categoria: 'ondulado', peso: 4 },
  { keyword: 'papelão ondulado', categoria: 'ondulado', peso: 4 },
  { keyword: 'chapas onduladas', categoria: 'ondulado', peso: 4 },
  // protecao_pintura
  { keyword: 'papel proteção', categoria: 'protecao_pintura', peso: 3 },
  { keyword: 'papel mascaramento', categoria: 'protecao_pintura', peso: 3 },
  // termos_genericos
  { keyword: 'descartáveis papel', categoria: 'termos_genericos', peso: 3 },
  { keyword: 'material higiene', categoria: 'termos_genericos', peso: 3 },
];

const DEFAULT_SCORE_CONFIGS = [
  { tipo: 'hospital', descricao: 'Hospital, UPA, UBS, Santa Casa', peso: 10 },
  { tipo: 'escola', descricao: 'Escola, Creche, Universidade', peso: 8 },
  { tipo: 'uf_prioridade', descricao: 'Mesma UF do estabelecimento', peso: 5 },
  { tipo: 'valor_alto', descricao: 'Valor estimado > R$ 50.000', peso: 5 },
  { tipo: 'valor_baixo', descricao: 'Valor estimado < R$ 5.000 (penalidade)', peso: 5 },
];

export default function LicitacoesBot({ estabelecimentoId }: LicitacoesBotProps) {
  const [activeTab, setActiveTab] = useState('oportunidades');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);
  const [filterUf, setFilterUf] = useState('');
  const [filterScore, setFilterScore] = useState('');
  const [newKeyword, setNewKeyword] = useState({ keyword: '', categoria: 'tissue_higiene', peso: 5 });

  useEffect(() => {
    loadData();
  }, [estabelecimentoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load opportunities
      const { data: opps } = await supabase
        .from('licitacoes_opportunities')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('descartado', false)
        .order('score', { ascending: false })
        .limit(100);
      setOpportunities(opps || []);

      // Load keywords
      const { data: kws } = await supabase
        .from('licitacoes_keywords')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('categoria');
      setKeywords(kws || []);

      // Load config
      const { data: cfg } = await supabase
        .from('licitacoes_config')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();
      setConfig(cfg);

    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const initializeBot = async () => {
    try {
      // Insert default keywords
      const kwToInsert = DEFAULT_KEYWORDS.map(k => ({
        ...k,
        estabelecimento_id: estabelecimentoId,
        ativo: true
      }));
      await supabase.from('licitacoes_keywords').insert(kwToInsert);

      // Insert default score configs
      const scToInsert = DEFAULT_SCORE_CONFIGS.map(s => ({
        ...s,
        estabelecimento_id: estabelecimentoId,
        ativo: true
      }));
      await supabase.from('licitacoes_score_config').insert(scToInsert);

      // Insert config
      await supabase.from('licitacoes_config').insert({
        estabelecimento_id: estabelecimentoId,
        ativo: true,
        intervalo_minutos: 30,
        score_minimo_alerta: 10,
        emails_notificacao: []
      });

      toast.success('Bot inicializado com sucesso!');
      loadData();
    } catch (err) {
      console.error('Erro ao inicializar:', err);
      toast.error('Erro ao inicializar bot');
    }
  };

  const runBot = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('licitacoes-pncp-fetch', {
        body: { estabelecimento_id: estabelecimentoId }
      });
      if (error) throw error;
      toast.success(`Busca concluída: ${data.items_found || 0} encontrados, ${data.items_inserted || 0} novos`);
      loadData();
    } catch (err) {
      console.error('Erro ao executar bot:', err);
      toast.error('Erro ao executar busca');
    } finally {
      setRunning(false);
    }
  };

  const generateSummary = async (oppId: string) => {
    try {
      toast.info('Gerando resumo com IA...');
      const { data, error } = await supabase.functions.invoke('licitacoes-summarize-ai', {
        body: { opportunity_id: oppId }
      });
      if (error) throw error;
      toast.success('Resumo gerado!');
      loadData();
    } catch (err) {
      console.error('Erro ao gerar resumo:', err);
      toast.error('Erro ao gerar resumo');
    }
  };

  const updateConfig = async (updates: any) => {
    try {
      if (config?.id) {
        await supabase.from('licitacoes_config').update(updates).eq('id', config.id);
      }
      setConfig({ ...config, ...updates });
      toast.success('Configuração atualizada');
    } catch (err) {
      toast.error('Erro ao atualizar');
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.keyword.trim()) return;
    try {
      await supabase.from('licitacoes_keywords').insert({
        ...newKeyword,
        estabelecimento_id: estabelecimentoId,
        ativo: true
      });
      setNewKeyword({ keyword: '', categoria: 'tissue_higiene', peso: 5 });
      toast.success('Keyword adicionada');
      loadData();
    } catch (err) {
      toast.error('Erro ao adicionar');
    }
  };

  const deleteKeyword = async (id: string) => {
    await supabase.from('licitacoes_keywords').delete().eq('id', id);
    loadData();
  };

  const discardOpportunity = async (id: string) => {
    await supabase.from('licitacoes_opportunities').update({ descartado: true }).eq('id', id);
    loadData();
  };

  const getScoreColor = (score: number) => {
    if (score >= 15) return 'bg-red-500';
    if (score >= 10) return 'bg-orange-500';
    if (score >= 5) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const filteredOpps = opportunities.filter(o => {
    if (filterUf && o.uf !== filterUf) return false;
    if (filterScore === 'high' && o.score < 10) return false;
    if (filterScore === 'medium' && (o.score < 5 || o.score >= 10)) return false;
    return true;
  });

  if (!config && !loading) {
    return (
      <Card className="p-8 text-center">
        <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Bot Caça Licitações</h3>
        <p className="text-muted-foreground mb-4">
          Configure o bot para monitorar automaticamente licitações públicas de papéis e descartáveis.
        </p>
        <Button onClick={initializeBot}>
          <Play className="h-4 w-4 mr-2" />
          Inicializar Bot
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Bot Caça Licitações - PNCP
          </h3>
          <p className="text-sm text-muted-foreground">
            Monitoramento automático de licitações públicas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Switch 
            checked={config?.ativo || false} 
            onCheckedChange={(v) => updateConfig({ ativo: v })}
          />
          <span className="text-sm">{config?.ativo ? 'Ativo' : 'Inativo'}</span>
          <Button onClick={runBot} disabled={running} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${running ? 'animate-spin' : ''}`} />
            {running ? 'Buscando...' : 'Buscar Agora'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="oportunidades">Oportunidades ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="keywords">Keywords ({keywords.length})</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="oportunidades" className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={filterUf || "all"} onValueChange={(v) => setFilterUf(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas UFs</SelectItem>
                {[...new Set(opportunities.map(o => o.uf).filter(Boolean))].map(uf => (
                  <SelectItem key={uf} value={uf!}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterScore || "all"} onValueChange={(v) => setFilterScore(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Score" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="high">🔥 Quente (10+)</SelectItem>
                <SelectItem value="medium">⚡ Morno (5-9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {filteredOpps.map(opp => (
                <Card key={opp.id} className="p-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getScoreColor(opp.score)}>{opp.score} pts</Badge>
                        <Badge variant="outline">{opp.uf}</Badge>
                        {opp.keywords_matched?.slice(0, 2).map(k => (
                          <Badge key={k} variant="secondary" className="text-xs">{k}</Badge>
                        ))}
                      </div>
                      <p className="font-medium text-sm flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {opp.orgao_nome || 'Órgão não informado'}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {opp.objeto}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          R$ {opp.valor_estimado?.toLocaleString('pt-BR') || 'N/I'}
                        </span>
                        {opp.data_abertura && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(opp.data_abertura), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="outline" onClick={() => setSelectedOpp(opp)}>
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => generateSummary(opp.id)}>
                        <Sparkles className="h-3 w-3" />
                      </Button>
                      {opp.url_detalhe && (
                        <Button size="sm" variant="outline" asChild>
                          <a href={opp.url_detalhe} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => discardOpportunity(opp.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {opp.summary_ai && (
                    <div className="mt-2 p-2 bg-muted rounded text-xs">
                      <strong>📋 Resumo IA:</strong> {opp.summary_ai}
                    </div>
                  )}
                </Card>
              ))}
              {filteredOpps.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma oportunidade encontrada. Execute uma busca!
                </p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Keyword</Label>
              <Input 
                value={newKeyword.keyword} 
                onChange={e => setNewKeyword({...newKeyword, keyword: e.target.value})}
                placeholder="Ex: papel toalha"
              />
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={newKeyword.categoria} onValueChange={v => setNewKeyword({...newKeyword, categoria: v})}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tissue_higiene">Tissue/Higiene</SelectItem>
                  <SelectItem value="bobinas_industriais">Bobinas</SelectItem>
                  <SelectItem value="embalagens_papel">Embalagens</SelectItem>
                  <SelectItem value="ondulado">Ondulado</SelectItem>
                  <SelectItem value="protecao_pintura">Proteção</SelectItem>
                  <SelectItem value="termos_genericos">Genéricos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Peso</Label>
              <Input 
                type="number" 
                value={newKeyword.peso} 
                onChange={e => setNewKeyword({...newKeyword, peso: Number(e.target.value)})}
                className="w-20"
              />
            </div>
            <Button onClick={addKeyword}><Plus className="h-4 w-4" /></Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywords.map(kw => (
                <TableRow key={kw.id}>
                  <TableCell>{kw.keyword}</TableCell>
                  <TableCell><Badge variant="outline">{kw.categoria}</Badge></TableCell>
                  <TableCell>{kw.peso}</TableCell>
                  <TableCell>
                    <Badge variant={kw.ativo ? 'default' : 'secondary'}>
                      {kw.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => deleteKeyword(kw.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card className="p-4 space-y-4">
            <div>
              <Label>UF Prioritária</Label>
              <Input 
                value={config?.uf_prioridade || ''} 
                onChange={e => updateConfig({ uf_prioridade: e.target.value })}
                placeholder="Ex: SP"
                className="w-32"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Licitações desta UF receberão pontos extras
              </p>
            </div>
            <div>
              <Label>Score Mínimo para Alerta</Label>
              <Input 
                type="number"
                value={config?.score_minimo_alerta || 10} 
                onChange={e => updateConfig({ score_minimo_alerta: Number(e.target.value) })}
                className="w-32"
              />
            </div>
            <div>
              <Label>Emails para Notificação (um por linha)</Label>
              <Textarea 
                value={(config?.emails_notificacao || []).join('\n')} 
                onChange={e => updateConfig({ emails_notificacao: e.target.value.split('\n').filter(Boolean) })}
                placeholder="email@empresa.com"
                rows={3}
              />
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedOpp} onOpenChange={() => setSelectedOpp(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Oportunidade</DialogTitle>
          </DialogHeader>
          {selectedOpp && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getScoreColor(selectedOpp.score)}>{selectedOpp.score} pontos</Badge>
                <Badge variant="outline">{selectedOpp.uf} - {selectedOpp.municipio}</Badge>
              </div>
              <div>
                <strong>Órgão:</strong> {selectedOpp.orgao_nome}
              </div>
              <div>
                <strong>Valor Estimado:</strong> R$ {selectedOpp.valor_estimado?.toLocaleString('pt-BR') || 'N/I'}
              </div>
              <div>
                <strong>Objeto:</strong>
                <p className="text-sm mt-1 p-2 bg-muted rounded">{selectedOpp.objeto}</p>
              </div>
              {selectedOpp.summary_ai && (
                <div>
                  <strong>Resumo IA:</strong>
                  <p className="text-sm mt-1 p-2 bg-blue-50 rounded">{selectedOpp.summary_ai}</p>
                </div>
              )}
              <div className="flex gap-2">
                {selectedOpp.url_detalhe && (
                  <Button asChild>
                    <a href={selectedOpp.url_detalhe} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Edital
                    </a>
                  </Button>
                )}
                <Button variant="outline" onClick={() => generateSummary(selectedOpp.id)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Resumo IA
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
