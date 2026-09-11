DROP POLICY IF EXISTS "Delete stages (admin email bypass)" ON public.funil_stages;
DROP POLICY IF EXISTS "Insert stages (admin email bypass)" ON public.funil_stages;
DROP POLICY IF EXISTS "Update stages (admin email bypass)" ON public.funil_stages;
DROP POLICY IF EXISTS "View stages (same estab or admin)" ON public.funil_stages;

CREATE POLICY "funil_stages_select_tenant"
ON public.funil_stages
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.funis f
    WHERE f.id = funil_stages.funil_id
      AND f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
  )
);

CREATE POLICY "funil_stages_insert_tenant_manager"
ON public.funil_stages
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.funis f
    WHERE f.id = funil_stages.funil_id
      AND f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
      AND public.has_role(auth.uid(), 'gestor'::public.app_role)
  )
);

CREATE POLICY "funil_stages_update_tenant_manager"
ON public.funil_stages
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.funis f
    WHERE f.id = funil_stages.funil_id
      AND f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
      AND public.has_role(auth.uid(), 'gestor'::public.app_role)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.funis f
    WHERE f.id = funil_stages.funil_id
      AND f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
      AND public.has_role(auth.uid(), 'gestor'::public.app_role)
  )
);

CREATE POLICY "funil_stages_delete_tenant_manager"
ON public.funil_stages
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR EXISTS (
    SELECT 1 FROM public.funis f
    WHERE f.id = funil_stages.funil_id
      AND f.estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
      AND public.has_role(auth.uid(), 'gestor'::public.app_role)
  )
);

DROP POLICY IF EXISTS "Manage orcamento itens (flexible)" ON public.orcamento_itens;

DROP POLICY IF EXISTS "Delete webhooks entrada (admin email or same estab)" ON public.webhooks_entrada;
DROP POLICY IF EXISTS "Insert webhooks entrada (admin email or same estab)" ON public.webhooks_entrada;
DROP POLICY IF EXISTS "Update webhooks entrada (admin email or same estab)" ON public.webhooks_entrada;
DROP POLICY IF EXISTS "View webhooks entrada (admin email or same estab)" ON public.webhooks_entrada;

CREATE POLICY "webhooks_entrada_select_tenant"
ON public.webhooks_entrada
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
);

CREATE POLICY "webhooks_entrada_insert_tenant_manager"
ON public.webhooks_entrada
FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND public.has_role(auth.uid(), 'gestor'::public.app_role)
  )
);

CREATE POLICY "webhooks_entrada_update_tenant_manager"
ON public.webhooks_entrada
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND public.has_role(auth.uid(), 'gestor'::public.app_role)
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND public.has_role(auth.uid(), 'gestor'::public.app_role)
  )
);

CREATE POLICY "webhooks_entrada_delete_tenant_manager"
ON public.webhooks_entrada
FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  OR (
    estabelecimento_id = public.get_user_estabelecimento_id(auth.uid())
    AND public.has_role(auth.uid(), 'gestor'::public.app_role)
  )
);