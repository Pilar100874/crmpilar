ALTER TABLE public.sip_config_usuario ADD COLUMN IF NOT EXISTS usuario_id uuid;

UPDATE public.sip_config_usuario sc
SET usuario_id = u.id
FROM public.usuarios u
WHERE sc.usuario_id IS NULL
  AND sc.user_id = u.auth_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS sip_config_usuario_usuario_id_key
ON public.sip_config_usuario (usuario_id)
WHERE usuario_id IS NOT NULL;

DROP POLICY IF EXISTS "Usuario gerencia sua config sip" ON public.sip_config_usuario;
CREATE POLICY "Usuario gerencia sua config sip"
ON public.sip_config_usuario FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = sip_config_usuario.usuario_id
      AND u.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.usuarios u
    WHERE u.id = sip_config_usuario.usuario_id
      AND u.auth_user_id = auth.uid()
  )
);

ALTER TABLE public.sip_config_usuario DROP CONSTRAINT IF EXISTS sip_config_usuario_user_id_fkey;