-- Adicionar estabelecimento_id na tabela whatsapp_config
ALTER TABLE public.whatsapp_config 
ADD COLUMN IF NOT EXISTS estabelecimento_id UUID REFERENCES public.estabelecimentos(id) ON DELETE CASCADE;

-- Remover constraint de id único (permitir múltiplas configs)
ALTER TABLE public.whatsapp_config DROP CONSTRAINT IF EXISTS whatsapp_config_pkey;

-- Adicionar nova primary key composta
ALTER TABLE public.whatsapp_config 
ADD PRIMARY KEY (id);

-- Adicionar constraint única por estabelecimento
ALTER TABLE public.whatsapp_config 
ADD CONSTRAINT whatsapp_config_estabelecimento_unique UNIQUE (estabelecimento_id);

-- Atualizar RLS policies
DROP POLICY IF EXISTS "Allow all operations on whatsapp_config" ON public.whatsapp_config;

-- Policy para visualizar configurações do mesmo estabelecimento
CREATE POLICY "Users can view whatsapp config from same estabelecimento"
ON public.whatsapp_config
FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);

-- Policy para gerenciar configurações (admin e gestor do estabelecimento)
CREATE POLICY "Admins and gestores can manage whatsapp config"
ON public.whatsapp_config
FOR ALL
USING (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
)
WITH CHECK (
  (
    estabelecimento_id IN (
      SELECT estabelecimento_id FROM public.usuarios WHERE id = auth.uid()
    )
    AND (
      has_role(auth.uid(), 'admin'::app_role) 
      OR has_role(auth.uid(), 'gestor'::app_role)
    )
  )
  OR EXISTS (
    SELECT 1 FROM public.administradores WHERE id = auth.uid()
  )
  OR NOT roles_present()
);