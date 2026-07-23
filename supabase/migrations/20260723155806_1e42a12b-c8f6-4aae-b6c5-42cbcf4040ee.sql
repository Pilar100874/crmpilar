
-- 1. Novos campos na tabela empresas
ALTER TABLE public.empresas
  ADD COLUMN IF NOT EXISTS ja_respondeu_whatsapp boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultima_resposta_bot_em timestamptz,
  ADD COLUMN IF NOT EXISTS ultima_resposta_bot_nome text;

-- 2. Enum de status
DO $$ BEGIN
  CREATE TYPE public.bot_response_status AS ENUM ('aguardando','respondeu','sem_resposta');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Tabela de tracking
CREATE TABLE IF NOT EXISTS public.bot_response_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  empresa_id uuid REFERENCES public.empresas(id) ON DELETE CASCADE,
  contato_telefone text NOT NULL,
  flow_id uuid,
  flow_nome text,
  block_id text,
  bot_execution_id text,
  enviado_em timestamptz NOT NULL DEFAULT now(),
  respondido_em timestamptz,
  resposta_texto text,
  timeout_horas integer NOT NULL DEFAULT 24,
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  status public.bot_response_status NOT NULL DEFAULT 'aguardando',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brt_estab ON public.bot_response_tracking(estabelecimento_id);
CREATE INDEX IF NOT EXISTS idx_brt_status ON public.bot_response_tracking(status, expira_em);
CREATE INDEX IF NOT EXISTS idx_brt_telefone ON public.bot_response_tracking(contato_telefone, status);
CREATE INDEX IF NOT EXISTS idx_brt_empresa ON public.bot_response_tracking(empresa_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bot_response_tracking TO authenticated;
GRANT ALL ON public.bot_response_tracking TO service_role;

ALTER TABLE public.bot_response_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brt_tenant_all" ON public.bot_response_tracking
  FOR ALL TO authenticated
  USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()))
  WITH CHECK (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE POLICY "brt_service_role" ON public.bot_response_tracking
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION public.brt_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_brt_touch ON public.bot_response_tracking;
CREATE TRIGGER trg_brt_touch BEFORE UPDATE ON public.bot_response_tracking
  FOR EACH ROW EXECUTE FUNCTION public.brt_touch_updated_at();

-- 5. Função para marcar resposta recebida (usada pelo webhook do WhatsApp)
CREATE OR REPLACE FUNCTION public.mark_bot_response(
  p_telefone text,
  p_texto text,
  p_estabelecimento_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_normalized text;
  r record;
BEGIN
  v_normalized := regexp_replace(coalesce(p_telefone,''), '\D', '', 'g');
  IF length(v_normalized) < 8 THEN RETURN 0; END IF;

  FOR r IN
    SELECT id, empresa_id, flow_nome
    FROM public.bot_response_tracking
    WHERE status = 'aguardando'
      AND expira_em > now()
      AND regexp_replace(contato_telefone, '\D', '', 'g') LIKE '%' || right(v_normalized, 10)
      AND (p_estabelecimento_id IS NULL OR estabelecimento_id = p_estabelecimento_id)
  LOOP
    UPDATE public.bot_response_tracking
       SET status = 'respondeu',
           respondido_em = now(),
           resposta_texto = left(coalesce(p_texto,''), 2000)
     WHERE id = r.id;

    IF r.empresa_id IS NOT NULL THEN
      UPDATE public.empresas
         SET ja_respondeu_whatsapp = true,
             ultima_resposta_bot_em = now(),
             ultima_resposta_bot_nome = r.flow_nome
       WHERE id = r.empresa_id;
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END; $$;

GRANT EXECUTE ON FUNCTION public.mark_bot_response(text,text,uuid) TO authenticated, service_role;

-- 6. Função para expirar trackings
CREATE OR REPLACE FUNCTION public.expire_bot_response_tracking()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.bot_response_tracking
     SET status = 'sem_resposta'
   WHERE status = 'aguardando'
     AND expira_em <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

GRANT EXECUTE ON FUNCTION public.expire_bot_response_tracking() TO authenticated, service_role;
