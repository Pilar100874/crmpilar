
-- 1. Sequência NSR por empresa
CREATE TABLE IF NOT EXISTS public.ponto_nsr_seq (
  empresa_id uuid PRIMARY KEY REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  ultimo_nsr bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ponto_nsr_seq TO authenticated;
GRANT ALL ON public.ponto_nsr_seq TO service_role;
ALTER TABLE public.ponto_nsr_seq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nsr tenant read" ON public.ponto_nsr_seq FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM ponto_empresas e WHERE e.id = ponto_nsr_seq.empresa_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id()));

-- 2. Trigger: gera NSR + hash SHA-256 encadeado em ponto_registros
CREATE OR REPLACE FUNCTION public.ponto_registros_nsr_hash()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_empresa uuid;
  v_nsr bigint;
  v_prev_hash text;
  v_payload text;
BEGIN
  IF NEW.nsr IS NOT NULL AND NEW.hash_assinatura IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT empresa_id INTO v_empresa FROM ponto_funcionarios WHERE id = NEW.funcionario_id;
  IF v_empresa IS NULL THEN RETURN NEW; END IF;

  INSERT INTO ponto_nsr_seq(empresa_id, ultimo_nsr) VALUES (v_empresa, 1)
  ON CONFLICT (empresa_id) DO UPDATE SET ultimo_nsr = ponto_nsr_seq.ultimo_nsr + 1, updated_at = now()
  RETURNING ultimo_nsr INTO v_nsr;

  SELECT hash_assinatura INTO v_prev_hash
    FROM ponto_registros r
    JOIN ponto_funcionarios f ON f.id = r.funcionario_id
   WHERE f.empresa_id = v_empresa AND r.nsr IS NOT NULL
   ORDER BY r.nsr DESC LIMIT 1;

  v_payload := COALESCE(v_prev_hash, '0') || '|' || v_nsr::text || '|'
    || NEW.funcionario_id::text || '|' || NEW.data_hora::text || '|'
    || COALESCE(NEW.tipo,'') || '|' || COALESCE(NEW.origem,'');

  NEW.nsr := v_nsr;
  NEW.hash_assinatura := encode(digest(v_payload, 'sha256'), 'hex');
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ponto_reg_nsr_hash ON public.ponto_registros;
CREATE TRIGGER trg_ponto_reg_nsr_hash BEFORE INSERT ON public.ponto_registros
FOR EACH ROW EXECUTE FUNCTION public.ponto_registros_nsr_hash();

-- 3. Cálculo DSR sobre HE mensal (CLT)
CREATE OR REPLACE FUNCTION public.ponto_calcular_dsr_mensal(_func_id uuid, _mes date)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_he_total int := 0;
  v_dias_uteis int := 0;
  v_dom_feriados int := 0;
  v_ini date := date_trunc('month', _mes)::date;
  v_fim date := (date_trunc('month', _mes) + interval '1 month - 1 day')::date;
  v_empresa uuid;
  d date;
  dow int;
  is_feriado boolean;
BEGIN
  SELECT empresa_id INTO v_empresa FROM ponto_funcionarios WHERE id = _func_id;
  SELECT COALESCE(SUM(extra_min),0) INTO v_he_total FROM ponto_espelho_diario
   WHERE funcionario_id = _func_id AND data BETWEEN v_ini AND v_fim;

  d := v_ini;
  WHILE d <= v_fim LOOP
    dow := EXTRACT(DOW FROM d);
    SELECT EXISTS(SELECT 1 FROM ponto_feriados WHERE data = d AND (empresa_id = v_empresa OR empresa_id IS NULL))
      INTO is_feriado;
    IF dow = 0 OR is_feriado THEN v_dom_feriados := v_dom_feriados + 1;
    ELSE v_dias_uteis := v_dias_uteis + 1;
    END IF;
    d := d + 1;
  END LOOP;

  IF v_dias_uteis = 0 THEN RETURN 0; END IF;
  RETURN ROUND( (v_he_total::numeric / v_dias_uteis) * v_dom_feriados );
END $$;

-- 4. Histórico AFD
CREATE TABLE IF NOT EXISTS public.ponto_afd_arquivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  data_inicio date NOT NULL,
  data_fim date NOT NULL,
  nsr_inicial bigint,
  nsr_final bigint,
  total_registros integer DEFAULT 0,
  hash_arquivo text,
  storage_path text,
  gerado_por uuid REFERENCES public.usuarios(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ponto_afd_arquivos TO authenticated;
GRANT ALL ON public.ponto_afd_arquivos TO service_role;
ALTER TABLE public.ponto_afd_arquivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "afd tenant" ON public.ponto_afd_arquivos FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM ponto_empresas e WHERE e.id = ponto_afd_arquivos.empresa_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id()))
WITH CHECK (EXISTS (SELECT 1 FROM ponto_empresas e WHERE e.id = ponto_afd_arquivos.empresa_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id()));

-- 5. Envios de espelho ao funcionário
CREATE TABLE IF NOT EXISTS public.ponto_espelho_envios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  status text NOT NULL DEFAULT 'pendente', -- pendente|enviado|visualizado|assinado|rejeitado
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  hash_espelho text,
  enviado_em timestamptz,
  visualizado_em timestamptz,
  respondido_em timestamptz,
  motivo_rejeicao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(funcionario_id, mes_referencia)
);
GRANT SELECT, INSERT, UPDATE ON public.ponto_espelho_envios TO authenticated;
GRANT ALL ON public.ponto_espelho_envios TO service_role;
GRANT SELECT, UPDATE ON public.ponto_espelho_envios TO anon; -- acesso por token
ALTER TABLE public.ponto_espelho_envios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "envios tenant" ON public.ponto_espelho_envios FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM ponto_funcionarios f JOIN ponto_empresas e ON e.id = f.empresa_id WHERE f.id = ponto_espelho_envios.funcionario_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id()))
WITH CHECK (EXISTS (SELECT 1 FROM ponto_funcionarios f JOIN ponto_empresas e ON e.id = f.empresa_id WHERE f.id = ponto_espelho_envios.funcionario_id AND e.estabelecimento_id = get_auth_user_estabelecimento_id()));
CREATE POLICY "envios por token" ON public.ponto_espelho_envios FOR SELECT TO anon USING (true);
CREATE POLICY "envios update token" ON public.ponto_espelho_envios FOR UPDATE TO anon USING (true);

CREATE TRIGGER trg_ponto_envios_updated BEFORE UPDATE ON public.ponto_espelho_envios
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
