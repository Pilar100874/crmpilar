-- Permitir que qualquer usuário com role 'admin' ou 'gestor' veja dados globais
-- ajustando apenas políticas de SELECT, mantendo regras de escrita como estão.

-- 1) bot_flows: adicionar has_role() na política de SELECT
ALTER POLICY "View bot flows (admin email or same estab)"
ON public.bot_flows
USING (
  (
    (auth.jwt() ->> 'email') ~~* 'admin_%@sistema.local'
    OR EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
    OR estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR NOT roles_present()
);

-- 2) relatorios: adicionar has_role() na política principal de SELECT
ALTER POLICY "View relatorios (admin email or same estab)"
ON public.relatorios
USING (
  (
    (auth.jwt() ->> 'email') ~~* 'admin_%@sistema.local'
    OR EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
    OR estabelecimento_id = get_user_estabelecimento_id(auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR NOT roles_present()
);

-- 3) relatorios_importacao: duas políticas de SELECT
-- a) Users can view reports from their establishment
ALTER POLICY "Users can view reports from their establishment"
ON public.relatorios_importacao
USING (
  (
    estabelecimento_id IN (
      SELECT usuarios.estabelecimento_id
      FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR NOT roles_present()
);

-- b) Usuários podem visualizar relatórios do seu estabelecimento
ALTER POLICY "Usuários podem visualizar relatórios do seu estabelecimento"
ON public.relatorios_importacao
USING (
  (
    estabelecimento_id IN (
      SELECT usuarios.estabelecimento_id
      FROM usuarios
      WHERE usuarios.auth_user_id = auth.uid()
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
  OR NOT roles_present()
);

-- 4) omnichannel_flows: admins e gestores globais
ALTER POLICY "Usuarios autenticados podem ver flows de seu estabelecimento"
ON public.omnichannel_flows
USING (
  (
    estabelecimento_id IN (
      SELECT usuarios.estabelecimento_id
      FROM usuarios
      WHERE usuarios.auth_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR NOT roles_present()
);

-- 5) skills: admins e gestores globais
ALTER POLICY "Usuários podem ver skills"
ON public.skills
USING (
  (
    estabelecimento_id IN (
      SELECT usuarios.estabelecimento_id
      FROM usuarios
      WHERE usuarios.auth_user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid())
  )
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'gestor'::app_role)
  OR NOT roles_present()
);
