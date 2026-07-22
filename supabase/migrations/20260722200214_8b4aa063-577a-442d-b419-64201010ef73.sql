
DROP POLICY IF EXISTS "Usuario ve suas subscriptions" ON public.push_subscriptions;

DROP POLICY IF EXISTS "Usuarios autenticados podem aprovar dispositivos pendentes" ON public.dispositivos_rastreamento;
CREATE POLICY "Usuarios autenticados podem aprovar dispositivos pendentes"
ON public.dispositivos_rastreamento
FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND estabelecimento_id IS NULL
  AND status = 'pendente'
)
WITH CHECK (
  estabelecimento_id = get_auth_user_estabelecimento_id()
  AND usuario_id = (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid())
);
