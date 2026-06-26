
ALTER TABLE public.ponto_compensacao_acordos
  ADD COLUMN IF NOT EXISTS votacao_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS votacao_abre_em timestamptz,
  ADD COLUMN IF NOT EXISTS votacao_fecha_em timestamptz,
  ADD COLUMN IF NOT EXISTS quorum_percentual integer NOT NULL DEFAULT 70,
  ADD COLUMN IF NOT EXISTS total_elegiveis integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_votos_sim integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_votos_nao integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS votacao_resultado text,
  ADD COLUMN IF NOT EXISTS votacao_finalizada_em timestamptz,
  ADD COLUMN IF NOT EXISTS termo_ciencia_url text;

CREATE TABLE IF NOT EXISTS public.ponto_compensacao_votos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acordo_id uuid NOT NULL REFERENCES public.ponto_compensacao_acordos(id) ON DELETE CASCADE,
  funcionario_id uuid NOT NULL,
  voto text NOT NULL CHECK (voto IN ('sim','nao','abster')),
  justificativa text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (acordo_id, funcionario_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_compensacao_votos TO authenticated;
GRANT ALL ON public.ponto_compensacao_votos TO service_role;

ALTER TABLE public.ponto_compensacao_votos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth manage compensacao votos"
  ON public.ponto_compensacao_votos FOR ALL
  TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_comp_votos_acordo ON public.ponto_compensacao_votos(acordo_id);
CREATE INDEX IF NOT EXISTS idx_comp_votos_func ON public.ponto_compensacao_votos(funcionario_id);
