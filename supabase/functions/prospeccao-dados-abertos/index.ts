const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CNPJResult {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  tipo: string;
  porte: string;
  natureza_juridica: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  cnaes_secundarios: Array<{ codigo: number; descricao: string }>;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone1: string;
  telefone2: string;
  email: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string;
  data_inicio_atividade: string;
  capital_social: number;
}

interface SearchParams {
  municipio: string;
  uf: string;
  cnae?: string;
  porte?: string;
  situacao_cadastral?: string;
  pagina?: number;
  limite?: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, params } = await req.json();

    if (action === 'search') {
      return await searchEmpresas(params);
    } else if (action === 'consultar_cnpj') {
      return await consultarCNPJ(params.cnpj);
    } else if (action === 'listar_cnaes') {
      return await listarCNAEs();
    } else if (action === 'listar_municipios') {
      return await listarMunicipios(params.uf);
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function searchEmpresas(params: SearchParams) {
  const { municipio, uf, cnae, porte, situacao_cadastral, pagina = 1, limite = 50 } = params;

  if (!municipio || !uf) {
    return new Response(
      JSON.stringify({ success: false, error: 'Município e UF são obrigatórios' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  console.log(`Buscando empresas: ${municipio}/${uf}, CNAE: ${cnae || 'todos'}`);

  // Usar a API Casa dos Dados (gratuita para consultas básicas)
  // Esta API permite buscar CNPJs por município, CNAE, etc.
  const queryParams = new URLSearchParams();
  queryParams.set('municipio', municipio.toUpperCase());
  queryParams.set('uf', uf.toUpperCase());
  if (cnae) queryParams.set('cnae', cnae);
  if (porte) queryParams.set('porte', porte);
  queryParams.set('situacao_cadastral', situacao_cadastral || 'ATIVA');
  queryParams.set('pagina', pagina.toString());

  try {
    // Primeiro, tentamos a API pública do Casa dos Dados
    // Nota: Esta API tem limitações, então usamos múltiplas fontes como fallback
    
    // Tentativa 1: BrasilAPI para dados de CNPJ
    // A BrasilAPI não tem busca por município diretamente, mas podemos usar para enriquecer dados
    
    // Tentativa 2: Usar a API do IBGE para dados de municípios
    // e cruzar com dados públicos disponíveis
    
    // Por enquanto, vamos usar a API pública do ReceitaWS como demonstração
    // Em produção, seria ideal usar uma base de dados local ou API paga
    
    // Simulação de busca - Em produção, integrar com API real
    const mockResults = await fetchMockResults(municipio, uf, cnae, limite);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: mockResults,
        total: mockResults.length,
        pagina,
        fonte: 'dados_abertos'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro na busca:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Falha ao buscar empresas' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function consultarCNPJ(cnpj: string) {
  if (!cnpj) {
    return new Response(
      JSON.stringify({ success: false, error: 'CNPJ é obrigatório' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Limpar CNPJ
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  
  console.log(`Consultando CNPJ: ${cnpjLimpo}`);

  try {
    // Usar BrasilAPI (gratuita e confiável)
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorData.message || `CNPJ não encontrado (status ${response.status})` 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          cnpj: data.cnpj,
          razao_social: data.razao_social,
          nome_fantasia: data.nome_fantasia,
          tipo: data.descricao_identificador_matriz_filial,
          porte: data.descricao_porte,
          natureza_juridica: data.natureza_juridica,
          cnae_fiscal: data.cnae_fiscal,
          cnae_fiscal_descricao: data.cnae_fiscal_descricao,
          cnaes_secundarios: data.cnaes_secundarios || [],
          logradouro: data.logradouro,
          numero: data.numero,
          complemento: data.complemento,
          bairro: data.bairro,
          municipio: data.municipio,
          uf: data.uf,
          cep: data.cep,
          telefone1: data.ddd_telefone_1,
          telefone2: data.ddd_telefone_2,
          email: data.email,
          situacao_cadastral: data.descricao_situacao_cadastral,
          data_situacao_cadastral: data.data_situacao_cadastral,
          data_inicio_atividade: data.data_inicio_atividade,
          capital_social: data.capital_social
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao consultar CNPJ:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Falha ao consultar CNPJ' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function listarCNAEs() {
  try {
    // Usar BrasilAPI para listar CNAEs
    const response = await fetch('https://brasilapi.com.br/api/cnae/v2');
    
    if (!response.ok) {
      throw new Error('Falha ao buscar CNAEs');
    }

    const data = await response.json();
    
    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao listar CNAEs:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Falha ao listar CNAEs' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function listarMunicipios(uf: string) {
  if (!uf) {
    return new Response(
      JSON.stringify({ success: false, error: 'UF é obrigatória' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Usar API do IBGE para listar municípios
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`);
    
    if (!response.ok) {
      throw new Error('Falha ao buscar municípios');
    }

    const data = await response.json();
    
    // Formatar resposta
    const municipios = data.map((m: any) => ({
      id: m.id,
      nome: m.nome,
      uf: uf.toUpperCase()
    }));
    
    return new Response(
      JSON.stringify({ success: true, data: municipios }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro ao listar municípios:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Falha ao listar municípios' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

// Função para buscar resultados (em produção, substituir por API real)
async function fetchMockResults(municipio: string, uf: string, cnae: string | undefined, limite: number) {
  // Esta é uma função de demonstração
  // Em produção, você deve integrar com:
  // 1. Base de dados local de CNPJs (dados.gov.br)
  // 2. API paga como Casa dos Dados, CNPJa, etc.
  // 3. Scraping de sites públicos (com cuidado legal)
  
  console.log(`[DEMO] Buscando até ${limite} empresas em ${municipio}/${uf} com CNAE ${cnae || 'qualquer'}`);
  
  // Retornar array vazio para demonstração
  // A implementação real deve fazer a busca real
  return [];
}
