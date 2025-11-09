import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ReportRequest {
  report: any; // JSON do layout do ReportBro
  data?: any; // Dados para preencher o relatório (opcional)
  isTestData?: boolean;
  outputFormat?: 'pdf' | 'xlsx'; // Formato de saída
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { report, data, isTestData = false, outputFormat = 'pdf' }: ReportRequest = await req.json();

    console.log('Gerando relatório, formato:', outputFormat);
    console.log('Usando dados de teste?', isTestData);

    if (!report || typeof report !== 'object') {
      throw new Error('JSON do relatório inválido');
    }

    // Prepara o payload para a API do ReportBro
    const payload: any = {
      report,
      outputFormat,
      isTestData
    };

    // Se forneceu dados customizados, usa eles
    if (data && !isTestData) {
      payload.data = data;
    }

    console.log('Chamando API do ReportBro...');

    // Chama a API oficial do ReportBro para gerar o PDF/XLSX
    const response = await fetch('https://www.reportbro.com/report/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API ReportBro:', response.status, errorText);
      throw new Error(`Erro ao gerar relatório: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    const pdfBuffer = await response.arrayBuffer();

    console.log('Relatório gerado com sucesso, tamanho:', pdfBuffer.byteLength, 'bytes');

    // Retorna o PDF/XLSX gerado
    return new Response(pdfBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="relatorio.${outputFormat}"`,
      },
    });
  } catch (error: any) {
    console.error('Erro ao gerar relatório:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro ao gerar relatório',
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
