
CREATE TABLE public.veiculo_comandos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  estabelecimento_id UUID NOT NULL,
  comando TEXT NOT NULL CHECK (comando IN ('bloquear_combustivel','desbloquear_combustivel','localizar','reiniciar')),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','enviado','executado','erro')),
  criado_por UUID,
  resposta TEXT,
  executado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_veiculo_comandos_veiculo ON public.veiculo_comandos(veiculo_id, created_at DESC);
CREATE INDEX idx_veiculo_comandos_estab ON public.veiculo_comandos(estabelecimento_id, status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.veiculo_comandos TO authenticated;
GRANT ALL ON public.veiculo_comandos TO service_role;

ALTER TABLE public.veiculo_comandos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários do estabelecimento veem comandos"
ON public.veiculo_comandos FOR SELECT TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

CREATE POLICY "Usuários do estabelecimento criam comandos"
ON public.veiculo_comandos FOR INSERT TO authenticated
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

CREATE POLICY "Usuários do estabelecimento atualizam comandos"
ON public.veiculo_comandos FOR UPDATE TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()))
WITH CHECK (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

CREATE POLICY "Usuários do estabelecimento excluem comandos"
ON public.veiculo_comandos FOR DELETE TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));

CREATE TRIGGER trg_veiculo_comandos_updated
BEFORE UPDATE ON public.veiculo_comandos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
