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

    const requestBody = await req.json();
    console.log("📦 Body completo recebido:", JSON.stringify(requestBody, null, 2));
    
    const { relatorioId, apiVariables, reportVariables, outputType } = requestBody;
    const outputFormat = outputType === 'xlsx' ? 'xlsx' : 'pdf';

    console.log("📊 Gerando relatório:", relatorioId);
    console.log("📊 Variáveis da API:", apiVariables);
    console.log("📊 Variáveis do Relatório:", reportVariables);
    console.log("📊 Tipo de saída solicitado:", outputType);
    console.log("📊 Formato de saída processado:", outputFormat);

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

    // 2. Preparar parâmetros e converter tipos
    const convertedParams: Record<string, any> = {};
    if (apiVariables && typeof apiVariables === 'object') {
      for (const [key, varData] of Object.entries(apiVariables)) {
        const isVarObject = typeof varData === 'object' && varData !== null && 'value' in varData && 'type' in varData;
        const value = isVarObject ? (varData as any).value : String(varData);
        const type = isVarObject ? (varData as any).type : 'string';
        
        // Converter tipo
        try {
          switch (type) {
            case 'number':
              convertedParams[key] = value ? parseFloat(value) : 0;
              break;
            case 'boolean':
              convertedParams[key] = value === 'true' || value === '1' || value === true;
              break;
            case 'date':
              convertedParams[key] = value ? new Date(value).toISOString() : null;
              break;
            case 'array':
              convertedParams[key] = value ? JSON.parse(value) : [];
              break;
            case 'object':
              convertedParams[key] = value ? JSON.parse(value) : {};
              break;
            default: // string
              convertedParams[key] = String(value);
          }
        } catch (convError) {
          console.warn(`⚠️ Erro ao converter ${key}:`, convError);
          convertedParams[key] = value; // Mantém valor original
        }
      }
    }
    
    console.log("🔧 Parâmetros convertidos:", convertedParams);

    // 3. Buscar dados da API se configurada
    let apiData: any[] = [];
    if (relatorio.configuracoes?.api_url) {
      const apiUrl = relatorio.configuracoes.api_url;
      const httpMethod = ((relatorio.configuracoes.http_method || 'GET') as string).toUpperCase();
      const paramType = (relatorio.configuracoes.param_type || 'query') as string;
      
      console.log("🔗 Buscando dados da API:", apiUrl);
      console.log("📋 Método HTTP:", httpMethod, "| Tipo de parâmetro:", paramType);
      console.log("📦 Parâmetros convertidos que serão enviados:", JSON.stringify(convertedParams, null, 2));
      console.log("📝 Quantidade de parâmetros:", Object.keys(convertedParams).length);
      console.log("📋 Tipos dos parâmetros:", Object.entries(convertedParams).map(([k, v]) => `${k}: ${typeof v}`).join(", "));
      
      try {
        let requestUrl = apiUrl;
        const fetchHeaders: Record<string, string> = { 'Accept': 'application/json' };
        const fetchInit: RequestInit = { method: httpMethod, headers: fetchHeaders };
        
        if (httpMethod === 'GET' || paramType === 'query') {
          // Query string
          const queryParams = new URLSearchParams();
          Object.entries(convertedParams).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
              queryParams.append(key, String(value));
            }
          });
          if (queryParams.toString()) {
            requestUrl = `${apiUrl}?${queryParams.toString()}`;
          }
          console.log("🔗 URL final com query string:", requestUrl);
        } else if (paramType === 'json' && httpMethod !== 'GET') {
          // JSON body
          fetchHeaders['Content-Type'] = 'application/json';
          (fetchInit as any).body = JSON.stringify(convertedParams);
          console.log("📦 Enviando JSON body");
        } else if (paramType === 'formdata' && httpMethod !== 'GET') {
          // FormData
          const fd = new FormData();
          Object.entries(convertedParams).forEach(([k, v]) => v != null && fd.append(k, String(v)));
          (fetchInit as any).body = fd as any;
          console.log("📦 Enviando FormData");
        }
        
        const apiResponse = await fetch(requestUrl, fetchInit);
        
        console.log("📡 Status da resposta da API:", apiResponse.status, apiResponse.statusText);
        
        if (!apiResponse.ok) {
          const errorText = await apiResponse.text();
          console.error(`❌ API retornou status ${apiResponse.status}:`, errorText);
          throw new Error(`API error: ${apiResponse.status}`);
        }
        
        const contentType = apiResponse.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          const responseText = await apiResponse.text();
          console.error("❌ API não retornou JSON:", responseText.substring(0, 200));
          throw new Error('API não retornou JSON válido');
        }
        
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

    // 4. Preparar dados do relatório
    const layoutData = typeof relatorio.layout_json === 'string' 
      ? JSON.parse(relatorio.layout_json)
      : relatorio.layout_json;

    // Usar parâmetros convertidos (da API)
    const parameters: Record<string, any> = { ...convertedParams };
    
    // SEMPRE adicionar variáveis fixas do relatório quando houver
    if (reportVariables && typeof reportVariables === 'object' && Object.keys(reportVariables).length > 0) {
      console.log("📝 Processando variáveis fixas do relatório...");
      Object.entries(reportVariables).forEach(([key, value]) => {
        // Interpolar e adicionar ao parameters
        const finalValue = String(value || "");
        parameters[key] = finalValue;
        console.log(`   ✓ ${key} = "${finalValue}"`);
      });
      console.log("✅ Variáveis fixas adicionadas aos parâmetros:", Object.keys(reportVariables));
      console.log("✅ Total de parâmetros após variáveis fixas:", Object.keys(parameters));
    } else {
      console.log("ℹ️ Nenhuma variável fixa do relatório foi fornecida");
      console.log("   - reportVariables:", reportVariables);
      console.log("   - typeof:", typeof reportVariables);
      if (reportVariables && typeof reportVariables === 'object') {
        console.log("   - keys:", Object.keys(reportVariables));
      }
    }
    
    // Se tem dados da API, adicionar ao parâmetro api_data
    if (apiData.length > 0) {
      parameters.api_data = apiData;
      console.log("✅ Dados da API adicionados (api_data):", apiData.length, "registros");
    }

    console.log("📝 Parâmetros FINAIS para o ReportBro:", Object.keys(parameters));
    console.log("📋 Valores dos parâmetros:", JSON.stringify(parameters, null, 2));

    // 5. Gerar relatório usando ReportBro API (PUT para obter key)
    const reportBroApiUrl = 'https://www.reportbro.com/report/run';
    
    const reportPayload = {
      report: layoutData,
      outputFormat: outputFormat,
      data: parameters,
      isTestData: false,
    };

    console.log("🚀 Chamando API ReportBro (PUT)...");
    console.log("📋 Keys do payload:", Object.keys(reportPayload));
    console.log("📋 Keys do report:", Object.keys(layoutData || {}));
    console.log("📋 Output Format:", outputFormat);
    console.log("📋 Parâmetros sendo enviados:", JSON.stringify(parameters, null, 2));

    const initResponse = await fetch(reportBroApiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportPayload),
    });

    if (!initResponse.ok) {
      const errorText = await initResponse.text();
      console.error("❌ Erro ReportBro API (init):", errorText);
      throw new Error(`ReportBro API error: ${initResponse.status}`);
    }

    const initText = await initResponse.text();
    console.log("🔑 Resposta ReportBro:", initText);
    
    // Extrair key da resposta (formato: "key:XXXXX")
    const keyMatch = initText.match(/key:([a-f0-9-]+)/);
    if (!keyMatch) {
      throw new Error('Key não encontrada na resposta da API');
    }
    const reportKey = keyMatch[1];
    console.log("✅ Key obtida:", reportKey);

    // 6. Polling para buscar o arquivo gerado
    console.log(`⏳ Aguardando geração do ${outputFormat.toUpperCase()}...`);
    let fileBytes: Uint8Array | null = null;
    const maxAttempts = 60; // 2 minutos (60 x 2s)
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt % 5 === 0) {
        console.log(`🔄 Tentativa ${attempt}/${maxAttempts}...`);
      }
      
      const pollResponse = await fetch(`${reportBroApiUrl}?key=${reportKey}`);
      
      if (pollResponse.ok) {
        const contentType = pollResponse.headers.get('content-type');
        console.log(`📋 Content-Type recebido: ${contentType}`);
        
        // Verificar se é o formato esperado
        const isPdf = outputFormat === 'pdf' && contentType?.includes('application/pdf');
        const isExcel = outputFormat === 'xlsx' && (
          contentType?.includes('spreadsheet') || 
          contentType?.includes('vnd.openxmlformats') ||
          contentType?.includes('application/vnd.ms-excel')
        );
        
        if (isPdf || isExcel) {
          fileBytes = new Uint8Array(await pollResponse.arrayBuffer());
          console.log(`✅ ${outputFormat.toUpperCase()} gerado, tamanho:`, fileBytes.length);
          break;
        } else if (contentType?.includes('text/plain')) {
          // Pode estar ainda processando
          const statusText = await pollResponse.text();
          console.log(`⏳ Status: ${statusText}`);
        }
      }
      
      // Aguardar 2 segundos antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!fileBytes) {
      throw new Error(`Timeout: ${outputFormat.toUpperCase()} não foi gerado a tempo`);
    }

    // 7. Adicionar retângulo branco no rodapé (cobrir marca d'água) - apenas para PDF
    if (outputFormat === 'pdf') {
      try {
        const pdfDoc = await PDFDocument.load(fileBytes);
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
        fileBytes = new Uint8Array(savedBytes);
        console.log("✅ Marca d'água removida");
      } catch (modError) {
        console.error("⚠️ Erro ao modificar PDF:", modError);
        // Continua com o PDF original
      }
    }

    // 8. Salvar arquivo no storage
    const fileExtension = outputFormat === 'xlsx' ? 'xlsx' : 'pdf';
    const contentType = outputFormat === 'xlsx' 
      ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : 'application/pdf';
    const fileName = `relatorio_${relatorioId}_${Date.now()}.${fileExtension}`;
    const filePath = `relatorios/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('bot-media')
      .upload(filePath, fileBytes, {
        contentType: contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("❌ Erro ao fazer upload:", uploadError);
      throw new Error(`Erro ao salvar ${outputFormat.toUpperCase()}: ${uploadError.message}`);
    }

    // 9. Obter URL pública
    const { data: urlData } = supabase.storage
      .from('bot-media')
      .getPublicUrl(filePath);

    const fileUrl = urlData.publicUrl;
    console.log(`✅ ${outputFormat.toUpperCase()} salvo em:`, fileUrl);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: fileUrl, // Mantém nome pdfUrl por compatibilidade
        fileUrl: fileUrl,
        fileName: relatorio.nome,
        fileType: outputFormat,
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
