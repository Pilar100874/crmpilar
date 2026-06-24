
-- 1. Fila eSocial com retry + DLQ
CREATE TABLE public.ponto_esocial_fila (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evento_id UUID REFERENCES public.ponto_esocial_eventos(id) ON DELETE CASCADE,
  tipo_evento TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente|processando|sucesso|falha|dlq
  tentativas INT NOT NULL DEFAULT 0,
  max_tentativas INT NOT NULL DEFAULT 5,
  proxima_tentativa TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_erro TEXT,
  ultimo_codigo TEXT,
  movido_dlq_em TIMESTAMPTZ,
  processado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_esocial_fila_pending ON public.ponto_esocial_fila(status, proxima_tentativa) WHERE status IN ('pendente','falha');
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_esocial_fila TO authenticated;
GRANT ALL ON public.ponto_esocial_fila TO service_role;
ALTER TABLE public.ponto_esocial_fila ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage esocial fila" ON public.ponto_esocial_fila FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Idempotência por NSR (REP – Portaria 671/2021 §74)
CREATE UNIQUE INDEX IF NOT EXISTS uq_ponto_registros_equip_nsr
  ON public.ponto_registros (equipamento_id, nsr)
  WHERE equipamento_id IS NOT NULL AND nsr IS NOT NULL;

-- 3. Backups AFD/AEJ
CREATE TABLE public.ponto_backups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'afd','aej','espelho','aud'
  empresa_id UUID,
  competencia DATE,
  arquivo_url TEXT NOT NULL,
  destino TEXT NOT NULL DEFAULT 'storage', -- storage|s3|gcs
  hash_sha256 TEXT NOT NULL,
  tamanho_bytes BIGINT,
  retencao_ate DATE NOT NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_backups_retencao ON public.ponto_backups(retencao_ate);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_backups TO authenticated;
GRANT ALL ON public.ponto_backups TO service_role;
ALTER TABLE public.ponto_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage backups" ON public.ponto_backups FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. 2FA sessões verificadas para aprovadores
CREATE TABLE public.ponto_aprovador_2fa (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL,
  codigo TEXT NOT NULL,
  canal TEXT NOT NULL DEFAULT 'email',
  tentativas INT NOT NULL DEFAULT 0,
  expira_em TIMESTAMPTZ NOT NULL,
  validado_em TIMESTAMPTZ,
  ip INET,
  user_agent TEXT,
  contexto TEXT, -- aprovacao|ajuste_critico|fechamento
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_aprovador_2fa_user ON public.ponto_aprovador_2fa(usuario_id, validado_em);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_aprovador_2fa TO authenticated;
GRANT ALL ON public.ponto_aprovador_2fa TO service_role;
ALTER TABLE public.ponto_aprovador_2fa ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage 2fa" ON public.ponto_aprovador_2fa FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Sessões de kiosk (totens)
CREATE TABLE public.ponto_kiosk_sessoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipamento_id UUID REFERENCES public.ponto_equipamentos(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL UNIQUE,
  pin_hash TEXT NOT NULL,
  modo TEXT NOT NULL DEFAULT 'batida', -- batida|consulta|admin
  geofence_id UUID,
  ip_permitido INET[],
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_heartbeat TIMESTAMPTZ,
  versao_app TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_kiosk_sessoes TO authenticated;
GRANT ALL ON public.ponto_kiosk_sessoes TO service_role;
ALTER TABLE public.ponto_kiosk_sessoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage kiosk" ON public.ponto_kiosk_sessoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Função helper: verificar se aprovador tem 2FA válido nos últimos 30 min
CREATE OR REPLACE FUNCTION public.ponto_aprovador_2fa_valido(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.ponto_aprovador_2fa
    WHERE usuario_id = _user_id
      AND validado_em IS NOT NULL
      AND validado_em > now() - interval '30 minutes'
  );
$$;
