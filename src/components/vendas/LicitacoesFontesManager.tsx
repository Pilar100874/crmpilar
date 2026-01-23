import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Database, RefreshCw, Settings, Key, Check, X, Globe, 
  Building2, MapPin, ExternalLink, Clock, AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LicitacoesFontesManagerProps {
  estabelecimentoId: string;
  onFontesChanged?: () => void;
}

interface Fonte {
  id: string;
  fonte: string;
  nome_display: string;
  ativo: boolean;
  api_key: string | null;
  config: any;
  ultima_sincronizacao: string | null;
  total_importados: number;
  timeout_seconds: number;
}

// Definição das fontes disponíveis
const FONTES_DISPONIVEIS = [
  {
    id: 'pncp',
    nome: 'PNCP - Portal Nacional',
    descricao: 'Portal Nacional de Contratações Públicas. API oficial do governo federal.',
    gratuita: true,
    url: 'https://pncp.gov.br',
    icon: '🏛️'
  },
  {
    id: 'compras_gov',
    nome: 'Compras.gov.br',
    descricao: 'API de dados abertos de licitações federais.',
    gratuita: true,
    url: 'https://compras.dados.gov.br',
    icon: '🇧🇷'
  },
  {
    id: 'dados_sp',
    nome: 'Dados Abertos SP',
    descricao: 'Portal de dados abertos do Governo de São Paulo.',
    gratuita: true,
    url: 'https://dados.sp.gov.br',
    icon: '📊'
  },
  {
    id: 'alerta_licitacao',
    nome: 'Alerta Licitação',
    descricao: 'Agregador comercial com cobertura nacional. Requer API Key.',
    gratuita: false,
    url: 'https://alertalicitacao.com.br',
    icon: '🔔',
    requiresApiKey: true
  }
];

