import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, Database, Building2, MapPin, FileText, CheckCircle, AlertTriangle, Upload, Plus, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import CNPJImportView from './CNPJImportView';

interface Municipio {
  id: number;
  nome: string;
  uf: string;
}

interface EmpresaLocal {
  id: string;
  cnpj: string;
  razao_social: string | null;
  nome_fantasia: string | null;
  situacao_cadastral: string | null;
  cnae_fiscal: string | null;
  cnae_fiscal_descricao: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  municipio: string | null;
  uf: string | null;
  cep: string | null;
  telefone1: string | null;
  telefone2: string | null;
  email: string | null;
  selecionada?: boolean;
}

interface ProspeccaoDadosAbertosViewProps {
  estabelecimentoId: string | null;
  onProspectsFound?: (prospects: any[]) => void;
}

const UF_LIST = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 
  'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 
  'SP', 'SE', 'TO'
];

const ProspeccaoDadosAbertosView: React.FC<ProspeccaoDadosAbertosViewProps> = ({
  estabelecimentoId,
  onProspectsFound
}) => {
  const [activeTab, setActiveTab] = useState('buscar');
  const [uf, setUf] = useState('');
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [municipio, setMunicipio] = useState('');
  const [cnaeSearch, setCnaeSearch] = useState('');
  const [cnpjConsulta, setCnpjConsulta] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [resultadoCNPJ, setResultadoCNPJ] = useState<any>(null);
  const [hasLocalBase, setHasLocalBase] = useState(false);
  const [empresasLocais, setEmpresasLocais] = useState<EmpresaLocal[]>([]);
  const [adicionando, setAdicionando] = useState(false);

  // Verificar se tem base local
  useEffect(() => {
    if (estabelecimentoId) {
      checkLocalBase();
    }
  }, [estabelecimentoId]);

  const checkLocalBase = async () => {
    if (!estabelecimentoId) return;
    
    const { count } = await supabase
      .from('cnpj_base_local')
      .select('*', { count: 'exact', head: true })
      .eq('estabelecimento_id', estabelecimentoId);
    
    setHasLocalBase((count || 0) > 0);
  };

  // Carregar municípios quando UF mudar
  useEffect(() => {
    if (!uf) {
      setMunicipios([]);
      setMunicipio('');
      return;
    }

    const loadMunicipios = async () => {
      setLoadingMunicipios(true);
      try {
        // Se tem base local, pegar municípios dela
        if (hasLocalBase && estabelecimentoId) {
          const { data } = await supabase
            .from('cnpj_base_local')
            .select('municipio')
            .eq('estabelecimento_id', estabelecimentoId)
            .eq('uf', uf)
            .limit(1000);
          
          const uniqueMunicipios = [...new Set(data?.map(r => r.municipio).filter(Boolean) || [])];
          setMunicipios(uniqueMunicipios.sort().map((nome, idx) => ({ id: idx, nome: nome as string, uf })));
        } else {
          // Usar API do IBGE
          const { data, error } = await supabase.functions.invoke('prospeccao-dados-abertos', {
            body: { action: 'listar_municipios', params: { uf } }
          });

          if (error) throw error;
          if (data?.success) {
            setMunicipios(data.data || []);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar municípios:', error);
        toast.error('Falha ao carregar municípios');
      }
      setLoadingMunicipios(false);
    };

    loadMunicipios();
  }, [uf, hasLocalBase, estabelecimentoId]);

  // Buscar empresas por município e CNAE
  const handleBuscarEmpresas = async () => {
    if (!municipio || !uf) {
      toast.error('Selecione o Estado e o Município');
      return;
    }

    setLoading(true);
    setEmpresasLocais([]);

    try {
      // Buscar na base local primeiro
      if (hasLocalBase && estabelecimentoId) {
        let query = supabase
          .from('cnpj_base_local')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('uf', uf)
          .eq('municipio', municipio)
          .eq('situacao_cadastral', 'ATIVA')
          .limit(100);

        if (cnaeSearch) {
          query = query.ilike('cnae_fiscal', `${cnaeSearch}%`);
        }

        const { data, error } = await query;

        if (error) throw error;

        const empresasComSelecao = (data || []).map(e => ({
          ...e,
          selecionada: false
        }));

        setEmpresasLocais(empresasComSelecao);
        toast.success(`${empresasComSelecao.length} empresas encontradas na base local`);
      } else {
        // Usar API externa
        const { data, error } = await supabase.functions.invoke('prospeccao-dados-abertos', {
          body: { 
            action: 'search', 
            params: { 
              municipio, 
              uf, 
              cnae: cnaeSearch || undefined,
              limite: 50
            } 
          }
        });

        if (error) throw error;

        if (data?.success) {
          toast.info(`API externa: ${data.total || 0} empresas. Para buscas ilimitadas, importe a base local.`);
          
          if (onProspectsFound && data.data) {
            onProspectsFound(data.data);
          }
        } else {
          throw new Error(data?.error || 'Erro na busca');
        }
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao buscar empresas');
    }
    setLoading(false);
  };

  // Consultar CNPJ específico via API
  const handleConsultarCNPJ = async () => {
    if (!cnpjConsulta) {
      toast.error('Informe o CNPJ para consultar');
      return;
    }

    setLoadingCNPJ(true);
    setResultadoCNPJ(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('prospeccao-dados-abertos', {
        body: { action: 'consultar_cnpj', params: { cnpj: cnpjConsulta } }
      });

      if (error) throw error;

      if (data?.success) {
        setResultadoCNPJ(data.data);
        toast.success('CNPJ encontrado');
      } else {
        throw new Error(data?.error || 'CNPJ não encontrado');
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      toast.error(error instanceof Error ? error.message : 'Falha ao consultar CNPJ');
    }
    setLoadingCNPJ(false);
  };

  // Toggle seleção
  const toggleSelecao = (id: string) => {
    setEmpresasLocais(prev => prev.map(e => 
      e.id === id ? { ...e, selecionada: !e.selecionada } : e
    ));
  };

  const toggleTodas = () => {
    const todasSelecionadas = empresasLocais.every(e => e.selecionada);
    setEmpresasLocais(prev => prev.map(e => ({ ...e, selecionada: !todasSelecionadas })));
  };

  // Adicionar selecionados como prospects
  const handleAdicionarSelecionados = async () => {
    const selecionadas = empresasLocais.filter(e => e.selecionada);
    
    if (selecionadas.length === 0) {
      toast.warning('Selecione ao menos uma empresa');
      return;
    }

    if (!estabelecimentoId) return;

    setAdicionando(true);

    try {
      const prospectsToInsert = selecionadas.map(empresa => ({
        estabelecimento_id: estabelecimentoId,
        place_id: `cnpj_${empresa.cnpj.replace(/\D/g, '')}`,
        nome: empresa.nome_fantasia || empresa.razao_social || 'Sem nome',
        endereco_completo: [empresa.logradouro, empresa.numero, empresa.bairro].filter(Boolean).join(', '),
        cidade: empresa.municipio,
        estado: empresa.uf,
        cep: empresa.cep,
        telefone: empresa.telefone1 || empresa.telefone2 || null,
        email_extraido: empresa.email || null,
        categoria: empresa.cnae_fiscal_descricao || empresa.cnae_fiscal,
        fonte_dados: 'dados_abertos',
        status_lead: 'novo'
      }));

      const { error } = await supabase
        .from('prospects_b2b')
        .insert(prospectsToInsert as any);

      if (error) throw error;

      toast.success(`${selecionadas.length} prospects adicionados!`);
      
      setEmpresasLocais(prev => prev.filter(e => !e.selecionada));
      onProspectsFound?.(prospectsToInsert);

    } catch (error) {
      console.error('Erro ao adicionar:', error);
      toast.error('Erro ao adicionar prospects');
    } finally {
      setAdicionando(false);
    }
  };

  // Adicionar CNPJ consultado
  const handleAdicionarProspect = async () => {
    if (!resultadoCNPJ || !estabelecimentoId) return;

    try {
      const endereco = [
        resultadoCNPJ.logradouro,
        resultadoCNPJ.numero,
        resultadoCNPJ.bairro
      ].filter(Boolean).join(', ');

      const placeId = `cnpj_${resultadoCNPJ.cnpj.replace(/\D/g, '')}`;
      
      const { error } = await supabase.from('prospects_b2b').insert([{
        estabelecimento_id: estabelecimentoId,
        place_id: placeId,
        nome: resultadoCNPJ.nome_fantasia || resultadoCNPJ.razao_social,
        endereco_completo: endereco,
        cidade: resultadoCNPJ.municipio,
        estado: resultadoCNPJ.uf,
        cep: resultadoCNPJ.cep,
        telefone: resultadoCNPJ.telefone1 || null,
        categoria: resultadoCNPJ.cnae_fiscal_descricao,
        fonte_dados: 'dados_abertos',
        status_lead: 'novo'
      }]);

      if (error) throw error;

      toast.success('Prospect adicionado!');
      setResultadoCNPJ(null);
      setCnpjConsulta('');
    } catch (error) {
      console.error('Erro ao adicionar prospect:', error);
      toast.error('Falha ao adicionar prospect');
    }
  };

  const qtdSelecionadas = empresasLocais.filter(e => e.selecionada).length;

  return (
    <div className="space-y-4">
      {/* Alerta informativo */}
      <Alert className={hasLocalBase ? "border-green-500 bg-green-50 dark:bg-green-950" : "border-amber-500 bg-amber-50 dark:bg-amber-950"}>
        <Database className={`h-4 w-4 ${hasLocalBase ? 'text-green-600' : 'text-amber-600'}`} />
        <AlertDescription className={hasLocalBase ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}>
          {hasLocalBase ? (
            <><strong>Base local ativa!</strong> Buscas ilimitadas usando sua base de CNPJs importada.</>
          ) : (
            <><strong>Sem base local.</strong> Importando a base do dados.gov.br você terá buscas ilimitadas. Veja a aba "Importar Base".</>
          )}
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="buscar" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Buscar
          </TabsTrigger>
          <TabsTrigger value="cnpj" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Consultar CNPJ
          </TabsTrigger>
          <TabsTrigger value="importar" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Importar Base
          </TabsTrigger>
        </TabsList>

        {/* Buscar por Município */}
        <TabsContent value="buscar" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5" />
                Buscar por Município
              </CardTitle>
              <CardDescription>
                {hasLocalBase ? 'Buscando na sua base local de CNPJs' : 'Busca via API externa (limitado)'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Estado (UF)</Label>
                  <Select value={uf} onValueChange={setUf}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {UF_LIST.map((estado) => (
                        <SelectItem key={estado} value={estado}>
                          {estado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Município</Label>
                  <Select 
                    value={municipio} 
                    onValueChange={setMunicipio}
                    disabled={!uf || loadingMunicipios}
                  >
                    <SelectTrigger>
                      {loadingMunicipios ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <SelectValue placeholder="Selecione" />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {municipios.map((m) => (
                        <SelectItem key={m.id} value={m.nome}>
                          {m.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>CNAE (opcional)</Label>
                  <Input
                    value={cnaeSearch}
                    onChange={(e) => setCnaeSearch(e.target.value)}
                    placeholder="Ex: 47 (varejo)"
                  />
                </div>
              </div>

              <Button 
                onClick={handleBuscarEmpresas} 
                disabled={loading || !municipio}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando...</>
                ) : (
                  <><Search className="h-4 w-4 mr-2" /> Buscar Empresas</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Resultados da busca local */}
          {empresasLocais.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Empresas Encontradas ({empresasLocais.length})</CardTitle>
                    <CardDescription>Selecione as empresas para adicionar como prospects</CardDescription>
                  </div>
                  {qtdSelecionadas > 0 && (
                    <Button onClick={handleAdicionarSelecionados} disabled={adicionando}>
                      {adicionando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                      Adicionar {qtdSelecionadas}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">
                          <Checkbox 
                            checked={empresasLocais.length > 0 && empresasLocais.every(e => e.selecionada)}
                            onCheckedChange={toggleTodas}
                          />
                        </TableHead>
                        <TableHead>Empresa</TableHead>
                        <TableHead>Contato</TableHead>
                        <TableHead>Endereço</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empresasLocais.map((empresa) => (
                        <TableRow key={empresa.id} className={empresa.selecionada ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <Checkbox 
                              checked={empresa.selecionada}
                              onCheckedChange={() => toggleSelecao(empresa.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                {empresa.nome_fantasia || empresa.razao_social || 'Sem nome'}
                              </div>
                              <div className="text-xs text-muted-foreground">{empresa.cnpj}</div>
                              {empresa.cnae_fiscal && (
                                <Badge variant="secondary" className="text-xs">CNAE: {empresa.cnae_fiscal}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 text-sm">
                              {empresa.telefone1 && (
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="h-3 w-3" />{empresa.telefone1}
                                </div>
                              )}
                              {empresa.email && (
                                <div className="flex items-center gap-1 text-blue-600">
                                  <Mail className="h-3 w-3" />{empresa.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground flex items-start gap-1">
                              <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span>
                                {[empresa.logradouro, empresa.numero, empresa.bairro, `${empresa.municipio}/${empresa.uf}`]
                                  .filter(Boolean).join(', ')}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Consultar CNPJ */}
        <TabsContent value="cnpj">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Consultar CNPJ
              </CardTitle>
              <CardDescription>
                Consulte dados de uma empresa específica pelo CNPJ (via BrasilAPI - gratuito)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={cnpjConsulta}
                  onChange={(e) => setCnpjConsulta(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="max-w-xs"
                />
                <Button 
                  onClick={handleConsultarCNPJ} 
                  disabled={loadingCNPJ || !cnpjConsulta}
                >
                  {loadingCNPJ ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Consultando...</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" /> Consultar</>
                  )}
                </Button>
              </div>

              {resultadoCNPJ && (
                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {resultadoCNPJ.nome_fantasia || resultadoCNPJ.razao_social}
                    </h4>
                    <Badge variant={resultadoCNPJ.situacao_cadastral === 'ATIVA' ? 'default' : 'secondary'}>
                      {resultadoCNPJ.situacao_cadastral}
                    </Badge>
                  </div>
                  
                  <div className="text-sm space-y-1">
                    <p><strong>Razão Social:</strong> {resultadoCNPJ.razao_social}</p>
                    <p><strong>CNPJ:</strong> {resultadoCNPJ.cnpj}</p>
                    <p><strong>Endereço:</strong> {resultadoCNPJ.logradouro}, {resultadoCNPJ.numero} - {resultadoCNPJ.bairro}</p>
                    <p><strong>Cidade:</strong> {resultadoCNPJ.municipio}/{resultadoCNPJ.uf}</p>
                    <p><strong>CNAE:</strong> {resultadoCNPJ.cnae_fiscal_descricao}</p>
                    {resultadoCNPJ.telefone1 && <p><strong>Telefone:</strong> {resultadoCNPJ.telefone1}</p>}
                    {resultadoCNPJ.email && <p><strong>Email:</strong> {resultadoCNPJ.email}</p>}
                  </div>

                  <Button onClick={handleAdicionarProspect} className="w-full">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Adicionar como Prospect
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Importar Base */}
        <TabsContent value="importar">
          {estabelecimentoId && (
            <CNPJImportView 
              estabelecimentoId={estabelecimentoId}
              onImportComplete={checkLocalBase}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ProspeccaoDadosAbertosView;
