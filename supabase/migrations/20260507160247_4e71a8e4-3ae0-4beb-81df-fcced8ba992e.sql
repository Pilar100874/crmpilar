
-- Create a secure RPC function for tracking lookup by token
CREATE OR REPLACE FUNCTION public.lookup_pedido_by_token(p_token text)
RETURNS SETOF pedido_tracking
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.pedido_tracking
  WHERE token_rastreamento = p_token
  LIMIT 1;
$$;

-- Allow anon to call this function
GRANT EXECUTE ON FUNCTION public.lookup_pedido_by_token(text) TO anon;
GRANT EXECUTE ON FUNCTION public.lookup_pedido_by_token(text) TO authenticated;
