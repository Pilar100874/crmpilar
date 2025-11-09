import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PreviewRequest = {
  reportId?: string;
  apiUrl?: string;
  report?: any;
  limit?: number; // max records to include in preview
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
    const maxRecords = Math.max(1, Math.min(10000, body.limit ?? 5000));

    let reportLayout: any | null = null;
    let apiUrl: string | null = null;

    if (body.reportId) {
      console.log('Loading report from DB:', body.reportId);
      const { data, error } = await supabase
        .from('relatorios')
        .select('layout_json, configuracoes')
        .eq('id', body.reportId)
        .single();

      if (error || !data) {
        console.error('Report not found:', error);
        return new Response(
          JSON.stringify({ success: false, error: 'Relatório não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      reportLayout = (data as any).layout_json;
      apiUrl = (data as any).configuracoes?.api_url ?? null;

      if (!apiUrl) {
        return new Response(
          JSON.stringify({ success: false, error: 'API do relatório não configurada' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (body.report && body.apiUrl) {
      reportLayout = body.report;
      apiUrl = body.apiUrl;
    } else {
      return new Response(
        JSON.stringify({ success: false, error: 'Parâmetros inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch API data
    console.log('Fetching data from API:', apiUrl);
    const apiResp = await fetch(apiUrl!);
    if (!apiResp.ok) {
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao buscar dados da API' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Ensure api_data parameter exists and matches fields
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

    // Attach data as testData
    apiParam.testData = JSON.stringify(rows);

    // Call ReportBro cloud runner to generate PDF
    console.log('Calling ReportBro runner...');
    const runnerResp = await fetch('https://www.reportbro.com/report/run', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ report, outputFormat: 'pdf', isTestData: true })
    });

    if (!runnerResp.ok) {
      const t = await runnerResp.text();
      console.error('Runner error:', runnerResp.status, t);
      return new Response(
        JSON.stringify({ success: false, error: 'Falha ao gerar PDF' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await runnerResp.json();
    if (!result?.key) {
      return new Response(
        JSON.stringify({ success: false, error: 'Resposta inválida do gerador' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pdfUrl = `https://www.reportbro.com/report/${result.key}`;
    console.log('PDF ready:', pdfUrl, 'truncated:', truncated, 'rows:', rows.length, '/', totalCount);

    return new Response(
      JSON.stringify({ success: true, pdfUrl, truncated, included: rows.length, total: totalCount }),
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
