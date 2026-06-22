
-- =========================================================================
-- MÓDULO CONTROLE DE PONTO — Tabelas isoladas (prefixo ponto_)
-- =========================================================================

-- Função auxiliar de updated_at (reutiliza public.update_updated_at_column se existir)

-- 1. EMPRESAS
CREATE TABLE public.ponto_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text NOT NULL,
  inscricao_estadual text,
  endereco text,
  cidade text,
  uf text,
  cep text,
  codigo_dominio text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_empresas TO authenticated;
GRANT ALL ON public.ponto_empresas TO service_role;
ALTER TABLE public.ponto_empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_empresas tenant" ON public.ponto_empresas FOR ALL
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE TRIGGER trg_ponto_empresas_upd BEFORE UPDATE ON public.ponto_empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. FILIAIS
CREATE TABLE public.ponto_filiais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cnpj text,
  endereco text,
  cidade text,
  uf text,
  cep text,
  gps_lat numeric,
  gps_lon numeric,
  raio_metros integer DEFAULT 200,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_filiais TO authenticated;
GRANT ALL ON public.ponto_filiais TO service_role;
ALTER TABLE public.ponto_filiais ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_filiais tenant" ON public.ponto_filiais FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_filiais_upd BEFORE UPDATE ON public.ponto_filiais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. DEPARTAMENTOS
CREATE TABLE public.ponto_departamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id uuid NOT NULL REFERENCES public.ponto_filiais(id) ON DELETE CASCADE,
  nome text NOT NULL,
  centro_custo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_departamentos TO authenticated;
GRANT ALL ON public.ponto_departamentos TO service_role;
ALTER TABLE public.ponto_departamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_dept tenant" ON public.ponto_departamentos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_filiais f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = filial_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_filiais f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = filial_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_dept_upd BEFORE UPDATE ON public.ponto_departamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. ESCALAS
CREATE TABLE public.ponto_escalas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT '5x2',
  jornada jsonb NOT NULL DEFAULT '{}'::jsonb,
  intervalo_minutos integer DEFAULT 60,
  carga_semanal_minutos integer DEFAULT 2640,
  noturna boolean DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_escalas TO authenticated;
GRANT ALL ON public.ponto_escalas TO service_role;
ALTER TABLE public.ponto_escalas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_escalas tenant" ON public.ponto_escalas FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_escalas_upd BEFORE UPDATE ON public.ponto_escalas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. FERIADOS
CREATE TABLE public.ponto_feriados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  data date NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'nacional',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_feriados TO authenticated;
GRANT ALL ON public.ponto_feriados TO service_role;
ALTER TABLE public.ponto_feriados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_feriados tenant" ON public.ponto_feriados FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- 6. REGRAS JORNADA
CREATE TABLE public.ponto_regras_jornada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL UNIQUE REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  tolerancia_atraso_min integer DEFAULT 10,
  tolerancia_saida_antec_min integer DEFAULT 10,
  hora_extra_pct numeric DEFAULT 50,
  hora_extra_noturno_pct numeric DEFAULT 70,
  adicional_noturno_pct numeric DEFAULT 20,
  noturno_inicio time DEFAULT '22:00',
  noturno_fim time DEFAULT '05:00',
  banco_horas_ativo boolean DEFAULT true,
  banco_horas_limite_min integer DEFAULT 7200,
  fechamento_dia integer DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_regras_jornada TO authenticated;
GRANT ALL ON public.ponto_regras_jornada TO service_role;
ALTER TABLE public.ponto_regras_jornada ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_regras tenant" ON public.ponto_regras_jornada FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_regras_upd BEFORE UPDATE ON public.ponto_regras_jornada
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7. FUNCIONÁRIOS
CREATE TABLE public.ponto_funcionarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  filial_id uuid REFERENCES public.ponto_filiais(id) ON DELETE SET NULL,
  departamento_id uuid REFERENCES public.ponto_departamentos(id) ON DELETE SET NULL,
  escala_id uuid REFERENCES public.ponto_escalas(id) ON DELETE SET NULL,
  nome text NOT NULL,
  cpf text NOT NULL,
  pis text,
  matricula text,
  cargo text,
  email text,
  telefone text,
  admissao date,
  demissao date,
  status text NOT NULL DEFAULT 'ativo',
  codigo_dominio text,
  auth_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ponto_func_empresa_cpf ON public.ponto_funcionarios(empresa_id, cpf);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_funcionarios TO authenticated;
