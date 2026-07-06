
-- =========================================================
-- Função auxiliar: distância Haversine em metros
-- =========================================================
CREATE OR REPLACE FUNCTION public.visita_haversine_metros(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) RETURNS double precision
LANGUAGE sql IMMUTABLE
AS $$
  SELECT 2 * 6371000 * asin(
    sqrt(
      sin(radians((lat2 - lat1) / 2)) ^ 2 +
      cos(radians(lat1)) * cos(radians(lat2)) *
      sin(radians((lng2 - lng1) / 2)) ^ 2
    )
  );
$$;

-- =========================================================
-- 1) Regras de monitoramento de visita
-- =========================================================
CREATE TABLE public.visita_regras_monitoramento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  nome text NOT NULL,
  escopo text NOT NULL DEFAULT 'global' CHECK (escopo IN ('global','usuario','filial')),
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE CASCADE,
  filial_id uuid,
  fonte_localizacao text NOT NULL DEFAULT 'ambos' CHECK (fonte_localizacao IN ('veiculo','celular','ambos')),
  raio_metros integer NOT NULL DEFAULT 150 CHECK (raio_metros > 0),
  tempo_minimo_min integer NOT NULL DEFAULT 5 CHECK (tempo_minimo_min >= 0),
  exigir_janela_horario boolean NOT NULL DEFAULT false,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visita_regras_monitoramento TO authenticated;
GRANT ALL ON public.visita_regras_monitoramento TO service_role;

ALTER TABLE public.visita_regras_monitoramento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visita_regras_select_estab" ON public.visita_regras_monitoramento
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "visita_regras_insert_estab" ON public.visita_regras_monitoramento
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "visita_regras_update_estab" ON public.visita_regras_monitoramento
  FOR UPDATE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "visita_regras_delete_estab" ON public.visita_regras_monitoramento
  FOR DELETE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_visita_regras_updated_at
  BEFORE UPDATE ON public.visita_regras_monitoramento
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_visita_regras_estab ON public.visita_regras_monitoramento(estabelecimento_id);
CREATE INDEX idx_visita_regras_usuario ON public.visita_regras_monitoramento(usuario_id);

-- =========================================================
-- 2) Programação de visitas
-- =========================================================
CREATE TABLE public.visita_programacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  cliente_nome text NOT NULL,
  endereco text NOT NULL,
  lat double precision,
  lng double precision,
  responsavel_tipo text NOT NULL DEFAULT 'usuario' CHECK (responsavel_tipo IN ('usuario','filial','todos')),
  responsavel_usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  filial_id uuid,
  frequencia_tipo text NOT NULL CHECK (frequencia_tipo IN ('dia','semana','mes','intervalo_dias')),
  frequencia_qtd integer NOT NULL DEFAULT 1 CHECK (frequencia_qtd > 0),
  intervalo_dias integer,
  dias_semana integer[] NOT NULL DEFAULT ARRAY[1,2,3,4,5],
  hora_inicio time NOT NULL DEFAULT '08:00',
  hora_fim time NOT NULL DEFAULT '18:00',
  data_inicio date NOT NULL DEFAULT CURRENT_DATE,
  data_fim date,
  regra_monitoramento_id uuid REFERENCES public.visita_regras_monitoramento(id) ON DELETE SET NULL,
  observacao text,
  ativa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visita_programacoes TO authenticated;
GRANT ALL ON public.visita_programacoes TO service_role;

ALTER TABLE public.visita_programacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visita_prog_select_estab" ON public.visita_programacoes
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "visita_prog_insert_estab" ON public.visita_programacoes
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "visita_prog_update_estab" ON public.visita_programacoes
  FOR UPDATE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "visita_prog_delete_estab" ON public.visita_programacoes
  FOR DELETE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_visita_prog_updated_at
  BEFORE UPDATE ON public.visita_programacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_visita_prog_estab ON public.visita_programacoes(estabelecimento_id);
