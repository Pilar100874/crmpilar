import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, rgb } from 'https://esm.sh/pdf-lib@1.17.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PreviewRequest = {
  reportId: string;
  maxRecords?: number;
  page?: number;
  pageSize?: number;
  testVariables?: Record<string, any>;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    const body: PreviewRequest = await req.json();
    const pageSize = Math.max(100, Math.min(1000, body.pageSize ?? 500));
    const page = Math.max(1, body.page ?? 1);

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('report_preview_jobs')
      .insert({
        report_id: body.reportId,
        requested_by: userId,
        status: 'pending',
        total: 0,
        included: 0
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create job:', jobError);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao criar job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Start background processing without blocking (ensure it survives after response)
    try {
      // @ts-ignore - EdgeRuntime is available in this environment at runtime
      const ER: any = (globalThis as any).EdgeRuntime;
      if (ER?.waitUntil) {
        ER.waitUntil(
          processPreview(job.id, body.reportId, pageSize, page, body.testVariables || {}, supabase).catch((err: any) => {
            console.error('Background processing error:', err);
          })
        );
      } else {
        processPreview(job.id, body.reportId, pageSize, page, body.testVariables || {}, supabase).catch((err: any) => {
          console.error('Background processing error:', err);
        });
      }
    } catch (e) {
      processPreview(job.id, body.reportId, pageSize, page, body.testVariables || {}, supabase).catch((err: any) => {
        console.error('Background processing error:', err);
      });
    }

    return new Response(
      JSON.stringify({ success: true, jobId: job.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in reportbro-preview function:', error);
    return new Response(
      JSON.stringify({ success: false, error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processPreview(jobId: string, reportId: string, pageSize: number, page: number, testVariables: Record<string, any>, supabase: any) {
  try {
    console.log('Processing preview for job:', jobId);

    const { data, error } = await supabase
      .from('relatorios')
      .select('layout_json, configuracoes')
      .eq('id', reportId)
      .maybeSingle();

    if (error || !data) {
      throw new Error('Relatório não encontrado');
    }

    const reportLayout = data.layout_json;
    const cfg = data.configuracoes || {};
    const apiUrl = cfg.api_url;

    if (!apiUrl) {
      throw new Error('API não configurada');
    }

    // Prepara variáveis combinando fixas + teste
    const allVariables: Record<string, any> = {};
    
    // 1. Adiciona variáveis com valor fixo da configuração
    if (cfg.api_variables && typeof cfg.api_variables === 'object') {
      Object.entries(cfg.api_variables).forEach(([name, varData]: [string, any]) => {
        const value = varData?.value;
        const type = varData?.type || 'string';
        
        if (value !== undefined && value !== null && !(typeof value === 'string' && value.trim() === '')) {
          // Converte valor fixo
          try {
            switch (type) {
              case 'number':
                allVariables[name] = parseFloat(value);
                break;
              case 'boolean':
                allVariables[name] = (typeof value === 'boolean' ? value : typeof value === 'number' ? value !== 0 : typeof value === 'string' ? ['true','1','on','yes'].includes(value.trim().toLowerCase()) : false);
                break;
              case 'date':
                allVariables[name] = new Date(value).toISOString();
                break;
              case 'array':
                allVariables[name] = JSON.parse(value);
                break;
              case 'object':
                allVariables[name] = JSON.parse(value);
                break;
              default:
                allVariables[name] = value;
            }
          } catch (e) {
            allVariables[name] = value;
          }
        }
      });
    }
    
    // 2. Sobrescreve/adiciona variáveis de teste (variáveis sem valor fixo)
    if (testVariables && Object.keys(testVariables).length > 0) {
      Object.assign(allVariables, testVariables);
    }
    
    // Respeita http_method e param_type salvos no relatório
    const method = ((cfg.http_method || 'GET') as string).toUpperCase();
    const paramType = (cfg.param_type || 'query') as 'query' | 'json' | 'formdata' | 'header';

    let apiResp: Response;

    // Monta opções da requisição
    const fetchHeaders: Record<string, string> = { 'Accept': 'application/json' };
    const fetchInit: RequestInit = { method, headers: fetchHeaders };
    let requestUrl = apiUrl as string;

    // Cria mapa de tipos a partir da config
    const typeMap: Record<string, string> = {};
    try {
      const vcfg = cfg.api_variables || {};
      Object.entries(vcfg).forEach(([name, varData]: [string, any]) => {
        if (name) typeMap[name] = (varData?.type || 'string') as string;
      });
    } catch {}

    if (paramType === 'header') {
      // Envia TUDO em um único header "keys" no formato: variavel,valor,tipo;variavel2,valor2,tipo2
      const headerValue = Object.entries(allVariables)
        .map(([name, value]) => {
          let t = typeMap[name];
          if (!t) {
            // Inferir tipo quando não informado
            if (typeof value === 'number') t = 'number';
            else if (typeof value === 'boolean') t = 'boolean';
            else if (value && typeof value === 'string' && /\d{4}-\d{2}-\d{2}T/.test(value)) t = 'date';
            else t = 'string';
          }
          return `${name},${value ?? ''},${t}`;
        })
        .join(';');

      if (headerValue) fetchHeaders['keys'] = headerValue;
      console.log('Fetching data from API with custom header keys:', headerValue);
    } else if (paramType === 'json' && method !== 'GET') {
      fetchHeaders['Content-Type'] = 'application/json';
      (fetchInit as any).body = JSON.stringify(allVariables);
      console.log('Fetching data from API with JSON body');
    } else if (paramType === 'formdata' && method !== 'GET') {
      const fd = new FormData();
      Object.entries(allVariables).forEach(([k, v]) => v != null && fd.append(k, String(v)));
      (fetchInit as any).body = fd as any;
      console.log('Fetching data from API with FormData body');
    } else {
      // query string (padrão)
      const queryParams = new URLSearchParams();
      Object.entries(allVariables).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      if (queryParams.toString()) requestUrl = `${apiUrl}?${queryParams.toString()}`;
      console.log('Fetching data from API with query string:', requestUrl);
    }

    // Se não há variáveis e existir paginação, mantém a lógica original de paginação
    if (Object.keys(allVariables).length === 0 && paramType !== 'header' && paramType !== 'json' && paramType !== 'formdata') {
      const pagination = cfg.pagination || {};
      const type = (pagination.type || 'page') as 'page' | 'offset';
      const pageParam = pagination.pageParam || 'page';
      const sizeParam = pagination.sizeParam || 'pageSize';
      const offsetParam = pagination.offsetParam || 'offset';
      const limitParam = pagination.limitParam || 'limit';
      const zeroBased = Boolean(pagination.zeroBased);

      try {
        const u = new URL(requestUrl);
        if (type === 'offset') {
          u.searchParams.set(offsetParam, String((page - 1) * pageSize));
          u.searchParams.set(limitParam, String(pageSize));
        } else {
          u.searchParams.set(pageParam, String(zeroBased ? page - 1 : page));
          u.searchParams.set(sizeParam, String(pageSize));
        }
        requestUrl = u.toString();
      } catch {
        const sep = requestUrl.includes('?') ? '&' : '?';
        if (type === 'offset') {
          requestUrl = `${requestUrl}${sep}${offsetParam}=${(page - 1) * pageSize}&${limitParam}=${pageSize}`;
        } else {
          requestUrl = `${requestUrl}${sep}${pageParam}=${zeroBased ? page - 1 : page}&${sizeParam}=${pageSize}`;
        }
      }
      console.log('Fetching data from API with pagination:', requestUrl);
    }

    apiResp = await fetch(requestUrl, fetchInit);
    if (!apiResp.ok) {
      throw new Error(`Falha ao buscar dados da API (${apiResp.status})`);
    }
    const raw = await apiResp.json();

    // Normalize rows and total
    let rows: any[] = [];
    if (Array.isArray(raw)) rows = raw;
    else if (raw && typeof raw === 'object') {
      if (Array.isArray((raw as any).data)) rows = (raw as any).data;
      else if (Array.isArray((raw as any).items)) rows = (raw as any).items;
      else if (Array.isArray((raw as any).results)) rows = (raw as any).results;
      else if ((raw as any).data && typeof (raw as any).data === 'object' && Array.isArray((raw as any).data.items)) rows = (raw as any).data.items;
      else rows = [raw];
    }

    let totalCount = Number((raw as any)?.total ?? (raw as any)?.count ?? (raw as any)?.meta?.total ?? (raw as any)?.pagination?.total ?? (raw as any)?.data?.total ?? 0);
    if (!Number.isFinite(totalCount) || totalCount <= 0) {
      // Fallback: infer total when API does not provide it
      totalCount = rows.length === pageSize ? page * pageSize + 1 : (page - 1) * pageSize + rows.length;
    }

    const hasMore = totalCount > page * pageSize || rows.length === pageSize;

    // Build report with data
    const report = JSON.parse(JSON.stringify(reportLayout || {}));
    report.parameters = Array.isArray(report.parameters) ? report.parameters : [];

    const first = rows[0] || {};
    const fields = Object.keys(first);
    let apiParam = report.parameters.find((p: any) => p?.name === 'api_data');
    if (!apiParam) {
      apiParam = {
        id: Date.now(),
        name: 'api_data',
        type: 'array',
        arrayItemType: 'map',
        eval: false,
        nullable: false,
        children: fields.map((f, i) => ({ id: Date.now() + i + 1, name: f, type: typeof first[f] === 'number' ? 'number' : typeof first[f] === 'boolean' ? 'boolean' : 'string', nullable: true })),
      };
      report.parameters.push(apiParam);
    }

    // Remove possíveis dados de teste para evitar marcas d'água de teste
    if (typeof apiParam === 'object' && 'testData' in apiParam) {
      try { delete (apiParam as any).testData; } catch {}
    }

    // Sanitiza o layout removendo elementos de branding/logos
    const stripBranding = (node: any): any => {
      const isString = (v: any) => typeof v === 'string';
      const hasBrandWord = (s: string) => /reportbro|logo|branding|powered/i.test(s);

      // Remove propriedades de watermark/branding
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        for (const key of Object.keys(node)) {
          if (/watermark|branding|logo|powered/i.test(key)) {
            delete node[key as keyof typeof node];
            continue;
          }
          const val: any = (node as any)[key];
          if (isString(val) && hasBrandWord(val)) {
            // Zera textos/imagens com palavras de marca
            (node as any)[key] = '';
          } else {
            (node as any)[key] = stripBranding(val);
          }
        }
        // Se possuir lista de elementos, filtra itens de imagem/texto que tenham indícios de marca
        const listKeys = ['elements', 'children', 'items', 'content'];
        for (const lk of listKeys) {
          const arr = (node as any)[lk];
          if (Array.isArray(arr)) {
            (node as any)[lk] = arr
              .filter((el: any) => {
                if (!el || typeof el !== 'object') return true;
                const t = (el.type || el.kind || '').toString().toLowerCase();
                const txt = (el.text || el.label || '') as string;
                const img = (el.image || el.src || el.imageUrl || '') as string;
                if (t.includes('image') && hasBrandWord(img)) return false;
                if (isString(txt) && hasBrandWord(txt)) return false;
                if (isString(el.name) && hasBrandWord(el.name)) return false;
                return true;
              })
              .map(stripBranding);
          }
        }
        return node;
      }
      if (Array.isArray(node)) return node.map(stripBranding);
      return node;
    };

    stripBranding(report);

    // Chamada ao runner sem "isTestData" para evitar marca d'água
    console.log('Calling ReportBro runner...');
    const runnerResp = await fetch('https://www.reportbro.com/report/run', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ report, outputFormat: 'pdf', isTestData: false, parameterValues: { api_data: rows } })
    });

    if (!runnerResp.ok) {
      const t = await runnerResp.text();
      console.error('Runner error:', runnerResp.status, t);
      throw new Error('Falha ao gerar PDF');
    }

    const result = await runnerResp.json();
    if (!result?.key) {
      throw new Error('Resposta inválida do gerador');
    }

    const pdfUrl = `https://www.reportbro.com/report/${result.key}`;
    console.log('PDF ready:', pdfUrl);

    // Download PDF to cover watermark
    console.log('Downloading PDF to remove watermark...');
    const pdfResponse = await fetch(pdfUrl);
    if (!pdfResponse.ok) {
      throw new Error('Failed to download PDF');
    }
    const pdfBytes = await pdfResponse.arrayBuffer();

    // Load PDF and add white rectangles over watermark areas
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    
    // Add white rectangles over typical watermark positions
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Cover bottom-left corner (typical watermark position)
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 200,
        height: 50,
        color: rgb(1, 1, 1),
      });
      
      // Cover bottom-right corner
      page.drawRectangle({
        x: width - 200,
        y: 0,
        width: 200,
        height: 50,
        color: rgb(1, 1, 1),
      });
      
      // Cover center watermark if exists
      page.drawRectangle({
        x: width / 2 - 100,
        y: height / 2 - 25,
        width: 200,
        height: 50,
        color: rgb(1, 1, 1),
        opacity: 0.9,
      });
      
      // Add white rectangle at footer with image area (450x70)
      const footerHeight = 80;
      const imageWidth = 450;
      const imageHeight = 70;
      
      // Full width white footer background
      page.drawRectangle({
        x: 0,
        y: 0,
        width: width,
        height: footerHeight,
        color: rgb(1, 1, 1),
      });
      
      // White rectangle for image area (centered)
      page.drawRectangle({
        x: (width - imageWidth) / 2,
        y: (footerHeight - imageHeight) / 2,
        width: imageWidth,
        height: imageHeight,
        color: rgb(1, 1, 1),
      });
    }

    const cleanedPdfBytes = await pdfDoc.save();

    // Upload cleaned PDF to Supabase Storage
    const fileName = `report-${jobId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('bot-media')
      .upload(fileName, cleanedPdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Failed to upload cleaned PDF:', uploadError);
      throw new Error('Failed to upload cleaned PDF');
    }

    const { data: { publicUrl } } = supabase
      .storage
      .from('bot-media')
      .getPublicUrl(fileName);

    console.log('Cleaned PDF uploaded:', publicUrl);

    // Update job as ready with cleaned PDF URL
    await supabase
      .from('report_preview_jobs')
      .update({
        status: 'ready',
        pdf_url: publicUrl,
        truncated: hasMore,
        included: rows.length,
        total: totalCount
      })
      .eq('id', jobId);

    console.log('Job completed:', jobId);
  } catch (error: any) {
    console.error('Error processing preview:', error);
    await supabase
      .from('report_preview_jobs')
      .update({
        status: 'error',
        error: error?.message || 'Erro desconhecido'
      })
      .eq('id', jobId);
  }
}
