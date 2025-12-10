import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";
import * as XLSX from "https://esm.sh/xlsx@0.18.5?target=deno";

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
    // Usar apiVariables do body OU api_variables da configuração do relatório
    const varsToUse = apiVariables && typeof apiVariables === 'object' && Object.keys(apiVariables).length > 0
      ? apiVariables
      : (relatorio.configuracoes?.api_variables || {});
    
    console.log("📦 Variáveis a usar:", JSON.stringify(varsToUse, null, 2));
    
    const convertedParams: Record<string, any> = {};
    if (varsToUse && typeof varsToUse === 'object') {
      for (const [key, varData] of Object.entries(varsToUse)) {
        const isVarObject = typeof varData === 'object' && varData !== null && 'value' in varData && 'type' in varData;
        const value = isVarObject ? (varData as any).value : String(varData);
        const type = isVarObject ? (varData as any).type : 'string';
        
        // Converter tipo
        try {
          switch (type) {
            case 'number':
              convertedParams[key] = value !== undefined && value !== null && value !== '' ? parseFloat(String(value)) : 0;
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
              convertedParams[key] = String(value ?? '');
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
            // Sempre adicionar o parâmetro, mesmo que seja 0, false, etc
            queryParams.append(key, String(value));
          });
          const queryString = queryParams.toString();
          if (queryString) {
            const separator = apiUrl.includes('?') ? '&' : '?';
            requestUrl = `${apiUrl}${separator}${queryString}`;
          }
          console.log("🔗 URL final com query string:", requestUrl);
          console.log("🔗 Query string construída:", queryString);
          console.log("🔗 Parâmetros individuais:", Array.from(queryParams.entries()));
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
        
        // Converter campos JSON/object para string (ReportBro requer tipos primitivos)
        apiData = apiData.map(record => {
          const cleanRecord: Record<string, any> = {};
          Object.entries(record).forEach(([key, value]) => {
            if (value === null || value === undefined) {
              cleanRecord[key] = value;
            } else if (typeof value === 'object') {
              // Converter objetos/arrays para string JSON
              cleanRecord[key] = JSON.stringify(value);
            } else {
              cleanRecord[key] = value;
            }
          });
          return cleanRecord;
        });
        console.log(`✅ Campos JSON convertidos para string`);
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
      if (outputFormat === 'pdf') {
        const cfgMax = Number(relatorio.configuracoes?.max_pdf_rows);
        const maxPdfRows = Number.isFinite(cfgMax) && cfgMax > 0 ? cfgMax : 500;
        if (apiData.length > maxPdfRows) {
          console.warn(`⚠️ api_data possui ${apiData.length} registros, limitando a ${maxPdfRows} para PDF a fim de evitar loop/erro 400`);
          (parameters as any).__meta = { truncated: true, total: apiData.length, shown: maxPdfRows };
          parameters.api_data = apiData.slice(0, maxPdfRows);
        } else {
          parameters.api_data = apiData;
        }
      } else {
        parameters.api_data = apiData;
      }
      const addedCount = Array.isArray(parameters.api_data) ? parameters.api_data.length : 0;
      const truncInfo = (parameters as any).__meta?.truncated ? ` (truncados de ${apiData.length})` : '';
      console.log("✅ Dados da API adicionados (api_data):", addedCount, "registros", truncInfo);
    }

    console.log("📝 Parâmetros FINAIS para o ReportBro:", Object.keys(parameters));
    console.log("📋 Valores dos parâmetros:", JSON.stringify(parameters, null, 2));

    // Fast-path: gerar XLSX localmente (evita timeout quando serviço retorna PDF)
    if (outputFormat === 'xlsx') {
      try {
        console.log('⚡ Gerando XLSX localmente (fast-path)...');
        
        // Limite de segurança para evitar memory overflow
        const MAX_ROWS = 20000;
        const dataRows = Array.isArray(apiData) && apiData.length ? apiData : [];
        const limitedData = dataRows.length > MAX_ROWS ? dataRows.slice(0, MAX_ROWS) : dataRows;
        
        if (dataRows.length > MAX_ROWS) {
          console.warn(`⚠️ Dados limitados a ${MAX_ROWS} registros (original: ${dataRows.length})`);
        }
        
        console.log(`📊 Gerando XLSX com ${limitedData.length} registros...`);
        
        const wb = XLSX.utils.book_new();
        
        if (limitedData.length > 0) {
          const ws = XLSX.utils.json_to_sheet(limitedData);
          XLSX.utils.book_append_sheet(wb, ws, 'Dados');
        } else {
          const ws = XLSX.utils.aoa_to_sheet([["Info"], ["Sem dados da API (api_data)"]]);
          XLSX.utils.book_append_sheet(wb, ws, 'Dados');
        }
        
        const varEntries = Object.entries(parameters)
          .filter(([k]) => k !== 'api_data')
          .map(([k, v]) => ({ Variavel: k, Valor: typeof v === 'object' ? JSON.stringify(v) : (v as any) }));
        if (varEntries.length > 0) {
          const wv = XLSX.utils.json_to_sheet(varEntries);
          XLSX.utils.book_append_sheet(wb, wv, 'Variaveis');
        }
        
        console.log('📝 Convertendo para array buffer...');
        const arrayBuf = XLSX.write(wb, { 
          bookType: 'xlsx', 
          type: 'array',
          compression: true
        });
        const bytes = new Uint8Array(arrayBuf as ArrayBuffer);
        console.log(`💾 XLSX gerado: ${(bytes.length / 1024 / 1024).toFixed(2)} MB`);

        const fileExtension = 'xlsx';
        const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        const sanitizedName = relatorio.nome.replace(/[^a-zA-Z0-9_\-]/g, '_');
        const storageFileName = `${sanitizedName}_${Date.now()}.${fileExtension}`;
        const filePath = `relatorios/${storageFileName}`;

        console.log('☁️ Fazendo upload para storage...');
        const { error: uploadError } = await supabase.storage
          .from('bot-media')
          .upload(filePath, bytes, { 
            contentType, 
            upsert: false,
            cacheControl: '3600'
          });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('bot-media')
          .getPublicUrl(filePath);
        const fileUrl = urlData.publicUrl;
        console.log(`✅ XLSX (fast-path) salvo em:`, fileUrl);

        const baseName = String(relatorio.nome || 'Relatorio').replace(/\.[a-zA-Z0-9]+$/, '');
        const displayFileName = `${baseName}.xlsx`;
        return new Response(
          JSON.stringify({ 
            success: true, 
            pdfUrl: fileUrl, 
            fileUrl, 
            fileName: displayFileName, 
            fileType: 'xlsx',
            totalRows: limitedData.length,
            wasLimited: dataRows.length > MAX_ROWS
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      } catch (fastErr) {
        console.error('❌ Erro no fast-path XLSX:', fastErr);
        console.error('Stack:', (fastErr as Error).stack);
        
        // Se for erro de memória, retornar erro específico
        if ((fastErr as Error).message?.includes('memory') || (fastErr as Error).name === 'MemoryError') {
          return new Response(
            JSON.stringify({ 
              error: 'Muitos dados para gerar XLSX. Por favor, use filtros ou gere um PDF.',
              code: 'MEMORY_LIMIT_EXCEEDED'
            }),
            { 
              status: 413,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }
        
        // Para outros erros, tentar via ReportBro como fallback
        console.log('⚠️ Tentando gerar via ReportBro como fallback...');
      }
    }

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
    console.log("📋 Layout completo:", JSON.stringify(layoutData, null, 2));

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
      console.error("❌ Status:", initResponse.status);
      console.error("❌ Payload enviado:", JSON.stringify(reportPayload, null, 2));
      throw new Error(`ReportBro API error: ${initResponse.status} - ${errorText}`);
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
    const maxAttempts = 240; // ~12 minutos (240 x 3s) - aumentado para iPhone com relatórios grandes
    let sawPdfInsteadOfXlsx = false;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt % 5 === 0) {
        console.log(`🔄 Tentativa ${attempt}/${maxAttempts}...`);
      }
      
      const pollResponse = await fetch(`${reportBroApiUrl}?key=${reportKey}`);
      
      if (pollResponse.ok) {
        const contentType = pollResponse.headers.get('content-type');
        console.log(`📋 Content-Type recebido (tentativa ${attempt}): ${contentType}`);
        
        // Para PDF
        if (outputFormat === 'pdf' && contentType?.includes('application/pdf')) {
          fileBytes = new Uint8Array(await pollResponse.arrayBuffer());
          console.log(`✅ PDF gerado, tamanho:`, fileBytes.length);
          break;
        }
        
        // XLSX esperado, mas serviço respondeu PDF → ativar fallback local
        if (outputFormat === 'xlsx' && contentType?.includes('application/pdf')) {
          console.warn('⚠️ Serviço retornou PDF ao solicitar XLSX. Ativando fallback local para XLSX.');
          sawPdfInsteadOfXlsx = true;
          break;
        }
        
        // Para XLSX - aceitar múltiplos content-types possíveis
        if (outputFormat === 'xlsx') {
          if (contentType?.includes('spreadsheet') || 
              contentType?.includes('vnd.openxmlformats') ||
              contentType?.includes('vnd.ms-excel') ||
              contentType?.includes('application/octet-stream')) {
            fileBytes = new Uint8Array(await pollResponse.arrayBuffer());
            console.log(`✅ XLSX gerado, tamanho:`, fileBytes.length);
            break;
          }
        }
        
        // Se recebeu texto, pode estar ainda processando
        if (contentType?.includes('text/plain')) {
          const statusText = await pollResponse.text();
          console.log(`⏳ Status (tentativa ${attempt}): ${statusText}`);
        }
      } else {
        console.log(`⚠️ Response não OK (tentativa ${attempt}): ${pollResponse.status} ${pollResponse.statusText}`);
      }
      
      // Aguardar 3 segundos antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    if (!fileBytes) {
      if (outputFormat === 'xlsx' && sawPdfInsteadOfXlsx) {
        try {
          console.log('🛠️ Gerando XLSX via fallback local a partir dos dados carregados...');
          // Gerar XLSX simples com api_data e variáveis do relatório
          const wb = XLSX.utils.book_new();
          const dataRows = Array.isArray(apiData) && apiData.length ? apiData : [];
          if (dataRows.length > 0) {
            const ws = XLSX.utils.json_to_sheet(dataRows);
            XLSX.utils.book_append_sheet(wb, ws, 'Dados');
          } else {
            const ws = XLSX.utils.aoa_to_sheet([["Info"], ["Sem dados da API (api_data)"]]);
            XLSX.utils.book_append_sheet(wb, ws, 'Dados');
          }
          const varEntries = Object.entries(parameters)
            .filter(([k]) => k !== 'api_data')
            .map(([k, v]) => ({ Variavel: k, Valor: typeof v === 'object' ? JSON.stringify(v) : v as any }));
          if (varEntries.length > 0) {
            const wv = XLSX.utils.json_to_sheet(varEntries);
            XLSX.utils.book_append_sheet(wb, wv, 'Variaveis');
          }
          const arrayBuf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
          fileBytes = new Uint8Array(arrayBuf as ArrayBuffer);
          console.log('✅ XLSX gerado por fallback local, tamanho:', fileBytes.length);
        } catch (fbErr) {
          console.error('❌ Falha no fallback local para XLSX:', fbErr);
          throw new Error('Falha ao gerar XLSX (fallback).');
        }
      } else {
        console.error(`❌ Timeout após ${maxAttempts} tentativas. Formato solicitado: ${outputFormat}`);
        throw new Error(`Timeout: ${outputFormat.toUpperCase()} não foi gerado a tempo`);
      }
    }

    // 7. Adicionar retângulo branco no rodapé (cobrir marca d'água) - apenas para PDF
    if (outputFormat === 'pdf') {
      try {
        const pdfDoc = await PDFDocument.load(fileBytes);
        const pages = pdfDoc.getPages();
        const { rgb } = await import('https://esm.sh/pdf-lib@1.17.1');

        for (const page of pages) {
          const { width } = page.getSize();
          
          // Retângulo branco no rodapé (altura 80)
          page.drawRectangle({
            x: 0,
            y: 0,
            width: width,
            height: 80,
            color: rgb(1, 1, 1),
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
    const sanitizedName = relatorio.nome.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const storageFileName = `${sanitizedName}_${Date.now()}.${fileExtension}`;
    const filePath = `relatorios/${storageFileName}`;

    // Verificar tamanho do arquivo
    const fileSizeMB = fileBytes.length / (1024 * 1024);
    console.log(`📊 Tamanho do arquivo: ${fileSizeMB.toFixed(2)} MB`);
    
    if (fileSizeMB > 25) {
      console.warn(`⚠️ AVISO: Arquivo grande (${fileSizeMB.toFixed(2)} MB). Pode ter problemas no envio via WhatsApp em dispositivos móveis como iPhone.`);
    }
    
    console.log(`📤 Fazendo upload do arquivo ${fileExtension.toUpperCase()} (${fileSizeMB.toFixed(2)} MB)...`);

    const { error: uploadError } = await supabase.storage
      .from('bot-media')
      .upload(filePath, fileBytes, {
        contentType: contentType,
        upsert: false,
        cacheControl: '3600'
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
    console.log(`📊 Tamanho final: ${fileSizeMB.toFixed(2)} MB`);

    return new Response(
      JSON.stringify({
        success: true,
        pdfUrl: fileUrl, // Mantém nome pdfUrl por compatibilidade
        fileUrl: fileUrl,
        fileName: `${String(relatorio.nome || 'Relatorio').replace(/\.[a-zA-Z0-9]+$/, '')}.${fileExtension}`,
        fileType: outputFormat,
        fileSizeMB: parseFloat(fileSizeMB.toFixed(2)),
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
