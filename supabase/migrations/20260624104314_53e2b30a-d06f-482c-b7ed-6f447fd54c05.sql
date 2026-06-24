
-- 1) Histórico de vínculo escala/cargo/jornada por funcionário (vigências)
CREATE TABLE IF NOT EXISTS public.ponto_funcionario_escala_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id UUID NOT NULL,
  empresa_id UUID,
  escala_id UUID,
  jornada_contratada_horas NUMERIC,
  cargo_id UUID,
  departamento_id UUID,
  filial_id UUID,
  valor_hora NUMERIC,
  data_inicio DATE NOT NULL,
  data_fim DATE,
  motivo TEXT,
  alterado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_funcionario_escala_historico TO authenticated;
GRANT ALL ON public.ponto_funcionario_escala_historico TO service_role;

ALTER TABLE public.ponto_funcionario_escala_historico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ponto_func_esc_hist_all" ON public.ponto_funcionario_escala_historico
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_pfeh_func_data ON public.ponto_funcionario_escala_historico(funcionario_id, data_inicio DESC);

-- 2) Trigger: gera nova vigência quando muda escala/cargo/jornada/filial/valor_hora
CREATE OR REPLACE FUNCTION public.ponto_func_track_vigencia()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ponto_funcionario_escala_historico
      (funcionario_id, empresa_id, escala_id, jornada_contratada_horas, cargo_id, departamento_id, filial_id, valor_hora, data_inicio, motivo)
    VALUES (NEW.id, NEW.empresa_id, NEW.escala_id, NEW.jornada_contratada_horas, NEW.cargo_id, NEW.departamento_id, NEW.filial_id, NEW.valor_hora,
            COALESCE(NEW.admissao, CURRENT_DATE), 'admissao');
    RETURN NEW;
  END IF;

  IF (COALESCE(NEW.escala_id::text,'') IS DISTINCT FROM COALESCE(OLD.escala_id::text,''))
     OR (COALESCE(NEW.jornada_contratada_horas,0) IS DISTINCT FROM COALESCE(OLD.jornada_contratada_horas,0))
     OR (COALESCE(NEW.cargo_id::text,'') IS DISTINCT FROM COALESCE(OLD.cargo_id::text,''))
     OR (COALESCE(NEW.departamento_id::text,'') IS DISTINCT FROM COALESCE(OLD.departamento_id::text,''))
     OR (COALESCE(NEW.filial_id::text,'') IS DISTINCT FROM COALESCE(OLD.filial_id::text,''))
     OR (COALESCE(NEW.valor_hora,0) IS DISTINCT FROM COALESCE(OLD.valor_hora,0))
  THEN
    UPDATE public.ponto_funcionario_escala_historico
      SET data_fim = CURRENT_DATE - 1
      WHERE funcionario_id = NEW.id AND data_fim IS NULL;

    INSERT INTO public.ponto_funcionario_escala_historico
      (funcionario_id, empresa_id, escala_id, jornada_contratada_horas, cargo_id, departamento_id, filial_id, valor_hora, data_inicio, motivo)
    VALUES (NEW.id, NEW.empresa_id, NEW.escala_id, NEW.jornada_contratada_horas, NEW.cargo_id, NEW.departamento_id, NEW.filial_id, NEW.valor_hora,
            CURRENT_DATE, 'alteracao');
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ponto_func_vigencia_ins ON public.ponto_funcionarios;
CREATE TRIGGER trg_ponto_func_vigencia_ins
  AFTER INSERT ON public.ponto_funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.ponto_func_track_vigencia();

DROP TRIGGER IF EXISTS trg_ponto_func_vigencia_upd ON public.ponto_funcionarios;
CREATE TRIGGER trg_ponto_func_vigencia_upd
  AFTER UPDATE ON public.ponto_funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.ponto_func_track_vigencia();

-- 3) Backfill: cria vigência inicial para funcionários existentes sem histórico
INSERT INTO public.ponto_funcionario_escala_historico
  (funcionario_id, empresa_id, escala_id, jornada_contratada_horas, cargo_id, departamento_id, filial_id, valor_hora, data_inicio, motivo)
SELECT f.id, f.empresa_id, f.escala_id, f.jornada_contratada_horas, f.cargo_id, f.departamento_id, f.filial_id, f.valor_hora,
       COALESCE(f.admissao, f.created_at::date, CURRENT_DATE), 'backfill'
