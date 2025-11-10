import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para processar o relatório em background
async function processarRelatorio(
  jobId: string,
  relatorioId: string,
  apiVariables: Record<string, any>,
  supabaseUrl: string,
  supabaseKey: string
) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log(`📊 [Job ${jobId}] Processando relatório:`, relatorioId);

    // Atualizar status para processing
    await supabase
      .from('relatorio_jobs')
      .update({ status: 'processing' })
      .eq('id', jobId);

    // 1. Buscar relatório do banco
    const { data: relatorio, error: relError } = await supabase
      .from('relatorios')
      .select('*')
      .eq('id', relatorioId)
      .maybeSingle();

    if (relError || !relatorio) {
      throw new Error('Relatório não encontrado');
    }

    console.log(`✅ [Job ${jobId}] Relatório encontrado:`, relatorio.nome);

    // 2. Buscar dados da API se configurada
    let apiData: any[] = [];
    if (relatorio.configuracoes?.api_url) {
      console.log(`🔗 [Job ${jobId}] Buscando dados da API:`, relatorio.configuracoes.api_url);
      
      try {
        const apiResponse = await fetch(relatorio.configuracoes.api_url);
        const apiResult = await apiResponse.json();
        
        if (Array.isArray(apiResult)) {
          apiData = apiResult;
        } else if (apiResult && typeof apiResult === 'object' && 'data' in apiResult) {
          apiData = Array.isArray(apiResult.data) ? apiResult.data : [apiResult.data];
        } else if (apiResult != null) {
          apiData = [apiResult];
        }
        
        console.log(`✅ [Job ${jobId}] ${apiData.length} registros carregados`);
      } catch (apiError) {
        console.error(`❌ [Job ${jobId}] Erro ao buscar dados da API:`, apiError);
      }
    }

    // 3. Preparar dados do relatório
    const layoutData = typeof relatorio.layout_json === 'string' 
      ? JSON.parse(relatorio.layout_json)
      : relatorio.layout_json;

    const parameters: Record<string, any> = { ...apiVariables };
    if (apiData.length > 0) {
      parameters.api_data = apiData;
    }

    // 4. Chamar API ReportBro
    const reportBroApiUrl = 'https://www.reportbro.com/report/run';
    const reportPayload = {
      report: layoutData,
      data: parameters,
      isTestData: false,
    };

    console.log(`🚀 [Job ${jobId}] Chamando API ReportBro...`);

    const pdfResponse = await fetch(reportBroApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reportPayload),
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      throw new Error(`ReportBro API error: ${pdfResponse.status} - ${errorText}`);
    }

    const contentType = pdfResponse.headers.get('content-type');
    console.log(`📄 [Job ${jobId}] Content-Type:`, contentType);

    let pdfBytes: Uint8Array | null = null;

    // Verificar se é key ou PDF direto
    if (contentType?.includes('text/plain')) {
      const responseText = await pdfResponse.text();
      console.log(`🔑 [Job ${jobId}] Resposta:`, responseText);
      
      if (responseText.startsWith('key:')) {
        const key = responseText.substring(4);
        
        // Salvar a key no job
        await supabase
          .from('relatorio_jobs')
          .update({ reportbro_key: key })
          .eq('id', jobId);
        
        console.log(`⏳ [Job ${jobId}] Aguardando PDF com key:`, key);
        
        // Polling com mais tempo (até 2 minutos)
        let attempts = 0;
        const maxAttempts = 60; // 60 tentativas x 2 segundos = 2 minutos
        
        while (attempts < maxAttempts && !pdfBytes) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
          
          if (attempts % 5 === 0) {
            console.log(`🔄 [Job ${jobId}] Tentativa ${attempts}/${maxAttempts}...`);
          }
          
          const pdfGetResponse = await fetch(`https://www.reportbro.com/report/get?key=${key}`);
          
          if (pdfGetResponse.ok) {
            const getPdfContentType = pdfGetResponse.headers.get('content-type');
            
            if (getPdfContentType?.includes('application/pdf')) {
              pdfBytes = new Uint8Array(await pdfGetResponse.arrayBuffer());
              console.log(`✅ [Job ${jobId}] PDF obtido, tamanho:`, pdfBytes.length);
            }
          }
        }
        
        if (!pdfBytes) {
          throw new Error('Timeout: PDF não foi gerado a tempo');
        }
      } else {
        throw new Error(`Resposta inesperada: ${responseText}`);
      }
    } else {
      pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
      console.log(`✅ [Job ${jobId}] PDF direto, tamanho:`, pdfBytes.length);
    }

    if (!pdfBytes) {
      throw new Error('Falha ao obter PDF');
    }

    // Validar PDF
    const pdfHeader = new TextDecoder().decode(pdfBytes.slice(0, 4));
    if (pdfHeader !== '%PDF') {
      throw new Error('Conteúdo inválido - não é um PDF');
    }

    // 5. Remover marca d'água
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();

      for (const page of pages) {
        const { width, height } = page.getSize();
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
    } catch (modError) {
      console.error(`⚠️ [Job ${jobId}] Erro ao modificar PDF:`, modError);
    }

    // 6. Salvar no storage
    const fileName = `relatorio_${relatorioId}_${Date.now()}.pdf`;
    const filePath = `relatorios/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('bot-media')
      .upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Erro ao salvar PDF: ${uploadError.message}`);
    }

    const { data: urlData } = supabase.storage
      .from('bot-media')
      .getPublicUrl(filePath);

    const pdfUrl = urlData.publicUrl;
    console.log(`✅ [Job ${jobId}] PDF salvo:`, pdfUrl);

    // Atualizar job como completo
    await supabase
      .from('relatorio_jobs')
      .update({
        status: 'completed',
        pdf_url: pdfUrl,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);

  } catch (error: any) {
    console.error(`❌ [Job ${jobId}] Erro:`, error);
    
    await supabase
      .from('relatorio_jobs')
      .update({
        status: 'error',
        error_message: error.message,
      })
      .eq('id', jobId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { relatorioId, apiVariables = {} } = await req.json();

    console.log("📊 Iniciando geração de relatório:", relatorioId);

    // Criar job no banco
    const { data: job, error: jobError } = await supabase
      .from('relatorio_jobs')
      .insert({
        relatorio_id: relatorioId,
        api_variables: apiVariables,
        status: 'pending',
      })
      .select()
      .single();

    if (jobError || !job) {
      throw new Error('Erro ao criar job: ' + jobError?.message);
    }

    console.log("✅ Job criado:", job.id);

    // Processar em background (não await) e retornar job ID imediatamente
    processarRelatorio(job.id, relatorioId, apiVariables, supabaseUrl, supabaseKey)
      .catch(error => console.error("Erro no processamento:", error));

    // Retornar imediatamente com o ID do job
    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
        message: 'Relatório sendo gerado em background',
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
