import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestQueryRequest {
  connectionId: string;
  query: string;
  type: 'test';
}

async function executeSqlServerQuery(server: string, database: string, username: string, password: string, query: string, proxy_url?: string) {
  console.log('Executing SQL Server test query via proxy...');

  const proxyUrl = proxy_url || Deno.env.get('SQL_SERVER_PROXY_URL');
  if (!proxyUrl) {
    throw new Error('SQL Server direto não suportado neste ambiente. Configure um Proxy URL na conexão.');
  }

  try {
    const response = await fetch(`${proxyUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ server, database, username, password, query, params: {} })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Proxy request failed with ${response.status}`);
    }

    const result = await response.json();
    console.log('Test query executed via proxy successfully. Rows:', result.rowCount || 0);
    return result.data || [];
  } catch (error) {
    console.error('Proxy SQL Server error (test):', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: TestQueryRequest = await req.json();
    console.log('Test query request received for connection:', body.connectionId);

    // Buscar conexão
    const { data: connection, error: connError } = await supabase
      .from('database_connections')
      .select('*')
      .eq('id', body.connectionId)
      .eq('active', true)
      .single();

    if (connError || !connection) {
      console.error('Connection not found:', connError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Conexão não encontrada ou inativa' 
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Connection found:', connection.name, connection.database_type);

    // Executar query baseado no tipo de banco
    if (connection.database_type === 'sqlserver') {
      const result = await executeSqlServerQuery(
        connection.sql_server,
        connection.sql_database,
        connection.sql_username,
        connection.sql_password,
        body.query,
        connection.proxy_url
      );

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          rowCount: result.length,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else if (connection.database_type === 'supabase') {
      // Para Supabase, executar via RPC
      const { data: result, error: queryError } = await supabase.rpc('execute_sql', {
        sql_query: body.query
      });

      if (queryError) {
        throw queryError;
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: result,
          rowCount: result?.length || 0,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: `Tipo de banco ${connection.database_type} não suportado` 
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
  } catch (error: any) {
    console.error('Error in test-report-query function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});