GRANT ALL ON public.ponto_funcionarios TO service_role;
ALTER TABLE public.ponto_funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_func tenant" ON public.ponto_funcionarios FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_func_upd BEFORE UPDATE ON public.ponto_funcionarios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. EQUIPAMENTOS
CREATE TABLE public.ponto_equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  filial_id uuid REFERENCES public.ponto_filiais(id) ON DELETE SET NULL,
  nome text NOT NULL,
  marca text,
  modelo text,
  ip text,
  porta integer,
  serial text,
  firmware text,
  protocolo text DEFAULT 'rep_a',
  ultima_sync timestamptz,
  status text DEFAULT 'offline',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_equipamentos TO authenticated;
GRANT ALL ON public.ponto_equipamentos TO service_role;
ALTER TABLE public.ponto_equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_equip tenant" ON public.ponto_equipamentos FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_equip_upd BEFORE UPDATE ON public.ponto_equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. DISPOSITIVOS AUTORIZADOS
CREATE TABLE public.ponto_dispositivos_autorizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  plataforma text,
  modelo text,
  ativo boolean NOT NULL DEFAULT true,
  ultimo_uso timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ponto_disp_func_device ON public.ponto_dispositivos_autorizados(funcionario_id, device_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_dispositivos_autorizados TO authenticated;
GRANT ALL ON public.ponto_dispositivos_autorizados TO service_role;
ALTER TABLE public.ponto_dispositivos_autorizados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_disp tenant" ON public.ponto_dispositivos_autorizados FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_funcionarios f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = funcionario_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_funcionarios f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = funcionario_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- 10. REGISTROS (batidas brutas)
CREATE TABLE public.ponto_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  equipamento_id uuid REFERENCES public.ponto_equipamentos(id) ON DELETE SET NULL,
  data_hora timestamptz NOT NULL,
  tipo text NOT NULL DEFAULT 'entrada',
  origem text NOT NULL DEFAULT 'app',
  gps_lat numeric,
  gps_lon numeric,
  gps_precisao numeric,
  foto_url text,
  dispositivo_info jsonb,
  ip text,
  score_fraude integer DEFAULT 0,
  hash_assinatura text,
  nsr bigint,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ponto_reg_func_dt ON public.ponto_registros(funcionario_id, data_hora DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_registros TO authenticated;
GRANT ALL ON public.ponto_registros TO service_role;
ALTER TABLE public.ponto_registros ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_reg tenant" ON public.ponto_registros FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_funcionarios f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = funcionario_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_funcionarios f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = funcionario_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- 11. ESPELHO DIÁRIO
CREATE TABLE public.ponto_espelho_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  data date NOT NULL,
  entrada time,
  saida_intervalo time,
  retorno_intervalo time,
  saida time,
  minutos_trabalhados integer DEFAULT 0,
  atraso_min integer DEFAULT 0,
  falta boolean DEFAULT false,
  saida_antec_min integer DEFAULT 0,
  extra_min integer DEFAULT 0,
  noturno_min integer DEFAULT 0,
  saldo_banco_min integer DEFAULT 0,
  calculado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ponto_espelho_func_data ON public.ponto_espelho_diario(funcionario_id, data);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_espelho_diario TO authenticated;
GRANT ALL ON public.ponto_espelho_diario TO service_role;
ALTER TABLE public.ponto_espelho_diario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_espelho tenant" ON public.ponto_espelho_diario FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_funcionarios f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = funcionario_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_funcionarios f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = funcionario_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_espelho_upd BEFORE UPDATE ON public.ponto_espelho_diario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. AJUSTES
CREATE TABLE public.ponto_ajustes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  data date NOT NULL,
  tipo text NOT NULL DEFAULT 'inclusao',
  valor_proposto jsonb,
  motivo text NOT NULL,
  anexo_url text,
  status text NOT NULL DEFAULT 'pendente',
  solicitado_por uuid,
  aprovador_id uuid,
  aprovado_em timestamptz,
  comentario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_ajustes TO authenticated;
GRANT ALL ON public.ponto_ajustes TO service_role;
ALTER TABLE public.ponto_ajustes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_aj tenant" ON public.ponto_ajustes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_funcionarios f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = funcionario_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_funcionarios f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = funcionario_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_aj_upd BEFORE UPDATE ON public.ponto_ajustes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. ASSINATURAS ESPELHO
CREATE TABLE public.ponto_assinaturas_espelho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  mes_referencia date NOT NULL,
  hash text NOT NULL,
  assinado_em timestamptz NOT NULL DEFAULT now(),
  ip text,
  geo_lat numeric,
  geo_lon numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ponto_assin_func_mes ON public.ponto_assinaturas_espelho(funcionario_id, mes_referencia);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_assinaturas_espelho TO authenticated;
GRANT ALL ON public.ponto_assinaturas_espelho TO service_role;
ALTER TABLE public.ponto_assinaturas_espelho ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_assin tenant" ON public.ponto_assinaturas_espelho FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_funcionarios f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = funcionario_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_funcionarios f JOIN public.ponto_empresas e ON e.id=f.empresa_id WHERE f.id = funcionario_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- 14. ALERTAS ANTIFRAUDE
CREATE TABLE public.ponto_alertas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funcionario_id uuid REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  registro_id uuid REFERENCES public.ponto_registros(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  nivel text NOT NULL DEFAULT 'baixo',
  categoria text NOT NULL,
  descricao text NOT NULL,
  detalhes jsonb,
  resolvido boolean NOT NULL DEFAULT false,
  resolvido_por uuid,
  resolvido_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_alertas TO authenticated;
GRANT ALL ON public.ponto_alertas TO service_role;
ALTER TABLE public.ponto_alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_alert tenant" ON public.ponto_alertas FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- 15. AUDITORIA
CREATE TABLE public.ponto_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  usuario_id uuid,
  usuario_nome text,
  entidade text NOT NULL,
  entidade_id uuid,
  acao text NOT NULL,
  dados_anteriores jsonb,
  dados_novos jsonb,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ponto_aud_emp_dt ON public.ponto_auditoria(empresa_id, created_at DESC);
GRANT SELECT, INSERT ON public.ponto_auditoria TO authenticated;
GRANT ALL ON public.ponto_auditoria TO service_role;
ALTER TABLE public.ponto_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_aud tenant select" ON public.ponto_auditoria FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE POLICY "ponto_aud tenant insert" ON public.ponto_auditoria FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- 16. EXPORT LOGS (Domínio)
CREATE TABLE public.ponto_export_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  periodo_inicio date NOT NULL,
  periodo_fim date NOT NULL,
  formato text NOT NULL DEFAULT 'dominio_txt',
  arquivo_url text,
  arquivo_conteudo text,
  total_registros integer DEFAULT 0,
  total_funcionarios integer DEFAULT 0,
  status text NOT NULL DEFAULT 'gerado',
  gerado_por uuid,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_export_logs TO authenticated;
GRANT ALL ON public.ponto_export_logs TO service_role;
ALTER TABLE public.ponto_export_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_exp tenant" ON public.ponto_export_logs FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));

-- 17. RUBRICAS DOMÍNIO
CREATE TABLE public.ponto_rubricas_dominio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id uuid NOT NULL REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  evento text NOT NULL,
  codigo_rubrica text NOT NULL,
  descricao text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ponto_rub_emp_evento ON public.ponto_rubricas_dominio(empresa_id, evento);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_rubricas_dominio TO authenticated;
GRANT ALL ON public.ponto_rubricas_dominio TO service_role;
ALTER TABLE public.ponto_rubricas_dominio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_rub tenant" ON public.ponto_rubricas_dominio FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_rub_upd BEFORE UPDATE ON public.ponto_rubricas_dominio
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 18. PERMISSÕES PONTO
CREATE TABLE public.ponto_permissoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  empresa_id uuid REFERENCES public.ponto_empresas(id) ON DELETE CASCADE,
  filial_id uuid REFERENCES public.ponto_filiais(id) ON DELETE CASCADE,
  perfil text NOT NULL DEFAULT 'funcionario',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ponto_perm_user_emp ON public.ponto_permissoes(usuario_id, empresa_id, perfil);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_permissoes TO authenticated;
GRANT ALL ON public.ponto_permissoes TO service_role;
ALTER TABLE public.ponto_permissoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ponto_perm tenant" ON public.ponto_permissoes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ponto_empresas e WHERE e.id = empresa_id AND e.estabelecimento_id = public.get_auth_user_estabelecimento_id()));
CREATE TRIGGER trg_ponto_perm_upd BEFORE UPDATE ON public.ponto_permissoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
