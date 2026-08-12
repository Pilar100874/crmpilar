CREATE TABLE IF NOT EXISTS public.ritmo_humano_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL UNIQUE REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  ativo boolean NOT NULL DEFAULT true,
  delay_min_seg integer NOT NULL DEFAULT 25,
  delay_max_seg integer NOT NULL DEFAULT 55,
  lote_tamanho integer NOT NULL DEFAULT 40,
  pausa_lote_min_minutos integer NOT NULL DEFAULT 10,
  pausa_lote_max_minutos integer NOT NULL DEFAULT 20,
  limite_diario integer NOT NULL DEFAULT 250,
  respeitar_janela boolean NOT NULL DEFAULT true,
  hora_inicio integer NOT NULL DEFAULT 9,
  hora_fim integer NOT NULL DEFAULT 18,
  dias_semana integer[] NOT NULL DEFAULT '{1,2,3,4,5}',
  variar_texto boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ritmo_humano_config TO authenticated;
GRANT ALL ON public.ritmo_humano_config TO service_role;
ALTER TABLE public.ritmo_humano_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ritmo_config_tenant_all" ON public.ritmo_humano_config
  FOR ALL TO authenticated
  USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()))
  WITH CHECK (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.ritmo_humano_contador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  sessao text NOT NULL DEFAULT '',
  dia date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
  enviados integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estabelecimento_id, sessao, dia)
);

GRANT SELECT ON public.ritmo_humano_contador TO authenticated;
GRANT ALL ON public.ritmo_humano_contador TO service_role;
ALTER TABLE public.ritmo_humano_contador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ritmo_contador_tenant_select" ON public.ritmo_humano_contador
  FOR SELECT TO authenticated
  USING (estabelecimento_id IN (SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.ritmo_humano_consumir(p_est uuid, p_sessao text DEFAULT '')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_total integer;
BEGIN
  INSERT INTO public.ritmo_humano_contador (estabelecimento_id, sessao, dia, enviados)
  VALUES (p_est, COALESCE(p_sessao, ''), (now() AT TIME ZONE 'America/Sao_Paulo')::date, 1)
  ON CONFLICT (estabelecimento_id, sessao, dia)
  DO UPDATE SET enviados = public.ritmo_humano_contador.enviados + 1, updated_at = now()
  RETURNING enviados INTO v_total;
  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.ritmo_humano_consumir(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ritmo_humano_consumir(uuid, text) TO service_role;

CREATE TRIGGER trg_ritmo_config_updated_at
BEFORE UPDATE ON public.ritmo_humano_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();