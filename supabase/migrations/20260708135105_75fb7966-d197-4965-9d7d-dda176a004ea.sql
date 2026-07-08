
CREATE OR REPLACE FUNCTION public.exec_readonly_select(sql_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  normalized text;
BEGIN
  IF sql_query IS NULL THEN
    RAISE EXCEPTION 'sql_query obrigatório';
  END IF;

  normalized := btrim(sql_query);
  -- remove ponto e vírgula final
  IF right(normalized, 1) = ';' THEN
    normalized := btrim(left(normalized, length(normalized) - 1));
  END IF;

  IF position(';' IN normalized) > 0 THEN
    RAISE EXCEPTION 'Múltiplas instruções não permitidas';
  END IF;

  IF lower(left(normalized, 6)) <> 'select' AND lower(left(normalized, 4)) <> 'with' THEN
    RAISE EXCEPTION 'Apenas SELECT/WITH é permitido';
  END IF;

  IF normalized ~* '\y(insert|update|delete|drop|alter|grant|revoke|truncate|create|comment|copy|vacuum|analyze|call|do|reindex|refresh)\y' THEN
    RAISE EXCEPTION 'Palavra-chave não permitida';
  END IF;

  SET LOCAL statement_timeout = '10s';
  SET LOCAL transaction_read_only = on;

  EXECUTE format('SELECT COALESCE(jsonb_agg(t), ''[]''::jsonb) FROM (%s) t', normalized) INTO result;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.exec_readonly_select(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.exec_readonly_select(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.exec_readonly_select(text) TO service_role;
