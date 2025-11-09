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
    const maxRecords = Math.max(1, Math.min(10000, body.maxRecords ?? 5000));

    // Create job record
    const { data: job, error: jobError } = await supabase
      .from('report_preview_jobs')
      .insert({
        report_id: body.reportId,
        requested_by: userId,
        status: 'pending'
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

    // Start background processing without blocking
    processPreview(job.id, body.reportId, maxRecords, supabase).catch(err => {
      console.error('Background processing error:', err);
    });

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

async function processPreview(jobId: string, reportId: string, maxRecords: number, supabase: any) {
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
    const apiUrl = data.configuracoes?.api_url;

    if (!apiUrl) {
      throw new Error('API não configurada');
    }

    // Fetch API data
    console.log('Fetching data from API:', apiUrl);
    const apiResp = await fetch(apiUrl);
    if (!apiResp.ok) {
      throw new Error('Falha ao buscar dados da API');
    }
    const raw = await apiResp.json();

    let rows: any[] = [];
    if (Array.isArray(raw)) rows = raw;
    else if (raw && typeof raw === 'object' && 'data' in raw) rows = Array.isArray(raw.data) ? raw.data : [raw.data];
    else if (raw != null) rows = [raw];

    const totalCount = rows.length;
    let truncated = false;
    if (rows.length > maxRecords) {
      truncated = true;
      rows = rows.slice(0, maxRecords);
    }

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
        truncated,
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
