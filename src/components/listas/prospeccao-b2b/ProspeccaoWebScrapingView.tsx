import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, AlertTriangle, Building2, Phone, Mail, Globe, MapPin, Plus, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProspeccaoWebScrapingViewProps {
  estabelecimentoId: string;
  config: any;
  onProspectsFound: () => void;
}

interface EmpresaEncontrada {
  nome: string;
  telefone: string | null;
  celular: string | null;
  endereco: string | null;
  bairro: string | null;
  cidade: string;
  uf: string;
  cep: string | null;
  email: string | null;
  website: string | null;
  categoria: string | null;
  descricao: string | null;
  fonte: string;
  selecionada?: boolean;
}

const ProspeccaoWebScrapingView: React.FC<ProspeccaoWebScrapingViewProps> = ({
  estabelecimentoId,
  config,
  onProspectsFound
}) => {
  const [buscando, setBuscando] = useState(false);
  const [empresas, setEmpresas] = useState<EmpresaEncontrada[]>([]);
  const [adicionando, setAdicionando] = useState(false);
  const [fontesConsultadas, setFontesConsultadas] = useState<string[]>([]);
  const [erros, setErros] = useState<string[]>([]);

  // Obter parâmetros das configurações
  const firecrawlApiKey = config?.firecrawl_api_key || '';
  const termo = config?.ws_termo_busca || '';
  const cidade = config?.ws_cidade || '';
  const uf = config?.ws_uf || '';
  const hasApiKey = !!firecrawlApiKey;
  const hasSearchParams = !!(termo && cidade && uf);

  const handleBuscar = async () => {
    if (!termo || !cidade || !uf) {
      toast.error('Configure os parâmetros de busca na etapa anterior');
      return;
    }

    if (!firecrawlApiKey) {
      toast.error('Configure a API Key do Firecrawl na etapa anterior');
      return;
    }

    setBuscando(true);
    setEmpresas([]);
    setErros([]);
    setFontesConsultadas([]);

    try {
      const { data, error } = await supabase.functions.invoke('prospeccao-web-scraping', {
        body: {
          termo: termo,
          cidade: cidade,
          uf,
          firecrawl_api_key: firecrawlApiKey,
          limit: 30
        }
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro na busca');
      }

      const empresasComSelecao = (data.empresas || []).map((e: EmpresaEncontrada) => ({
        ...e,
        selecionada: false
      }));

      setEmpresas(empresasComSelecao);
      setFontesConsultadas(data.fontes_consultadas || []);
      setErros(data.erros || []);

      if (empresasComSelecao.length === 0) {
        toast.warning('Nenhuma empresa encontrada. Tente outros termos ou cidade.');
      } else {
        toast.success(`${empresasComSelecao.length} empresas encontradas!`);
      }

    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao buscar empresas');
    } finally {
      setBuscando(false);
    }
  };

  const toggleSelecao = (index: number) => {
    setEmpresas(prev => prev.map((e, i) => 
      i === index ? { ...e, selecionada: !e.selecionada } : e
    ));
  };

  const toggleTodas = () => {
    const todasSelecionadas = empresas.every(e => e.selecionada);
    setEmpresas(prev => prev.map(e => ({ ...e, selecionada: !todasSelecionadas })));
  };

  const handleAdicionarSelecionados = async () => {
    const selecionadas = empresas.filter(e => e.selecionada);
    
    if (selecionadas.length === 0) {
      toast.warning('Selecione ao menos uma empresa');
      return;
    }

    setAdicionando(true);

    try {
      const prospectsToInsert = selecionadas.map(empresa => ({
        estabelecimento_id: estabelecimentoId,
        place_id: `ws_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nome: empresa.nome,
        endereco: [empresa.endereco, empresa.bairro, empresa.cidade, empresa.uf].filter(Boolean).join(', '),
        telefone: empresa.telefone || empresa.celular || null,
        website: empresa.website || null,
        email_extraido: empresa.email || null,
        tipos: empresa.categoria ? [empresa.categoria] : [],
        fonte_dados: 'web_scraping',
        status_lead: 'novo',
        dados_originais_json: empresa
      }));

      const { error } = await supabase
        .from('prospects_b2b')
        .insert(prospectsToInsert as any);

      if (error) throw error;

      toast.success(`${selecionadas.length} prospects adicionados!`);
      
      // Remover empresas adicionadas da lista
      setEmpresas(prev => prev.filter(e => !e.selecionada));
      
      onProspectsFound();

    } catch (error) {
      console.error('Erro ao adicionar:', error);
      toast.error('Erro ao adicionar prospects');
    } finally {
      setAdicionando(false);
    }
  };

  const qtdSelecionadas = empresas.filter(e => e.selecionada).length;

  return (
    <div className="space-y-4">
      {/* Card de Resumo da Busca */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Buscar Empresas em Diretórios
          </CardTitle>
          <CardDescription>
            Busca em TeleListas, Guia Mais e outros diretórios públicos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resumo dos parâmetros configurados */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label className="text-xs text-muted-foreground">Termo de busca</Label>
              <p className="font-medium">{termo || <span className="text-muted-foreground italic">Não configurado</span>}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cidade</Label>
              <p className="font-medium">{cidade || <span className="text-muted-foreground italic">Não configurado</span>}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">UF</Label>
              <p className="font-medium">{uf || <span className="text-muted-foreground italic">Não configurado</span>}</p>
            </div>
          </div>

          {!hasSearchParams && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Configure os parâmetros de busca na <strong>Etapa 1 (Configurar)</strong> antes de realizar a busca.
              </AlertDescription>
            </Alert>
          )}

          {hasSearchParams && hasApiKey && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-300">
                Tudo configurado! Clique no botão abaixo para iniciar a busca.
              </AlertDescription>
            </Alert>
          )}

          <Button 
            onClick={handleBuscar} 
            disabled={buscando || !hasApiKey || !hasSearchParams}
            className="w-full"
            size="lg"
          >
            {buscando ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Buscando empresas...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Buscar Empresas
              </>
            )}
          </Button>

          {/* Fontes consultadas */}
          {fontesConsultadas.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              <span className="text-sm text-muted-foreground">Fontes consultadas:</span>
              {fontesConsultadas.map(fonte => (
                <Badge key={fonte} variant="outline">{fonte}</Badge>
              ))}
            </div>
          )}

          {/* Erros */}
          {erros.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
                Algumas fontes tiveram problemas: {erros.join(', ')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Resultados */}
      {empresas.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Empresas Encontradas ({empresas.length})</CardTitle>
                <CardDescription>
                  Selecione as empresas para adicionar como prospects
                </CardDescription>
              </div>
              {qtdSelecionadas > 0 && (
                <Button onClick={handleAdicionarSelecionados} disabled={adicionando}>
                  {adicionando ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Adicionar {qtdSelecionadas} selecionado(s)
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox 
                        checked={empresas.length > 0 && empresas.every(e => e.selecionada)}
                        onCheckedChange={toggleTodas}
                      />
                    </TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead className="w-[100px]">Fonte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map((empresa, index) => (
                    <TableRow key={index} className={empresa.selecionada ? 'bg-primary/5' : ''}>
                      <TableCell>
                        <Checkbox 
                          checked={empresa.selecionada}
                          onCheckedChange={() => toggleSelecao(index)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {empresa.nome}
                          </div>
                          {empresa.categoria && (
                            <Badge variant="secondary" className="text-xs">{empresa.categoria}</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          {empresa.telefone && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {empresa.telefone}
                            </div>
                          )}
                          {empresa.celular && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              {empresa.celular}
                            </div>
                          )}
                          {empresa.email && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Mail className="h-3 w-3" />
                              {empresa.email}
                            </div>
                          )}
                          {empresa.website && (
                            <div className="flex items-center gap-1 text-blue-600">
                              <Globe className="h-3 w-3" />
                              <a href={empresa.website.startsWith('http') ? empresa.website : `https://${empresa.website}`} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="hover:underline truncate max-w-[150px]"
                              >
                                {empresa.website}
                              </a>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground flex items-start gap-1">
                          <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>
                            {[empresa.endereco, empresa.bairro, `${empresa.cidade}/${empresa.uf}`]
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{empresa.fonte}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Mensagem quando não há resultados */}
      {!buscando && empresas.length === 0 && hasSearchParams && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Clique em "Buscar Empresas" para encontrar prospects</p>
        </div>
      )}
    </div>
  );
};

export default ProspeccaoWebScrapingView;
