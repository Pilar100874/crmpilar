-- Adicionar política de INSERT para envio_massa_config
CREATE POLICY "Usuários podem criar config do seu estabelecimento"
ON public.envio_massa_config
FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE id = get_current_usuario_id()
  )
);