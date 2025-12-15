-- Tabela para dispositivos de rastreamento (pendentes e aprovados)
CREATE TABLE public.dispositivos_rastreamento (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  device_uuid TEXT NOT NULL UNIQUE,
  nome_dispositivo TEXT,
  modelo TEXT,
  plataforma TEXT, -- android, ios, web
  veiculo_id UUID REFERENCES public.veiculos(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente, aprovado, bloqueado
  primeiro_acesso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ultimo_acesso TIMESTAMP WITH TIME ZONE,
  aprovado_por UUID REFERENCES public.usuarios(id),
  aprovado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_dispositivos_status ON public.dispositivos_rastreamento(status);
CREATE INDEX idx_dispositivos_device_uuid ON public.dispositivos_rastreamento(device_uuid);
CREATE INDEX idx_dispositivos_estabelecimento ON public.dispositivos_rastreamento(estabelecimento_id);

-- RLS
ALTER TABLE public.dispositivos_rastreamento ENABLE ROW LEVEL SECURITY;

-- Política para admins verem todos os dispositivos do estabelecimento
CREATE POLICY "Admins podem ver dispositivos do estabelecimento"
ON public.dispositivos_rastreamento
FOR SELECT
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
  OR public.is_system_admin()
);

-- Política para admins gerenciarem dispositivos
CREATE POLICY "Admins podem gerenciar dispositivos"
ON public.dispositivos_rastreamento
FOR ALL
TO authenticated
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE auth_user_id = auth.uid()
  )
  OR public.is_system_admin()
);

-- Política para inserção pública (auto-registro)
CREATE POLICY "Qualquer um pode registrar dispositivo"
ON public.dispositivos_rastreamento
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_dispositivos_rastreamento_updated_at
  BEFORE UPDATE ON public.dispositivos_rastreamento
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();