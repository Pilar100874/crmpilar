-- Create helper to execute read-only SQL and return JSONB for Supabase connections
CREATE OR REPLACE FUNCTION public.execute_sql(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Wrap arbitrary SELECT into jsonb_agg; forbid dangerous commands
  IF position('insert' in lower(sql_query)) > 0
     OR position('update' in lower(sql_query)) > 0
     OR position('delete' in lower(sql_query)) > 0
     OR position('drop' in lower(sql_query)) > 0
     OR position('alter' in lower(sql_query)) > 0
     OR position('create' in lower(sql_query)) > 0
  THEN
    RAISE EXCEPTION 'Somente consultas SELECT são permitidas nesta função.';
  END IF;

  EXECUTE format('SELECT jsonb_agg(t) FROM (%s) t', sql_query) INTO result;
  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;