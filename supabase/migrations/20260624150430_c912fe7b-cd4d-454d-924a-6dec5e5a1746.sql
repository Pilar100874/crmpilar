
-- 1. Push subscriptions
CREATE TABLE public.ponto_push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ultimo_uso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(funcionario_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_push_subscriptions TO authenticated;
GRANT ALL ON public.ponto_push_subscriptions TO service_role;
ALTER TABLE public.ponto_push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage own push" ON public.ponto_push_subscriptions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Anexos
CREATE TABLE public.ponto_anexos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  contexto TEXT NOT NULL,
  referencia_id UUID,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT,
  arquivo_tipo TEXT,
  arquivo_tamanho BIGINT,
  hash_sha256 TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_anexos TO authenticated;
GRANT ALL ON public.ponto_anexos TO service_role;
ALTER TABLE public.ponto_anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage anexos" ON public.ponto_anexos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Assinatura tokens
CREATE TABLE public.ponto_assinatura_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  espelho_id UUID,
  token_hash TEXT NOT NULL UNIQUE,
  codigo_2fa TEXT NOT NULL,
  canal_2fa TEXT NOT NULL DEFAULT 'email',
  tentativas INT NOT NULL DEFAULT 0,
  max_tentativas INT NOT NULL DEFAULT 5,
  expira_em TIMESTAMPTZ NOT NULL,
  validado_em TIMESTAMPTZ,
  ip_validacao INET,
  user_agent_validacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_assinatura_tokens TO authenticated;
GRANT ALL ON public.ponto_assinatura_tokens TO service_role;
ALTER TABLE public.ponto_assinatura_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage tokens" ON public.ponto_assinatura_tokens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. LGPD
CREATE TABLE public.ponto_lgpd_solicitacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.ponto_funcionarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  motivo TEXT,
  resposta TEXT,
  arquivo_resultado_url TEXT,
  prazo_resposta TIMESTAMPTZ,
  respondido_por UUID,
  respondido_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ponto_lgpd_solicitacoes TO authenticated;
GRANT ALL ON public.ponto_lgpd_solicitacoes TO service_role;
ALTER TABLE public.ponto_lgpd_solicitacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage lgpd" ON public.ponto_lgpd_solicitacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.ponto_lgpd_set_prazo()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.prazo_resposta IS NULL THEN
    NEW.prazo_resposta := now() + interval '15 days';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lgpd_prazo BEFORE INSERT OR UPDATE ON public.ponto_lgpd_solicitacoes
FOR EACH ROW EXECUTE FUNCTION public.ponto_lgpd_set_prazo();

-- Storage policies
CREATE POLICY "auth read ponto anexos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'ponto-anexos');
CREATE POLICY "auth upload ponto anexos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'ponto-anexos');
CREATE POLICY "auth update ponto anexos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'ponto-anexos');
CREATE POLICY "auth delete ponto anexos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'ponto-anexos');
