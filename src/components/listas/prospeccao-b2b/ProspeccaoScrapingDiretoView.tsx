import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Building2, Phone, Mail, MapPin, AlertTriangle, CheckCircle, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ConfigB2B } from './types';

interface Empresa {
  nome: string;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  fonte: string;
  selecionada?: boolean;
}

interface ProspeccaoScrapingDiretoViewProps {
  estabelecimentoId: string;
  config: ConfigB2B | null;
  onProspectsFound?: (prospects: any[]) => void;
}

const ProspeccaoScrapingDiretoView: React.FC<ProspeccaoScrapingDiretoViewProps> = ({
  estabelecimentoId,
  config,
  onProspectsFound
}) => {
  const [buscando, setBuscando] = useState(false);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [fontesConsultadas, setFontesConsultadas] = useState<string[]>([]);
  const [erros, setErros] = useState<string[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const [adicionando, setAdicionando] = useState(false);

  // Parâmetros da config
  const termo = (config as any)?.ws_termo_busca || '';
  const cidade = (config as any)?.ws_cidade || '';
  const uf = (config as any)?.ws_uf || '';
  const hasSearchParams = !!(termo && cidade && uf);

  const handleBuscar = async () => {
    if (!hasSearchParams) {
      toast.error('Configure os parâmetros de busca na Etapa 1');
      return;
    }

    setBuscando(true);
    setEmpresas([]);
    setFontesConsultadas([]);
    setErros([]);
    setAviso(null);

    try {
      console.log('Iniciando scraping direto:', { termo, cidade, uf });

      const { data, error } = await supabase.functions.invoke('prospeccao-scraping-direto', {
        body: { termo, cidade, uf, limit: 50 }
      });

      if (error) throw error;

      if (data.success) {
        const empresasComSelecao = (data.empresas || []).map((e: Empresa) => ({
          ...e,
          selecionada: false
        }));
        setEmpresas(empresasComSelecao);
        setFontesConsultadas(data.fontes_consultadas || []);
        setErros(data.erros || []);
        setAviso(data.aviso || null);
        
        if (empresasComSelecao.length > 0) {
          toast.success(`${empresasComSelecao.length} empresas encontradas!`);
        } else {
          toast.warning('Nenhuma empresa encontrada. Tente outros termos de busca.');
        }
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error: any) {
      console.error('Erro no scraping direto:', error);
      toast.error(`Erro: ${error.message || 'Falha na busca'}`);
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

  const handleAdicionarSelecionadas = async () => {
    const selecionadas = empresas.filter(e => e.selecionada);
    if (selecionadas.length === 0) {
      toast.warning('Selecione pelo menos uma empresa');
      return;
    }

    setAdicionando(true);
    try {
      const prospectsToInsert = selecionadas.map(empresa => ({
        estabelecimento_id: estabelecimentoId,
        place_id: `scraping_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nome: empresa.nome,
        telefone: empresa.telefone || null,
        email_extraido: empresa.email || null,
        endereco_completo: empresa.endereco || `${cidade}, ${uf}`,
        cidade: cidade,
        estado: uf,
        fonte_dados: 'scraping_direto',
        status_lead: 'novo',
        dados_originais_json: empresa
      }));

      const { error } = await supabase
        .from('prospects_b2b')
        .insert(prospectsToInsert as any);

      if (error) throw error;

      toast.success(`${selecionadas.length} prospects adicionados!`);
      setEmpresas(prev => prev.filter(e => !e.selecionada));
      onProspectsFound?.(prospectsToInsert);
    } catch (error: any) {
      console.error('Erro ao adicionar:', error);
      toast.error('Erro ao adicionar prospects');
    } finally {
      setAdicionando(false);
    }
  };

  const selecionadas = empresas.filter(e => e.selecionada).length;

  return (
    <div className="space-y-4">
      {/* Resumo da Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Scraping Direto (Sem API)
          </CardTitle>
          <CardDescription>
            Extração direta de diretórios públicos - 100% gratuito
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parâmetros configurados */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              <Search className="h-3 w-3" />
              {termo || 'Não configurado'}
            </Badge>
            <Badge variant="secondary" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {cidade && uf ? `${cidade}/${uf}` : 'Não configurado'}
            </Badge>
          </div>

          {!hasSearchParams && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Configure o termo de busca, cidade e UF na <strong>Etapa 1</strong> para realizar buscas.
              </AlertDescription>
            </Alert>
          )}

          {hasSearchParams && (
            <Button 
              onClick={handleBuscar} 
              disabled={buscando}
              className="w-full"
            >
              {buscando ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Buscar Empresas
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Avisos e Erros */}
      {aviso && (
        <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            {aviso}
          </AlertDescription>
        </Alert>
      )}

      {erros.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Alguns diretórios tiveram problemas:</strong>
            <ul className="list-disc list-inside mt-1">
              {erros.map((erro, i) => (
                <li key={i} className="text-sm">{erro}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Fontes Consultadas */}
      {fontesConsultadas.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Fontes consultadas:</span>
          {fontesConsultadas.map(fonte => (
            <Badge key={fonte} variant="outline" className="text-xs">
              {fonte}
            </Badge>
          ))}
        </div>
      )}

      {/* Resultados */}
      {empresas.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                Empresas Encontradas ({empresas.length})
              </CardTitle>
              <div className="flex items-center gap-2">
                {selecionadas > 0 && (
                  <Badge variant="default">
                    {selecionadas} selecionada(s)
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={toggleTodas}
                >
                  {empresas.every(e => e.selecionada) ? 'Desmarcar Todas' : 'Selecionar Todas'}
                </Button>
                <Button
                  size="sm"
                  onClick={handleAdicionarSelecionadas}
                  disabled={selecionadas === 0 || adicionando}
                >
                  {adicionando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Adicionar ({selecionadas})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={empresas.length > 0 && empresas.every(e => e.selecionada)}
                        onCheckedChange={toggleTodas}
                      />
                    </TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Fonte</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empresas.map((empresa, index) => (
                    <TableRow key={index} className={empresa.selecionada ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          checked={empresa.selecionada}
                          onCheckedChange={() => toggleSelecao(index)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{empresa.nome}</span>
                        </div>
                        {empresa.endereco && (
                          <p className="text-xs text-muted-foreground mt-1">{empresa.endereco}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        {empresa.telefone ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            {empresa.telefone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {empresa.email ? (
                          <span className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            {empresa.email}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {empresa.fonte}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Estado vazio após busca */}
      {!buscando && empresas.length === 0 && fontesConsultadas.length > 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nenhuma empresa encontrada</h3>
            <p className="text-sm text-muted-foreground">
              Tente outros termos de busca ou uma cidade diferente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProspeccaoScrapingDiretoView;
