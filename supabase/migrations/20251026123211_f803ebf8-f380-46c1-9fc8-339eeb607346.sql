DROP POLICY IF EXISTS "Insert funis in same estabelecimento" ON public.funis;

CREATE POLICY "Insert funis (authenticated)"
  ON public.funis FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );