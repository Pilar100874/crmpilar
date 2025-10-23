-- Drop existing policies for quick_replies
DROP POLICY IF EXISTS "Users can view own and group quick replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Users can manage own quick replies" ON public.quick_replies;
DROP POLICY IF EXISTS "Admins can manage global quick replies" ON public.quick_replies;

-- Recreate policies with proper role checking
-- Users can view their own quick replies and global ones for their group
CREATE POLICY "Users can view own and group quick replies"
ON public.quick_replies
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() 
    OR (is_global = true AND grupo_acesso_id IN (
      SELECT grupo_acesso_id FROM public.usuarios WHERE id = auth.uid()
    ))
    OR (is_global = true AND grupo_acesso_id IS NULL)
  )
);

-- Users can manage their own quick replies
CREATE POLICY "Users can manage own quick replies"
ON public.quick_replies
FOR ALL
USING (user_id = auth.uid() AND is_global = false)
WITH CHECK (user_id = auth.uid() AND is_global = false);

-- Admins and gestores can manage global quick replies (or anyone if no roles exist)
CREATE POLICY "Admins can manage global quick replies"
ON public.quick_replies
FOR ALL
USING (
  auth.uid() IS NOT NULL AND is_global = true 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present())
)
WITH CHECK (
  auth.uid() IS NOT NULL AND is_global = true 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present())
);

-- Drop existing policies for quick_attachments
DROP POLICY IF EXISTS "Users can view own and group quick attachments" ON public.quick_attachments;
DROP POLICY IF EXISTS "Users can manage own quick attachments" ON public.quick_attachments;
DROP POLICY IF EXISTS "Admins can manage global quick attachments" ON public.quick_attachments;

-- Recreate policies for quick_attachments with proper role checking
-- Users can view their own quick attachments and global ones for their group
CREATE POLICY "Users can view own and group quick attachments"
ON public.quick_attachments
FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    user_id = auth.uid() 
    OR (is_global = true AND grupo_acesso_id IN (
      SELECT grupo_acesso_id FROM public.usuarios WHERE id = auth.uid()
    ))
    OR (is_global = true AND grupo_acesso_id IS NULL)
  )
);

-- Users can manage their own quick attachments
CREATE POLICY "Users can manage own quick attachments"
ON public.quick_attachments
FOR ALL
USING (user_id = auth.uid() AND is_global = false)
WITH CHECK (user_id = auth.uid() AND is_global = false);

-- Admins and gestores can manage global quick attachments (or anyone if no roles exist)
CREATE POLICY "Admins can manage global quick attachments"
ON public.quick_attachments
FOR ALL
USING (
  auth.uid() IS NOT NULL AND is_global = true 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present())
)
WITH CHECK (
  auth.uid() IS NOT NULL AND is_global = true 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role) OR NOT roles_present())
);