CREATE INDEX idx_visita_prog_customer ON public.visita_programacoes(customer_id);
CREATE INDEX idx_visita_prog_responsavel ON public.visita_programacoes(responsavel_usuario_id);
CREATE INDEX idx_visita_prog_ativa ON public.visita_programacoes(ativa) WHERE ativa = true;

-- =========================================================
-- 3) Ocorrências de visita (visita esperada por data)
-- =========================================================
CREATE TABLE public.visita_ocorrencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  programacao_id uuid NOT NULL REFERENCES public.visita_programacoes(id) ON DELETE CASCADE,
  usuario_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  data_prevista date NOT NULL,
  janela_inicio time NOT NULL,
  janela_fim time NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','realizada','nao_realizada','fora_horario','atrasada')),
  verificada_em timestamptz,
  hora_chegada timestamptz,
  hora_saida timestamptz,
  duracao_min integer,
  fonte_deteccao text CHECK (fonte_deteccao IN ('veiculo','celular')),
  veiculo_id uuid,
  distancia_metros double precision,
  lat_registro double precision,
  lng_registro double precision,
  observacao_auto text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.visita_ocorrencias TO authenticated;
GRANT ALL ON public.visita_ocorrencias TO service_role;

ALTER TABLE public.visita_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visita_oco_select_estab" ON public.visita_ocorrencias
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "visita_oco_insert_estab" ON public.visita_ocorrencias
  FOR INSERT TO authenticated
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "visita_oco_update_estab" ON public.visita_ocorrencias
  FOR UPDATE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id())
  WITH CHECK (estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "visita_oco_delete_estab" ON public.visita_ocorrencias
  FOR DELETE TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

CREATE TRIGGER trg_visita_oco_updated_at
  BEFORE UPDATE ON public.visita_ocorrencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX uq_visita_oco_prog_usuario_data
  ON public.visita_ocorrencias(programacao_id, COALESCE(usuario_id, '00000000-0000-0000-0000-000000000000'::uuid), data_prevista);
CREATE INDEX idx_visita_oco_estab_data ON public.visita_ocorrencias(estabelecimento_id, data_prevista);
CREATE INDEX idx_visita_oco_status ON public.visita_ocorrencias(status);
CREATE INDEX idx_visita_oco_usuario_data ON public.visita_ocorrencias(usuario_id, data_prevista);

ALTER PUBLICATION supabase_realtime ADD TABLE public.visita_ocorrencias;

-- =========================================================
-- 4) Posições do celular do usuário (via CRM PWA/APK)
-- =========================================================
CREATE TABLE public.usuario_posicoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estabelecimento_id uuid NOT NULL,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy double precision,
  bateria integer,
  origem text DEFAULT 'pwa',
  data_hora timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.usuario_posicoes TO authenticated;
GRANT ALL ON public.usuario_posicoes TO service_role;

ALTER TABLE public.usuario_posicoes ENABLE ROW LEVEL SECURITY;

-- Todos do mesmo estabelecimento podem ler (para supervisão/relatórios)
CREATE POLICY "usuario_pos_select_estab" ON public.usuario_posicoes
  FOR SELECT TO authenticated
  USING (estabelecimento_id = public.get_auth_user_estabelecimento_id());

-- Usuário só insere a própria posição
CREATE POLICY "usuario_pos_insert_own" ON public.usuario_posicoes
  FOR INSERT TO authenticated
  WITH CHECK (
    estabelecimento_id = public.get_auth_user_estabelecimento_id()
    AND usuario_id = public.get_current_usuario_id()
  );

-- Usuário só apaga a própria posição (limpeza opcional)
CREATE POLICY "usuario_pos_delete_own" ON public.usuario_posicoes
  FOR DELETE TO authenticated
  USING (usuario_id = public.get_current_usuario_id());

CREATE INDEX idx_usuario_pos_usuario_data ON public.usuario_posicoes(usuario_id, data_hora DESC);
CREATE INDEX idx_usuario_pos_estab_data ON public.usuario_posicoes(estabelecimento_id, data_hora DESC);
