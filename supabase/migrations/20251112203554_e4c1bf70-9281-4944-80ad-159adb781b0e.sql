-- Criar tabela de vínculos para contatos (customers) com usuários e segmentos
CREATE TABLE IF NOT EXISTS public.customer_vinculos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  usuario_id UUID,
  segmento_id UUID,
  estabelecimento_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_vinculos ENABLE ROW LEVEL SECURITY;

-- Policy para admins e gestores gerenciarem vínculos
CREATE POLICY "Admins and gestores can manage customer_vinculos"
ON public.customer_vinculos
FOR ALL
USING (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
  OR NOT roles_present()
)
WITH CHECK (
  estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  OR EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
  OR NOT roles_present()
);

-- Policy para usuários autenticados visualizarem vínculos
CREATE POLICY "Authenticated users can view customer_vinculos"
ON public.customer_vinculos
FOR SELECT
USING (true);