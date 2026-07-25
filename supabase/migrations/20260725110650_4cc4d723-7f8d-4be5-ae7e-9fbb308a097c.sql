
-- 1) Estender relatorios_voz com schema determinístico
ALTER TABLE public.relatorios_voz
  ADD COLUMN IF NOT EXISTS tipo_fonte text NOT NULL DEFAULT 'tabela' CHECK (tipo_fonte IN ('tabela','api')),
  ADD COLUMN IF NOT EXISTS tabela_base text,
  ADD COLUMN IF NOT EXISTS api_endpoint_id uuid REFERENCES public.api_endpoints(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS joins jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS campos_exibicao jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS filtros_disponiveis jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ordenacao jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS limite_padrao integer NOT NULL DEFAULT 100;

-- 2) Snapshots temporários de relatórios executados por voz
CREATE TABLE IF NOT EXISTS public.relatorio_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id uuid NOT NULL,
  estabelecimento_id uuid,
  relatorio_voz_id uuid REFERENCES public.relatorios_voz(id) ON DELETE SET NULL,
  nome text NOT NULL,
  filtros_aplicados jsonb NOT NULL DEFAULT '{}'::jsonb,
  dados jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_registros integer NOT NULL DEFAULT 0,
  permanente boolean NOT NULL DEFAULT false,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorio_snapshots TO authenticated;
GRANT ALL ON public.relatorio_snapshots TO service_role;

ALTER TABLE public.relatorio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem seus snapshots"
  ON public.relatorio_snapshots FOR SELECT TO authenticated
  USING (usuario_id = auth.uid());

CREATE POLICY "Usuarios criam snapshots"
  ON public.relatorio_snapshots FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuarios editam seus snapshots"
  ON public.relatorio_snapshots FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "Usuarios apagam seus snapshots"
  ON public.relatorio_snapshots FOR DELETE TO authenticated
  USING (usuario_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_relatorio_snapshots_usuario ON public.relatorio_snapshots(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_relatorio_snapshots_expira ON public.relatorio_snapshots(expira_em) WHERE permanente = false;

CREATE TRIGGER trg_relatorio_snapshots_updated_at
  BEFORE UPDATE ON public.relatorio_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Função de limpeza (executada por cron)
CREATE OR REPLACE FUNCTION public.cleanup_relatorio_snapshots_expirados()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_removidos integer;
BEGIN
  WITH removed AS (
    DELETE FROM public.relatorio_snapshots
    WHERE permanente = false AND expira_em < now()
    RETURNING 1
  )
  SELECT count(*) INTO v_removidos FROM removed;
  RETURN v_removidos;
END;
$$;
