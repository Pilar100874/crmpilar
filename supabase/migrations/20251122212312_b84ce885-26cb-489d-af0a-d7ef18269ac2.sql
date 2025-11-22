-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own atalhos" ON public.user_atalhos;
DROP POLICY IF EXISTS "Users can insert their own atalhos" ON public.user_atalhos;
DROP POLICY IF EXISTS "Users can delete their own atalhos" ON public.user_atalhos;

-- Policies for user_atalhos to allow authenticated users to manage their own shortcuts
-- Enable RLS (no-op if already enabled)
ALTER TABLE public.user_atalhos ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own atalhos
CREATE POLICY "Users can view their own atalhos"
ON public.user_atalhos
FOR SELECT
TO authenticated
USING (
  usuario_id IN (
    SELECT id FROM public.usuarios
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
  )
);

-- Allow users to insert atalhos for themselves
CREATE POLICY "Users can insert their own atalhos"
ON public.user_atalhos
FOR INSERT
TO authenticated
WITH CHECK (
  usuario_id IN (
    SELECT id FROM public.usuarios
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
  )
);

-- Allow users to delete their own atalhos
CREATE POLICY "Users can delete their own atalhos"
ON public.user_atalhos
FOR DELETE
TO authenticated
USING (
  usuario_id IN (
    SELECT id FROM public.usuarios
    WHERE LOWER(email) = LOWER(auth.jwt() ->> 'email')
  )
);