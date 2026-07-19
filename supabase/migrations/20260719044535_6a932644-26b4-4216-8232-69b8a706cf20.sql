
CREATE TABLE public.mcp_tabelas_expostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL UNIQUE,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcp_tabelas_expostas TO authenticated;
GRANT ALL ON public.mcp_tabelas_expostas TO service_role;
ALTER TABLE public.mcp_tabelas_expostas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read mcp tabelas" ON public.mcp_tabelas_expostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth insert mcp tabelas" ON public.mcp_tabelas_expostas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth update mcp tabelas" ON public.mcp_tabelas_expostas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth delete mcp tabelas" ON public.mcp_tabelas_expostas FOR DELETE TO authenticated USING (true);
