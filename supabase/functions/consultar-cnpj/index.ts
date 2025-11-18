import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();
    
    if (!cnpj) {
      return new Response(
        JSON.stringify({ error: 'CNPJ é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remover formatação do CNPJ
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    
    console.log('Consultando CNPJ:', cleanCNPJ);

    // Usar API pública da ReceitaWS
    const response = await fetch(`https://receitaws.com.br/v1/cnpj/${cleanCNPJ}`);
    
    if (!response.ok) {
      console.error('Erro na consulta:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Erro ao consultar CNPJ na Receita Federal' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    console.log('Dados recebidos:', data);

    // Verificar se houve erro na resposta
    if (data.status === 'ERROR') {
      return new Response(
        JSON.stringify({ error: data.message || 'CNPJ não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mapear os dados retornados para variáveis mais amigáveis
    const simplesOptante = data.simples?.optante || false;
    const simeiOptante = data.simei?.optante || false;
    
    let regimeTributario = 'Lucro Presumido/Real';
    if (simeiOptante) {
      regimeTributario = 'SIMEI';
    } else if (simplesOptante) {
      regimeTributario = 'Simples Nacional';
    }
    
    const empresaData = {
      cnpj: data.cnpj,
      razao_social: data.nome || '',
      nome_fantasia: data.fantasia || '',
      situacao: data.situacao || '',
      data_situacao: data.data_situacao || '',
      tipo: data.tipo || '',
      abertura: data.abertura || '',
      natureza_juridica: data.natureza_juridica || '',
      porte: data.porte || '',
      capital_social: data.capital_social || '',
      
      // Endereço
      logradouro: data.logradouro || '',
      numero: data.numero || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      municipio: data.municipio || '',
      uf: data.uf || '',
      cep: data.cep || '',
      
      // Contato
      telefone: data.telefone || '',
      email: data.email || '',
      
      // Atividades
      atividade_principal: data.atividade_principal?.[0]?.text || '',
      atividade_principal_codigo: data.atividade_principal?.[0]?.code || '',
      
      // Regime Tributário
      regime_tributario: regimeTributario,
      simples_optante: simplesOptante ? 'Sim' : 'Não',
      simei_optante: simeiOptante ? 'Sim' : 'Não',
      
      // Dados extras
      efr: data.efr || '',
      motivo_situacao: data.motivo_situacao || '',
      situacao_especial: data.situacao_especial || '',
      data_situacao_especial: data.data_situacao_especial || '',
      
      // Sócios (simplificado - apenas o primeiro)
      socio_nome: data.qsa?.[0]?.nome || '',
      socio_qualificacao: data.qsa?.[0]?.qual || '',
    };

    console.log('Dados processados:', empresaData);

    return new Response(
      JSON.stringify({ success: true, data: empresaData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in consultar-cnpj function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
