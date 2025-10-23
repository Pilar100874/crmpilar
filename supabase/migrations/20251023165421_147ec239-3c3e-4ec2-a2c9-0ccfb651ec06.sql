-- Ajustar política de grupos_acesso para permitir administradores criarem sem restrição de estabelecimento

DROP POLICY IF EXISTS "Users can manage grupos_acesso from same estabelecimento" ON public.grupos_acesso;

-- SELECT: admins ou usuários do mesmo estabelecimento
CREATE POLICY "Users can view grupos_acesso"
ON public.grupos_acesso
FOR SELECT
USING (
  -- Administradores podem ver tudo
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR
  -- Usuários veem apenas do seu estabelecimento
  (estabelecimento_id IN (
    SELECT usuarios.estabelecimento_id
    FROM usuarios
    WHERE usuarios.id = auth.uid()
  ))
);

-- INSERT: admins autenticados ou usuários com role adequada
CREATE POLICY "Users can insert grupos_acesso"
ON public.grupos_acesso
FOR INSERT
WITH CHECK (
  -- Administradores podem inserir em qualquer estabelecimento
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR
  -- Usuários com role admin/gestor do mesmo estabelecimento
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND
    estabelecimento_id IN (
      SELECT usuarios.estabelecimento_id
      FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
  )
);

-- UPDATE: mesmas regras de INSERT
CREATE POLICY "Users can update grupos_acesso"
ON public.grupos_acesso
FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND
    estabelecimento_id IN (
      SELECT usuarios.estabelecimento_id
      FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
  )
)
WITH CHECK (
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND
    estabelecimento_id IN (
      SELECT usuarios.estabelecimento_id
      FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
  )
);

-- DELETE: mesmas regras
CREATE POLICY "Users can delete grupos_acesso"
ON public.grupos_acesso
FOR DELETE
USING (
  (EXISTS (SELECT 1 FROM administradores WHERE administradores.id = auth.uid()))
  OR
  (
    (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
    AND
    estabelecimento_id IN (
      SELECT usuarios.estabelecimento_id
      FROM usuarios
      WHERE usuarios.id = auth.uid()
    )
  )
);