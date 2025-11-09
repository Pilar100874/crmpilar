import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PreviewRequest = {
  reportId: string;
  userId?: string;
  limit?: number;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: PreviewRequest = await req.json();
    const { reportId, userId, limit = 5000 } = body;

    if (!reportId) {
      return new Response(
        JSON.stringify({ success: false, error: 'reportId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Creating async preview job for report:', reportId);

    // Create job record
    const { data: job, error: jobErr } = await supabase
      .from('report_preview_jobs')
      .insert({ report_id: reportId, requested_by: userId || null, status: 'pending' })
      .select()
      .single();

    if (jobErr || !job) {
      console.error('Failed to create job:', jobErr);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao criar job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Background processing - return immediately
    processReportJob(supabase, job.id, reportId, limit).catch((err) => {
      console.error('Background job error:', err);
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

async function processReportJob(supabase: any, jobId: string, reportId: string, limit: number) {
  try {
    // Load report
    const { data: report, error: repErr } = await supabase
      .from('relatorios')
      .select('layout_json, configuracoes')
      .eq('id', reportId)
      .single();

    if (repErr || !report) {
      throw new Error('Relatório não encontrado');
    }

    const reportLayout = report.layout_json;
    const apiUrl = report.configuracoes?.api_url;
    if (!apiUrl) {
      throw new Error('API não configurada');
    }

    // Fetch API data
    const apiResp = await fetch(apiUrl);
    if (!apiResp.ok) throw new Error('Falha ao buscar API');
    const raw = await apiResp.json();

    let rows: any[] = [];
    if (Array.isArray(raw)) rows = raw;
    else if (raw?.data && Array.isArray(raw.data)) rows = raw.data;
    else if (raw?.data) rows = [raw.data];
    else if (raw) rows = [raw];

    const total = rows.length;
    const maxRecords = Math.max(1, Math.min(10000, limit));
    const truncated = rows.length > maxRecords;
    if (truncated) rows = rows.slice(0, maxRecords);

    // Build report
    const rpt = JSON.parse(JSON.stringify(reportLayout || {}));
    rpt.parameters = Array.isArray(rpt.parameters) ? rpt.parameters : [];

    const first = rows[0] || {};
    const fields = Object.keys(first);
    let apiParam = rpt.parameters.find((p: any) => p?.name === 'api_data');
    if (!apiParam) {
      apiParam = {
        id: Date.now(),
        name: 'api_data',
        type: 'array',
        arrayItemType: 'map',
        eval: false,
        nullable: false,
        children: fields.map((f, i) => ({
          id: Date.now() + i + 1,
          name: f,
          type: typeof first[f] === 'number' ? 'number' : typeof first[f] === 'boolean' ? 'boolean' : 'string',
          nullable: true
        })),
        testData: '[]'
      };
      rpt.parameters.push(apiParam);
    }
    apiParam.testData = JSON.stringify(rows);

    // Call ReportBro runner
    const runnerResp = await fetch('https://www.reportbro.com/report/run', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ report: rpt, outputFormat: 'pdf', isTestData: true })
    });

    if (!runnerResp.ok) {
      const txt = await runnerResp.text();
      throw new Error(`Runner failed: ${runnerResp.status} ${txt}`);
    }

    const result = await runnerResp.json();
    if (!result?.key) throw new Error('No key returned');

    const pdfUrl = `https://www.reportbro.com/report/${result.key}`;

    // Update job
    await supabase
      .from('report_preview_jobs')
      .update({
        status: 'ready',
        pdf_url: pdfUrl,
        truncated,
        included: rows.length,
        total
      })
      .eq('id', jobId);

    console.log('Job completed:', jobId, pdfUrl);
  } catch (error: any) {
    console.error('Job processing error:', error);
    await supabase
      .from('report_preview_jobs')
      .update({ status: 'error', error: error?.message || 'Unknown error' })
      .eq('id', jobId);
  }
}
