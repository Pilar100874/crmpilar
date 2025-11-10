import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import sql from 'https://esm.sh/mssql@10.0.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestQueryRequest {
  connectionId: string;
  query: string;
  type: 'test';
}

async function executeSqlServerQuery(server: string, database: string, username: string, password: string, query: string, port?: string) {
  console.log('Connecting to SQL Server directly for test...');
  
  const sqlConfig = {
    server: server,
    database: database,
    user: username,
    password: password,
    port: port ? parseInt(port) : 1433,
    options: {
      encrypt: true,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectionTimeout: 30000,
      requestTimeout: 30000
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  };

  let pool;
  try {
    console.log(`Test connecting to: ${server}/${database}`);
    pool = await sql.connect(sqlConfig);
    console.log('Test connection successful');

    const request = pool.request();
    const result = await request.query(query);
    console.log('Test query executed successfully. Rows:', result.recordset?.length || 0);
    
    return result.recordset || [];
  } catch (error) {
    console.error('Test SQL Server error:', error);
    throw error;
  } finally {
    if (pool) {
      try {
        await pool.close();
        console.log('Test connection closed');
      } catch (closeError) {
        console.error('Error closing test connection:', closeError);
      }
    }
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
        connection.sql_port
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
