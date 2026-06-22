
-- Períodos de fechamento (trava o mês)
CREATE TABLE public.ponto_periodos_fechamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  fechado_em timestamptz NOT NULL DEFAULT now(),
  fechado_por uuid,
  total_funcionarios int,
  total_he_min int,
  total_faltas int,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, mes_referencia)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_periodos_fechamento TO authenticated;
GRANT ALL ON public.ponto_periodos_fechamento TO service_role;
ALTER TABLE public.ponto_periodos_fechamento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuarios gerenciam fechamentos" ON public.ponto_periodos_fechamento
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.usuarios WHERE auth_user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.usuarios WHERE auth_user_id = auth.uid()));

-- Hash encadeado na auditoria
ALTER TABLE public.ponto_auditoria
  ADD COLUMN IF NOT EXISTS hash_anterior text,
  ADD COLUMN IF NOT EXISTS hash_atual text;

CREATE OR REPLACE FUNCTION public.ponto_auditoria_hash_chain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prev text;
  payload text;
BEGIN
  SELECT hash_atual INTO prev FROM public.ponto_auditoria
    ORDER BY created_at DESC, id DESC LIMIT 1;
  NEW.hash_anterior := COALESCE(prev, '0');
  payload := COALESCE(NEW.acao,'') || '|' || COALESCE(NEW.entidade,'') || '|'
    || COALESCE(NEW.entidade_id::text,'') || '|' || COALESCE(NEW.usuario_id::text,'')
    || '|' || COALESCE(NEW.detalhes::text,'') || '|' || COALESCE(NEW.created_at::text, now()::text)
    || '|' || NEW.hash_anterior;
  NEW.hash_atual := encode(digest(payload, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DROP TRIGGER IF EXISTS trg_ponto_auditoria_hash ON public.ponto_auditoria;
CREATE TRIGGER trg_ponto_auditoria_hash
  BEFORE INSERT ON public.ponto_auditoria
  FOR EACH ROW EXECUTE FUNCTION public.ponto_auditoria_hash_chain();

-- Ampliação export logs
ALTER TABLE public.ponto_export_logs
  ADD COLUMN IF NOT EXISTS layout text,
  ADD COLUMN IF NOT EXISTS arquivo_url text,
  ADD COLUMN IF NOT EXISTS erros_json jsonb,
  ADD COLUMN IF NOT EXISTS periodo_inicio date,
  ADD COLUMN IF NOT EXISTS periodo_fim date;
