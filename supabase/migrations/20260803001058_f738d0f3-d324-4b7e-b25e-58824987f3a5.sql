-- 1. agent-knowledge-base: leitura restrita ao estabelecimento
DROP POLICY IF EXISTS "Authenticated users can read KB files" ON storage.objects;
CREATE POLICY "Tenant read agent-knowledge-base"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'agent-knowledge-base'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = (public.get_auth_user_estabelecimento_id())::text)
);

-- 2. aip-skills: escopo por pasta do estabelecimento
DROP POLICY IF EXISTS "Autenticados leem arquivos de skills" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados enviam arquivos de skills" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados atualizam arquivos de skills" ON storage.objects;
DROP POLICY IF EXISTS "Autenticados removem arquivos de skills" ON storage.objects;

CREATE POLICY "Tenant read aip-skills"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'aip-skills'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = (public.get_auth_user_estabelecimento_id())::text)
);
CREATE POLICY "Tenant insert aip-skills"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'aip-skills'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = (public.get_auth_user_estabelecimento_id())::text)
);
CREATE POLICY "Tenant update aip-skills"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'aip-skills'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = (public.get_auth_user_estabelecimento_id())::text)
)
WITH CHECK (
  bucket_id = 'aip-skills'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = (public.get_auth_user_estabelecimento_id())::text)
);
CREATE POLICY "Tenant delete aip-skills"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'aip-skills'
  AND (public.is_system_admin() OR (storage.foldername(name))[1] = (public.get_auth_user_estabelecimento_id())::text)
);

-- 3. chat-attachments: exclusão apenas pelo dono do arquivo
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios anexos" ON storage.objects;
CREATE POLICY "Owner or admin delete chat-attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (owner = auth.uid() OR public.is_system_admin())
);

-- 4. support-tickets: upload apenas na pasta do próprio usuário
DROP POLICY IF EXISTS "support tickets upload" ON storage.objects;
CREATE POLICY "support tickets upload own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'support-tickets'
  AND (
    public.is_system_admin()
    OR (storage.foldername(name))[1] = (public.get_current_usuario_id())::text
    OR (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- 5. global_variables: escopo por estabelecimento
ALTER TABLE public.global_variables
  ADD COLUMN IF NOT EXISTS estabelecimento_id uuid DEFAULT public.get_auth_user_estabelecimento_id();

UPDATE public.global_variables
SET estabelecimento_id = (SELECT id FROM public.estabelecimentos ORDER BY created_at ASC LIMIT 1)
WHERE estabelecimento_id IS NULL;

DROP POLICY IF EXISTS "Auth insert global_variables" ON public.global_variables;
DROP POLICY IF EXISTS "Auth update global_variables" ON public.global_variables;
DROP POLICY IF EXISTS "Auth delete global_variables" ON public.global_variables;
DROP POLICY IF EXISTS "Auth view global_variables" ON public.global_variables;

CREATE POLICY "Tenant view global_variables"
ON public.global_variables FOR SELECT TO authenticated
USING (public.is_system_admin() OR estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Tenant insert global_variables"
ON public.global_variables FOR INSERT TO authenticated
WITH CHECK (public.is_system_admin() OR estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Tenant update global_variables"
ON public.global_variables FOR UPDATE TO authenticated
USING (public.is_system_admin() OR estabelecimento_id = public.get_auth_user_estabelecimento_id())
WITH CHECK (public.is_system_admin() OR estabelecimento_id = public.get_auth_user_estabelecimento_id());
CREATE POLICY "Tenant delete global_variables"
ON public.global_variables FOR DELETE TO authenticated
USING (public.is_system_admin() OR estabelecimento_id = public.get_auth_user_estabelecimento_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_variables TO authenticated;
GRANT ALL ON public.global_variables TO service_role;