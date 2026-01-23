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
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Search, RefreshCw, Plus, Trash2, ExternalLink, Bot, 
  Settings, Play, Eye, Sparkles, Filter, TrendingUp,
  Building2, MapPin, Calendar, DollarSign, Tag, Package, Database,
  CheckCircle2, XCircle, Loader2, Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LicitacoesFontesManager from './LicitacoesFontesManager';
import LicitacoesMonitor from './LicitacoesMonitor';

interface LicitacoesBotProps {
  estabelecimentoId: string;
}

interface Opportunity {
  id: string;
  source: string;
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

interface SourceProgress {
  fonte: string;
  nome: string;
  status: 'pending' | 'running' | 'success' | 'error';
  progress: number;
  items_found?: number;
  items_inserted?: number;
  error?: string;
}

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
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [newKeyword, setNewKeyword] = useState({ keyword: '', categoria: 'tissue_higiene', peso: 5 });
  const [keywordSearch, setKeywordSearch] = useState('');
  const [importingProducts, setImportingProducts] = useState(false);
  const [sourceProgress, setSourceProgress] = useState<SourceProgress[]>([]);

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
    setSourceProgress([]);
    
    try {
      // Buscar fontes ativas para mostrar progresso
      const { data: fontesAtivas } = await supabase
        .from('licitacoes_fontes')
        .select('fonte, nome_display')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true);

      const fontes = fontesAtivas || [
        { fonte: 'pncp', nome_display: 'PNCP' }
      ];

      // Inicializar progresso
      const initialProgress: SourceProgress[] = fontes.map((f, index) => ({
        fonte: f.fonte,
        nome: f.nome_display,
        status: 'pending' as const,
        progress: 0
      }));
      setSourceProgress(initialProgress);

      // Executar cada fonte sequencialmente com atualização de progresso
      const results: SourceProgress[] = [];
      
      for (let i = 0; i < fontes.length; i++) {
        const fonte = fontes[i];
        
        // Atualizar status para running
        setSourceProgress(prev => prev.map((p, idx) => 
          idx === i ? { ...p, status: 'running' as const, progress: 10 } : p
        ));

        try {
          // Mapear fonte para função
          const functionMap: Record<string, string> = {
            'pncp': 'licitacoes-pncp-fetch',
            'compras_gov': 'licitacoes-compras-gov',
            'dados_sp': 'licitacoes-dados-sp',
            'alerta_licitacao': 'licitacoes-alerta-api',
          };
          
          const functionName = functionMap[fonte.fonte] || 'licitacoes-pncp-fetch';
          
          // Simular progresso durante a chamada
          const progressInterval = setInterval(() => {
            setSourceProgress(prev => prev.map((p, idx) => 
              idx === i && p.progress < 90 
                ? { ...p, progress: Math.min(p.progress + 10, 90) } 
                : p
            ));
          }, 500);

          const { data, error } = await supabase.functions.invoke(functionName, {
            body: { estabelecimento_id: estabelecimentoId }
          });

          clearInterval(progressInterval);

          if (error) {
            setSourceProgress(prev => prev.map((p, idx) => 
              idx === i ? { 
                ...p, 
                status: 'error' as const, 
                progress: 100, 
                error: error.message 
              } : p
            ));
            results.push({
              fonte: fonte.fonte,
              nome: fonte.nome_display,
              status: 'error',
              progress: 100,
              error: error.message
            });
          } else {
            setSourceProgress(prev => prev.map((p, idx) => 
              idx === i ? { 
                ...p, 
                status: 'success' as const, 
                progress: 100,
                items_found: data?.items_found || 0,
                items_inserted: data?.items_inserted || 0
              } : p
            ));
            results.push({
              fonte: fonte.fonte,
              nome: fonte.nome_display,
              status: 'success',
              progress: 100,
              items_found: data?.items_found || 0,
              items_inserted: data?.items_inserted || 0
            });
          }
        } catch (err: any) {
          setSourceProgress(prev => prev.map((p, idx) => 
            idx === i ? { 
              ...p, 
              status: 'error' as const, 
              progress: 100, 
              error: err.message 
            } : p
          ));
          results.push({
            fonte: fonte.fonte,
            nome: fonte.nome_display,
            status: 'error',
            progress: 100,
            error: err.message
          });
        }
      }

