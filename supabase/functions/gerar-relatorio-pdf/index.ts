import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { relatorioId, apiVariables } = await req.json();

    console.log("📊 Gerando relatório:", relatorioId);
    console.log("📊 Variáveis da API:", apiVariables);

    // 1. Buscar relatório do banco
    const { data: relatorio, error: relError } = await supabase
      .from('relatorios')
      .select('*')
      .eq('id', relatorioId)
      .maybeSingle();

    if (relError || !relatorio) {
      throw new Error('Relatório não encontrado');
    }

    console.log("✅ Relatório encontrado:", relatorio.nome);

    // 2. Buscar dados da API se configurada
    let apiData: any[] = [];
    if (relatorio.configuracoes?.api_url) {
      console.log("🔗 Buscando dados da API:", relatorio.configuracoes.api_url);
      
      try {
        const apiResponse = await fetch(relatorio.configuracoes.api_url);
        const apiResult = await apiResponse.json();
        
        // Suporta APIs que retornam array direto ou objeto { data }
        if (Array.isArray(apiResult)) {
          apiData = apiResult;
        } else if (apiResult && typeof apiResult === 'object' && 'data' in apiResult) {
          apiData = Array.isArray(apiResult.data) ? apiResult.data : [apiResult.data];
        } else if (apiResult != null) {
          apiData = [apiResult];
        }
        
        console.log(`✅ ${apiData.length} registros carregados da API`);
      } catch (apiError) {
        console.error("❌ Erro ao buscar dados da API:", apiError);
        // Continua sem dados da API
      }
    }

    // 3. Preparar dados do relatório
    const layoutData = typeof relatorio.layout_json === 'string' 
      ? JSON.parse(relatorio.layout_json)
      : relatorio.layout_json;

    // Adicionar variáveis customizadas aos parâmetros
    const parameters: Record<string, any> = { ...apiVariables };
    
    // Se tem dados da API, adicionar ao parâmetro api_data
    if (apiData.length > 0) {
      parameters.api_data = apiData;
    }

    console.log("📝 Parâmetros finais para o relatório:", Object.keys(parameters));

    // 4. Gerar PDF usando ReportBro API
    const reportBroApiUrl = 'https://www.reportbro.com/report/run';
    
    const reportPayload = {
      report: layoutData,
      data: parameters,
      isTestData: false,
    };

    console.log("🚀 Chamando API ReportBro...");

    const pdfResponse = await fetch(reportBroApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportPayload),
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error("❌ Erro ReportBro API:", errorText);
      throw new Error(`ReportBro API error: ${pdfResponse.status}`);
    }

    let pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
    console.log("✅ PDF gerado, tamanho:", pdfBytes.length);

    // 5. Adicionar retângulo branco no rodapé (cobrir marca d'água)
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
        
        // Retângulo branco no rodapé (altura 80)
        page.drawRectangle({
          x: 0,
          y: 0,
          width: width,
          height: 80,
          color: { red: 1, green: 1, blue: 1 } as any,
        });
      }

      const savedBytes = await pdfDoc.save();
      pdfBytes = new Uint8Array(savedBytes);
      console.log("✅ Marca d'água removida");
    } catch (modError) {
      console.error("⚠️ Erro ao modificar PDF:", modError);
      // Continua com o PDF original
    }

    // 6. Salvar PDF no storage
    const fileName = `relatorio_${relatorioId}_${Date.now()}.pdf`;
    const filePath = `relatorios/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('bot-media')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Erro ao fazer upload:", uploadError);
      throw new Error(`Erro ao salvar PDF: ${uploadError.message}`);
    }

    // 7. Obter URL pública
    const { data: urlData } = supabase.storage
      .from('bot-media')
      .getPublicUrl(filePath);

    const pdfUrl = urlData.publicUrl;
    console.log("✅ PDF salvo em:", pdfUrl);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl,
        fileName: relatorio.nome,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("❌ Erro geral:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
