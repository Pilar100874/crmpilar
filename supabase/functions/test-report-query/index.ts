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

/**
 * Executa query SQL Server para teste em relatórios usando proxy
 */
async function executeSqlServerQuery(server: string, database: string, username: string, password: string, query: string, proxy_url?: string) {
  console.log('Executing SQL Server test query...');
  
  if (proxy_url) {
    console.log('Using SQL Server proxy:', proxy_url);
    
    try {
      const response = await fetch(`${proxy_url}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server: server,
          database: database,
          username: username,
          password: password,
          query: query,
          params: {}
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Proxy request failed');
      }

      const result = await response.json();
      console.log('Query executed via proxy successfully. Rows:', result.rowCount || 0);
      
      return result.data || [];
    } catch (error) {
      console.error('Proxy SQL Server error:', error);
      throw error;
    }
  } else {
    throw new Error('SQL Server direto não suportado. Configure um Proxy URL na conexão.');
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