      const successCount = results.filter(r => r.status === 'success').length;
      const totalFound = results.reduce((acc, r) => acc + (r.items_found || 0), 0);
      const totalInserted = results.reduce((acc, r) => acc + (r.items_inserted || 0), 0);
      
      toast.success(
        `Busca concluída: ${totalFound} encontrados, ${totalInserted} novos (${successCount}/${results.length} fontes)`
      );
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

  const importProductsAsKeywords = async () => {
    setImportingProducts(true);
    try {
      // Buscar todos os produtos ativos do estabelecimento
      const { data: produtos, error } = await supabase
        .from('produtos')
        .select('nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true);

      if (error) throw error;

      if (!produtos || produtos.length === 0) {
        toast.warning('Nenhum produto encontrado no cadastro');
        return;
      }

      // Filtrar produtos que já existem como keywords
      const existingKeywords = keywords.map(k => k.keyword.toLowerCase());
      const newProducts = produtos.filter(p => 
        !existingKeywords.includes(p.nome.toLowerCase())
      );

      if (newProducts.length === 0) {
        toast.info('Todos os produtos já estão cadastrados como keywords');
        return;
      }

      // Inserir novos produtos como keywords
      const keywordsToInsert = newProducts.map(p => ({
        keyword: p.nome,
        categoria: 'produtos',
        peso: 5,
        estabelecimento_id: estabelecimentoId,
        ativo: true
      }));

      const { error: insertError } = await supabase
        .from('licitacoes_keywords')
        .insert(keywordsToInsert);

      if (insertError) throw insertError;

      toast.success(`${newProducts.length} produtos importados como keywords`);
      loadData();
    } catch (err) {
      console.error('Erro ao importar produtos:', err);
      toast.error('Erro ao importar produtos');
    } finally {
      setImportingProducts(false);
    }
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
    if (filterKeyword && !o.keywords_matched?.some(k => k.toLowerCase().includes(filterKeyword.toLowerCase()))) return false;
    if (filterSource && o.source !== filterSource) return false;
    return true;
  });

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      'pncp': 'PNCP',
      'compras_gov': 'Compras.gov',
      'dados_sp': 'Dados SP',
      'alerta_licitacao': 'Alerta Licitação'
    };
    return labels[source] || source;
  };

  const getSourceColor = (source: string) => {
    const colors: Record<string, string> = {
      'pncp': 'bg-blue-500',
      'compras_gov': 'bg-green-500',
      'dados_sp': 'bg-purple-500',
      'alerta_licitacao': 'bg-orange-500'
    };
    return colors[source] || 'bg-gray-500';
  };

  if (!config && !loading) {
    return (
      <Card className="p-8 text-center">
        <Bot className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Bot Caça Licitações</h3>
        <p className="text-muted-foreground mb-4">
          Configure o bot para monitorar automaticamente licitações públicas com base nas suas palavras-chave.
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
          <p className="text-sm text-muted-foreground">
            Monitoramento automático de licitações públicas (múltiplas fontes)
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

      {/* Progress Panel - Mantém visível se houver erros */}
      {sourceProgress.length > 0 && (
        <Card className={`border-primary/50 ${
          sourceProgress.some(s => s.status === 'error') 
            ? 'bg-red-50 dark:bg-red-950/20 border-red-300' 
            : 'bg-primary/5'
        }`}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : sourceProgress.some(s => s.status === 'error') ? (
                  <XCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {running ? 'Progresso da Busca' : 
                 sourceProgress.some(s => s.status === 'error') ? 'Busca Concluída com Erros' : 
                 'Busca Concluída'}
              </CardTitle>
              {!running && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSourceProgress([])}
                  className="h-6 px-2 text-xs"
                >
                  Fechar
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="py-2 space-y-3">
            {sourceProgress.map((source) => (
              <div key={source.fonte} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {source.status === 'pending' && (
                      <div className="h-4 w-4 rounded-full bg-muted" />
                    )}
                    {source.status === 'running' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {source.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                    {source.status === 'error' && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className={source.status === 'running' ? 'font-medium' : ''}>
                      {source.nome}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {source.status === 'pending' && 'Aguardando...'}
                    {source.status === 'running' && `${source.progress}%`}
                    {source.status === 'success' && (
                      <span className="text-green-600">
                        {source.items_found} encontrados, {source.items_inserted} novos
                      </span>
                    )}
                    {source.status === 'error' && (
                      <span className="text-red-500 max-w-xs truncate block">
                        {source.error || 'Erro desconhecido'}
                      </span>
                    )}
                  </div>
                </div>
                <Progress 
                  value={source.progress} 
                  className={`h-2 ${
                    source.status === 'error' ? '[&>div]:bg-red-500' : 
                    source.status === 'success' ? '[&>div]:bg-green-500' : ''
                  }`}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="oportunidades">Oportunidades ({opportunities.length})</TabsTrigger>
          <TabsTrigger value="monitor" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Monitor
          </TabsTrigger>
          <TabsTrigger value="fontes" className="flex items-center gap-1">
            <Database className="h-3 w-3" />
            Fontes
          </TabsTrigger>
          <TabsTrigger value="keywords">Keywords ({keywords.length})</TabsTrigger>
          <TabsTrigger value="config">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="monitor">
          <LicitacoesMonitor estabelecimentoId={estabelecimentoId} />
        </TabsContent>

        <TabsContent value="oportunidades" className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar keyword..."
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                className="pl-8 w-48"
              />
            </div>
            <Select value={filterUf || "all"} onValueChange={(v) => setFilterUf(v === "all" ? "" : v)}>
              <SelectTrigger className="w-32"><SelectValue placeholder="UF" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas UFs</SelectItem>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterScore || "all"} onValueChange={(v) => setFilterScore(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Score" /></SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="high">🔥 Quente (10+)</SelectItem>
                <SelectItem value="medium">⚡ Morno (5-9)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterSource || "all"} onValueChange={(v) => setFilterSource(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Fonte" /></SelectTrigger>
              <SelectContent position="popper">
                <SelectItem value="all">Todas Fontes</SelectItem>
                <SelectItem value="pncp">🏛️ PNCP</SelectItem>
                <SelectItem value="compras_gov">🇧🇷 Compras.gov</SelectItem>
                <SelectItem value="dados_sp">📊 Dados SP</SelectItem>
                <SelectItem value="alerta_licitacao">🔔 Alerta Licitação</SelectItem>
              </SelectContent>
            </Select>
            {filterKeyword && (
              <Button variant="ghost" size="sm" onClick={() => setFilterKeyword('')}>
                Limpar
              </Button>
            )}
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

        <TabsContent value="fontes" className="space-y-4">
          <LicitacoesFontesManager 
            estabelecimentoId={estabelecimentoId} 
            onFontesChanged={loadData}
          />
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
                  <SelectItem value="produtos">Produtos</SelectItem>
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

          <div className="flex gap-2 items-center flex-wrap">
            <Button 
              variant="outline" 
              onClick={importProductsAsKeywords}
              disabled={importingProducts}
            >
              <Package className={`h-4 w-4 mr-2 ${importingProducts ? 'animate-pulse' : ''}`} />
              {importingProducts ? 'Importando...' : 'Importar do Cadastro de Produtos'}
            </Button>
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar keywords..."
                value={keywordSearch}
                onChange={(e) => setKeywordSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {keywordSearch && (
              <Button variant="ghost" size="sm" onClick={() => setKeywordSearch('')}>
                Limpar
              </Button>
            )}
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
              {keywords
                .filter(kw => 
                  !keywordSearch || 
                  kw.keyword.toLowerCase().includes(keywordSearch.toLowerCase()) ||
                  kw.categoria?.toLowerCase().includes(keywordSearch.toLowerCase())
                )
                .map(kw => (
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
