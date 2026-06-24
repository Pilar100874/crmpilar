ALTER TABLE public.ponto_clt_config
  ADD COLUMN IF NOT EXISTS banco_horas_prazo_meses integer NOT NULL DEFAULT 6,
  ADD COLUMN IF NOT EXISTS banco_horas_alerta_dias_antes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS banco_horas_acao_expirado text NOT NULL DEFAULT 'pagar';

ALTER TABLE public.ponto_banco_horas_lancamentos
  ADD COLUMN IF NOT EXISTS compensado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compensado_em timestamptz,
  ADD COLUMN IF NOT EXISTS expirado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expirado_em timestamptz;

CREATE OR REPLACE VIEW public.ponto_compliance_dashboard AS
SELECT
  f.empresa_id,
  date_trunc('month', a.data)::date as mes,
  COUNT(*) FILTER (WHERE a.tipo = 'he_acima_limite') as he_acima_limite,
  COUNT(*) FILTER (WHERE a.tipo = 'jornada_acima_limite') as jornada_acima_limite,
  COUNT(*) FILTER (WHERE a.tipo = 'interjornada_violada') as interjornada_violada,
  COUNT(*) FILTER (WHERE a.tipo = 'intrajornada_violada') as intrajornada_violada,
  COUNT(*) FILTER (WHERE a.severidade = 'critica') as criticas,
  COUNT(*) FILTER (WHERE a.severidade = 'alta') as altas,
  COUNT(*) FILTER (WHERE COALESCE(a.resolvida,false) = false) as pendentes,
  COUNT(*) FILTER (WHERE COALESCE(a.resolvida,false) = true) as resolvidas,
  COUNT(*) as total_anomalias,
  COUNT(DISTINCT a.funcionario_id) as funcionarios_afetados
FROM public.ponto_anomalias a
JOIN public.ponto_funcionarios f ON f.id = a.funcionario_id
GROUP BY f.empresa_id, date_trunc('month', a.data);

GRANT SELECT ON public.ponto_compliance_dashboard TO authenticated;
GRANT ALL ON public.ponto_compliance_dashboard TO service_role;

CREATE OR REPLACE VIEW public.ponto_banco_horas_a_expirar AS
SELECT
  l.id,
  l.funcionario_id,
  f.nome as funcionario_nome,
  f.empresa_id,
  l.data,
  l.minutos,
  l.tipo,
  l.created_at,
  COALESCE(cfg.banco_horas_prazo_meses, 6) as banco_horas_prazo_meses,
  (l.created_at + (COALESCE(cfg.banco_horas_prazo_meses,6) || ' months')::interval)::date as expira_em,
  ((l.created_at + (COALESCE(cfg.banco_horas_prazo_meses,6) || ' months')::interval)::date - CURRENT_DATE) as dias_para_expirar
FROM public.ponto_banco_horas_lancamentos l
JOIN public.ponto_funcionarios f ON f.id = l.funcionario_id
LEFT JOIN public.ponto_clt_config cfg ON cfg.empresa_id = f.empresa_id
WHERE l.minutos > 0
  AND COALESCE(l.compensado, false) = false
  AND COALESCE(l.expirado, false) = false;

GRANT SELECT ON public.ponto_banco_horas_a_expirar TO authenticated;
GRANT ALL ON public.ponto_banco_horas_a_expirar TO service_role;