export default function LicitacoesFontesManager({ estabelecimentoId, onFontesChanged }: LicitacoesFontesManagerProps) {
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [apiKeyDialog, setApiKeyDialog] = useState<{ fonte: string; nome: string } | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [editingTimeout, setEditingTimeout] = useState<{ fonte: string; value: number } | null>(null);

  useEffect(() => {
    loadFontes();
  }, [estabelecimentoId]);

  const loadFontes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('licitacoes_fontes')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId);

      if (error) throw error;

      // Mesclar com fontes disponíveis
      const fontesMap = new Map(data?.map(f => [f.fonte, f]) || []);
      
      const fontesCompletas = FONTES_DISPONIVEIS.map(fd => {
        const existing = fontesMap.get(fd.id);
        return existing || {
          id: '',
          fonte: fd.id,
          nome_display: fd.nome,
          ativo: false,
          api_key: null,
          config: {},
          ultima_sincronizacao: null,
          total_importados: 0,
          timeout_seconds: 15
        };
      });

      setFontes(fontesCompletas);
    } catch (err) {
      console.error('Erro ao carregar fontes:', err);
      toast.error('Erro ao carregar fontes');
    } finally {
      setLoading(false);
    }
  };

  const toggleFonte = async (fonteId: string, ativo: boolean) => {
    try {
      const fonteInfo = FONTES_DISPONIVEIS.find(f => f.id === fonteId);
      if (!fonteInfo) return;

      const fonteExistente = fontes.find(f => f.fonte === fonteId);

      if (fonteExistente?.id) {
        // Atualizar
        await supabase
          .from('licitacoes_fontes')
          .update({ ativo })
          .eq('id', fonteExistente.id);
      } else {
        // Criar
        await supabase
          .from('licitacoes_fontes')
          .insert({
            estabelecimento_id: estabelecimentoId,
            fonte: fonteId,
            nome_display: fonteInfo.nome,
            ativo
          });
      }

      toast.success(ativo ? 'Fonte ativada' : 'Fonte desativada');
      loadFontes();
      onFontesChanged?.();
    } catch (err) {
      toast.error('Erro ao atualizar fonte');
    }
  };

  const saveApiKey = async () => {
    if (!apiKeyDialog || !apiKeyInput.trim()) return;

    try {
      const fonteExistente = fontes.find(f => f.fonte === apiKeyDialog.fonte);
      const fonteInfo = FONTES_DISPONIVEIS.find(f => f.id === apiKeyDialog.fonte);

      if (fonteExistente?.id) {
        await supabase
          .from('licitacoes_fontes')
          .update({ api_key: apiKeyInput.trim() })
          .eq('id', fonteExistente.id);
      } else {
        await supabase
          .from('licitacoes_fontes')
          .insert({
            estabelecimento_id: estabelecimentoId,
            fonte: apiKeyDialog.fonte,
            nome_display: fonteInfo?.nome || apiKeyDialog.nome,
            api_key: apiKeyInput.trim(),
            ativo: false
          });
      }

      toast.success('API Key salva com sucesso');
      setApiKeyDialog(null);
      setApiKeyInput('');
      loadFontes();
    } catch (err) {
      toast.error('Erro ao salvar API Key');
    }
  };

  const syncFonte = async (fonteId: string) => {
    setSyncing(fonteId);
    try {
      const functionMap: Record<string, string> = {
        'pncp': 'licitacoes-pncp-fetch',
        'compras_gov': 'licitacoes-compras-gov',
        'dados_sp': 'licitacoes-dados-sp',
        'alerta_licitacao': 'licitacoes-alerta-api'
      };

      const functionName = functionMap[fonteId];
      if (!functionName) {
        toast.error('Fonte não implementada');
        return;
      }

      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { estabelecimento_id: estabelecimentoId }
      });

      if (error) throw error;

      if (data?.requires_api_key) {
        toast.error(data.error || 'API Key necessária');
        const fonteInfo = FONTES_DISPONIVEIS.find(f => f.id === fonteId);
        if (fonteInfo) {
          setApiKeyDialog({ fonte: fonteId, nome: fonteInfo.nome });
        }
        return;
      }

      toast.success(`Sincronização concluída: ${data?.items_found || 0} encontrados, ${data?.items_inserted || 0} novos`);
      loadFontes();
      onFontesChanged?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro na sincronização');
    } finally {
      setSyncing(null);
    }
  };

  const syncAllFontes = async () => {
    setSyncing('all');
    try {
      const { data, error } = await supabase.functions.invoke('licitacoes-multi-fetch', {
        body: { estabelecimento_id: estabelecimentoId }
      });

      if (error) throw error;

      const totals = data?.totals || {};
      toast.success(
        `Sincronização completa: ${totals.items_found || 0} encontrados, ${totals.items_inserted || 0} novos (${totals.sources_success || 0} fontes)`
      );
      loadFontes();
      onFontesChanged?.();
    } catch (err: any) {
      toast.error(err.message || 'Erro na sincronização');
    } finally {
      setSyncing(null);
    }
  };

  const getFonteInfo = (fonteId: string) => FONTES_DISPONIVEIS.find(f => f.id === fonteId);

  if (loading) {
    return <div className="flex items-center justify-center p-8"><RefreshCw className="animate-spin" /></div>;
  }

  const fontesAtivas = fontes.filter(f => f.ativo).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Database className="h-5 w-5" />
            Fontes de Dados
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure as APIs de onde buscar licitações ({fontesAtivas} ativa{fontesAtivas !== 1 ? 's' : ''})
          </p>
        </div>
        <Button 
          onClick={syncAllFontes} 
          disabled={syncing !== null || fontesAtivas === 0}
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing === 'all' ? 'animate-spin' : ''}`} />
          Sincronizar Todas
        </Button>
      </div>

      <div className="grid gap-4">
        {FONTES_DISPONIVEIS.map(fonteInfo => {
          const fonte = fontes.find(f => f.fonte === fonteInfo.id);
          const hasApiKey = !!fonte?.api_key;
          const isActive = fonte?.ativo || false;
          const requiresKey = fonteInfo.requiresApiKey && !hasApiKey;

          return (
            <Card key={fonteInfo.id} className={isActive ? 'border-primary/50' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{fonteInfo.icon}</span>
                      <h4 className="font-semibold">{fonteInfo.nome}</h4>
                      {fonteInfo.gratuita ? (
                        <Badge variant="secondary" className="text-xs">Gratuita</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">
                          <Key className="h-3 w-3 mr-1" />
                          API Key
                        </Badge>
                      )}
                      {isActive && (
                        <Badge className="bg-green-500 text-xs">Ativa</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{fonteInfo.descricao}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <a 
                        href={fonteInfo.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Documentação
                      </a>
                      {fonte?.ultima_sincronizacao && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Última: {format(new Date(fonte.ultima_sincronizacao), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      )}
                      {fonte?.total_importados > 0 && (
                        <span>{fonte.total_importados} importados</span>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>Timeout:</span>
                        <Input
                          type="number"
                          min={5}
                          max={120}
                          value={editingTimeout?.fonte === fonteInfo.id ? editingTimeout.value : (fonte?.timeout_seconds || 15)}
                          onChange={(e) => setEditingTimeout({ fonte: fonteInfo.id, value: parseInt(e.target.value) || 15 })}
                          onBlur={async () => {
                            if (editingTimeout?.fonte === fonteInfo.id && fonte?.id) {
                              await supabase
                                .from('licitacoes_fontes')
                                .update({ timeout_seconds: editingTimeout.value })
                                .eq('id', fonte.id);
                              loadFontes();
                              setEditingTimeout(null);
                            }
                          }}
                          className="w-14 h-6 text-xs px-1 text-center"
                        />
                        <span>s</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {fonteInfo.requiresApiKey && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setApiKeyInput(fonte?.api_key || '');
                          setApiKeyDialog({ fonte: fonteInfo.id, nome: fonteInfo.nome });
                        }}
                      >
                        <Key className="h-4 w-4 mr-1" />
                        {hasApiKey ? 'Editar Key' : 'Configurar'}
                      </Button>
                    )}
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncFonte(fonteInfo.id)}
                      disabled={syncing !== null || !isActive || requiresKey}
                    >
                      <RefreshCw className={`h-4 w-4 ${syncing === fonteInfo.id ? 'animate-spin' : ''}`} />
                    </Button>

                    <Switch
                      checked={isActive}
                      onCheckedChange={(v) => toggleFonte(fonteInfo.id, v)}
                      disabled={requiresKey}
                    />
                  </div>
                </div>

                {requiresKey && (
                  <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Configure a API Key para ativar esta fonte
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Dialog para API Key */}
      <Dialog open={!!apiKeyDialog} onOpenChange={() => setApiKeyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar API Key - {apiKeyDialog?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="Cole sua API Key aqui..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                Obtenha sua API Key no site do provedor. A chave será armazenada de forma segura.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApiKeyDialog(null)}>Cancelar</Button>
            <Button onClick={saveApiKey} disabled={!apiKeyInput.trim()}>
              <Check className="h-4 w-4 mr-2" />
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