FROM public.ponto_funcionarios f
LEFT JOIN public.ponto_funcionario_escala_historico h ON h.funcionario_id = f.id
WHERE h.id IS NULL;

-- 4) Helper: resolve a vigência ativa em uma data
CREATE OR REPLACE FUNCTION public.ponto_get_vigencia(_func_id uuid, _data date)
RETURNS public.ponto_funcionario_escala_historico
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT * FROM public.ponto_funcionario_escala_historico
  WHERE funcionario_id = _func_id
    AND data_inicio <= _data
    AND (data_fim IS NULL OR data_fim >= _data)
  ORDER BY data_inicio DESC LIMIT 1;
$$;

-- 5) Auditoria automática: triggers genéricos em tabelas-chave (usa cadeia hash existente)
CREATE OR REPLACE FUNCTION public.ponto_auto_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_empresa uuid;
  v_usuario uuid;
BEGIN
  v_empresa := COALESCE((NEW).empresa_id::uuid, (OLD).empresa_id::uuid);
EXCEPTION WHEN OTHERS THEN v_empresa := NULL;
END $$;

-- Reescrita robusta (NEW/OLD podem não ter empresa_id em todas as tabelas)
CREATE OR REPLACE FUNCTION public.ponto_auto_audit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  v_empresa uuid := NULL;
  v_id uuid := NULL;
  v_dados_old jsonb := NULL;
  v_dados_new jsonb := NULL;
BEGIN
  IF TG_OP <> 'INSERT' THEN v_dados_old := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN v_dados_new := to_jsonb(NEW); END IF;
  v_id := COALESCE((v_dados_new->>'id')::uuid, (v_dados_old->>'id')::uuid);
  v_empresa := COALESCE(
    (v_dados_new->>'empresa_id')::uuid,
    (v_dados_old->>'empresa_id')::uuid,
    (v_dados_new->>'ponto_empresa_id')::uuid,
    (v_dados_old->>'ponto_empresa_id')::uuid
  );

  INSERT INTO public.ponto_auditoria
    (empresa_id, entidade, entidade_id, acao, dados_anteriores, dados_novos, usuario_id)
  VALUES
    (v_empresa, TG_TABLE_NAME, v_id, lower(TG_OP), v_dados_old, v_dados_new, auth.uid());

  RETURN COALESCE(NEW, OLD);
END $$;

DROP TRIGGER IF EXISTS trg_audit_ponto_funcionarios ON public.ponto_funcionarios;
CREATE TRIGGER trg_audit_ponto_funcionarios
  AFTER INSERT OR UPDATE OR DELETE ON public.ponto_funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.ponto_auto_audit();

DROP TRIGGER IF EXISTS trg_audit_ponto_escalas ON public.ponto_escalas;
CREATE TRIGGER trg_audit_ponto_escalas
  AFTER INSERT OR UPDATE OR DELETE ON public.ponto_escalas
  FOR EACH ROW EXECUTE FUNCTION public.ponto_auto_audit();

DROP TRIGGER IF EXISTS trg_audit_ponto_atestados ON public.ponto_atestados;
CREATE TRIGGER trg_audit_ponto_atestados
  AFTER INSERT OR UPDATE OR DELETE ON public.ponto_atestados
  FOR EACH ROW EXECUTE FUNCTION public.ponto_auto_audit();

DROP TRIGGER IF EXISTS trg_audit_ponto_ferias ON public.ponto_ferias_afastamentos;
CREATE TRIGGER trg_audit_ponto_ferias
  AFTER INSERT OR UPDATE OR DELETE ON public.ponto_ferias_afastamentos
  FOR EACH ROW EXECUTE FUNCTION public.ponto_auto_audit();

DROP TRIGGER IF EXISTS trg_audit_ponto_registros ON public.ponto_registros;
CREATE TRIGGER trg_audit_ponto_registros
  AFTER INSERT OR UPDATE OR DELETE ON public.ponto_registros
  FOR EACH ROW EXECUTE FUNCTION public.ponto_auto_audit();

DROP TRIGGER IF EXISTS trg_audit_ponto_ajustes ON public.ponto_ajustes;
CREATE TRIGGER trg_audit_ponto_ajustes
  AFTER INSERT OR UPDATE OR DELETE ON public.ponto_ajustes
  FOR EACH ROW EXECUTE FUNCTION public.ponto_auto_audit();
