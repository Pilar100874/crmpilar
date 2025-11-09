import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PreviewRequest = {
  reportId: string;
  maxRecords?: number;
  page?: number;
  pageSize?: number;
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
          processPreview(job.id, body.reportId, pageSize, page, supabase).catch((err: any) => {
            console.error('Background processing error:', err);
          })
        );
      } else {
        processPreview(job.id, body.reportId, pageSize, page, supabase).catch((err: any) => {
          console.error('Background processing error:', err);
        });
      }
    } catch (e) {
      processPreview(job.id, body.reportId, pageSize, page, supabase).catch((err: any) => {
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

async function processPreview(jobId: string, reportId: string, pageSize: number, page: number, supabase: any) {
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

    // Build paginated URL if possible (supports page/size or offset/limit)
    const pagination = cfg.pagination || {};
    const type = (pagination.type || 'page') as 'page' | 'offset';
    const pageParam = pagination.pageParam || 'page';
    const sizeParam = pagination.sizeParam || 'pageSize';
    const offsetParam = pagination.offsetParam || 'offset';
    const limitParam = pagination.limitParam || 'limit';
    const zeroBased = Boolean(pagination.zeroBased);

    let finalUrl = apiUrl as string;
    try {
      const u = new URL(apiUrl);
      if (type === 'offset') {
        u.searchParams.set(offsetParam, String((page - 1) * pageSize));
        u.searchParams.set(limitParam, String(pageSize));
      } else {
        u.searchParams.set(pageParam, String(zeroBased ? page - 1 : page));
        u.searchParams.set(sizeParam, String(pageSize));
      }
      finalUrl = u.toString();
    } catch {
      const sep = apiUrl.includes('?') ? '&' : '?';
      if (type === 'offset') {
        finalUrl = `${apiUrl}${sep}${offsetParam}=${(page - 1) * pageSize}&${limitParam}=${pageSize}`;
      } else {
        finalUrl = `${apiUrl}${sep}${pageParam}=${zeroBased ? page - 1 : page}&${sizeParam}=${pageSize}`;
      }
    }

    // Fetch API data with pagination (server-side when supported)
    console.log('Fetching data from API:', finalUrl);
    const apiResp = await fetch(finalUrl);
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
        testData: '[]'
      };
      report.parameters.push(apiParam);
    }

    apiParam.testData = JSON.stringify(rows);

    // Call ReportBro runner
    console.log('Calling ReportBro runner...');
    const runnerResp = await fetch('https://www.reportbro.com/report/run', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ report, outputFormat: 'pdf', isTestData: true })
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

    // Update job as ready
    await supabase
      .from('report_preview_jobs')
      .update({
        status: 'ready',
        pdf_url: pdfUrl,
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
