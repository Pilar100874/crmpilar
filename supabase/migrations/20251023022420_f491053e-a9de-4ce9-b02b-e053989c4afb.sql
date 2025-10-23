-- Create quick_replies table for pre-defined text messages
CREATE TABLE public.quick_replies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  grupo_acesso_id uuid REFERENCES public.grupos_acesso(id) ON DELETE CASCADE,
  is_global boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_replies ENABLE ROW LEVEL SECURITY;

-- Users can view their own quick replies and global ones for their group
CREATE POLICY "Users can view own and group quick replies"
ON public.quick_replies
FOR SELECT
USING (
  user_id = auth.uid() 
  OR (is_global = true AND grupo_acesso_id IN (
    SELECT grupo_acesso_id FROM public.usuarios WHERE id = auth.uid()
  ))
);

-- Users can manage their own quick replies
CREATE POLICY "Users can manage own quick replies"
ON public.quick_replies
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage global quick replies
CREATE POLICY "Admins can manage global quick replies"
ON public.quick_replies
FOR ALL
USING (
  is_global = true 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
)
WITH CHECK (
  is_global = true 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
);

-- Create quick_attachments table for quick access links and files
CREATE TABLE public.quick_attachments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('link', 'file')),
  url text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  grupo_acesso_id uuid REFERENCES public.grupos_acesso(id) ON DELETE CASCADE,
  is_global boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_attachments ENABLE ROW LEVEL SECURITY;

-- Users can view their own quick attachments and global ones for their group
CREATE POLICY "Users can view own and group quick attachments"
ON public.quick_attachments
FOR SELECT
USING (
  user_id = auth.uid() 
  OR (is_global = true AND grupo_acesso_id IN (
    SELECT grupo_acesso_id FROM public.usuarios WHERE id = auth.uid()
  ))
);

-- Users can manage their own quick attachments
CREATE POLICY "Users can manage own quick attachments"
ON public.quick_attachments
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admins can manage global quick attachments
CREATE POLICY "Admins can manage global quick attachments"
ON public.quick_attachments
FOR ALL
USING (
  is_global = true 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
)
WITH CHECK (
  is_global = true 
  AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'gestor'::app_role))
);

-- Create triggers for updated_at
CREATE TRIGGER update_quick_replies_updated_at
BEFORE UPDATE ON public.quick_replies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quick_attachments_updated_at
BEFORE UPDATE ON public.quick_attachments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();