import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, Database, Building2, MapPin, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Municipio {
  id: number;
  nome: string;
  uf: string;
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
  const { toast } = useToast();
  const [uf, setUf] = useState('');
  const [municipios, setMunicipios] = useState<Municipio[]>([]);
  const [municipio, setMunicipio] = useState('');
  const [cnaeSearch, setCnaeSearch] = useState('');
  const [cnpjConsulta, setCnpjConsulta] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMunicipios, setLoadingMunicipios] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [resultadoCNPJ, setResultadoCNPJ] = useState<any>(null);

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
        const { data, error } = await supabase.functions.invoke('prospeccao-dados-abertos', {
          body: { action: 'listar_municipios', params: { uf } }
        });

        if (error) throw error;
        if (data?.success) {
          setMunicipios(data.data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar municípios:', error);
        toast({
          title: 'Erro',
          description: 'Falha ao carregar municípios',
          variant: 'destructive'
        });
      }
      setLoadingMunicipios(false);
    };

    loadMunicipios();
  }, [uf, toast]);

  // Buscar empresas por município e CNAE
  const handleBuscarEmpresas = async () => {
    if (!municipio || !uf) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o Estado e o Município',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
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
        toast({
          title: 'Busca concluída',
          description: `Encontradas ${data.total || 0} empresas`
        });
        
        if (onProspectsFound && data.data) {
          onProspectsFound(data.data);
        }
      } else {
        throw new Error(data?.error || 'Erro na busca');
      }
    } catch (error) {
      console.error('Erro na busca:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao buscar empresas',
        variant: 'destructive'
      });
    }
    setLoading(false);
  };

  // Consultar CNPJ específico
  const handleConsultarCNPJ = async () => {
    if (!cnpjConsulta) {
      toast({
        title: 'CNPJ obrigatório',
        description: 'Informe o CNPJ para consultar',
        variant: 'destructive'
      });
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
        toast({
          title: 'CNPJ encontrado',
          description: data.data.razao_social
        });
      } else {
        throw new Error(data?.error || 'CNPJ não encontrado');
      }
    } catch (error) {
      console.error('Erro ao consultar CNPJ:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Falha ao consultar CNPJ',
        variant: 'destructive'
      });
    }
    setLoadingCNPJ(false);
  };

  // Adicionar CNPJ como prospect
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
        website: null,
        categoria: resultadoCNPJ.cnae_fiscal_descricao,
        fonte_dados: 'dados_abertos',
        status_lead: 'novo'
      }]);

      if (error) throw error;

      toast({
        title: 'Prospect adicionado',
        description: 'Empresa adicionada à lista de prospects'
      });

      // Limpar resultado
      setResultadoCNPJ(null);
      setCnpjConsulta('');
    } catch (error) {
      console.error('Erro ao adicionar prospect:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao adicionar prospect',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Alerta informativo */}
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
        <Database className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700 dark:text-green-300">
          <strong>Dados Abertos (Grátis):</strong> Consulta dados públicos da Receita Federal via BrasilAPI. 
          Retorna razão social, endereço, CNAE e situação cadastral. Sem custo por consulta.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Busca por Município */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Buscar por Município
            </CardTitle>
            <CardDescription>
              Busque empresas por estado, município e ramo de atividade (CNAE)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label>CNAE / Ramo de Atividade (opcional)</Label>
              <Input
                value={cnaeSearch}
                onChange={(e) => setCnaeSearch(e.target.value)}
                placeholder="Ex: 4711-3/02 ou deixe vazio para todos"
              />
              <p className="text-xs text-muted-foreground">
                Informe o código CNAE para filtrar por ramo de atividade
              </p>
            </div>

            <Button 
              onClick={handleBuscarEmpresas} 
              disabled={loading || !municipio}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Buscar Empresas
                </>
              )}
            </Button>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Limitação:</strong> A busca em massa por município requer acesso à base completa de CNPJs. 
                Para uso em produção, recomendamos integrar com uma API paga ou baixar a base do dados.gov.br.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Consulta de CNPJ */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Consultar CNPJ
            </CardTitle>
            <CardDescription>
              Consulte dados de uma empresa específica pelo CNPJ (gratuito)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input
                value={cnpjConsulta}
                onChange={(e) => setCnpjConsulta(e.target.value)}
                placeholder="00.000.000/0000-00"
              />
            </div>

            <Button 
              onClick={handleConsultarCNPJ} 
              disabled={loadingCNPJ || !cnpjConsulta}
              className="w-full"
            >
              {loadingCNPJ ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Consultando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Consultar CNPJ
                </>
              )}
            </Button>

            {/* Resultado da consulta */}
            {resultadoCNPJ && (
              <div className="mt-4 p-4 border rounded-lg bg-muted/50 space-y-3">
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
                  {resultadoCNPJ.telefone1 && (
                    <p><strong>Telefone:</strong> {resultadoCNPJ.telefone1}</p>
                  )}
                  {resultadoCNPJ.email && (
                    <p><strong>Email:</strong> {resultadoCNPJ.email}</p>
                  )}
                </div>

                <Button onClick={handleAdicionarProspect} className="w-full mt-2">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Adicionar como Prospect
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProspeccaoDadosAbertosView;
