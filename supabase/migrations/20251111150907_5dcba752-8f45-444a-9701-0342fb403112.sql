-- Allow admin_%@sistema.local to view all conversations (dev/admin bypass)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'conversations' 
        AND policyname = 'View conversations (admin email bypass)'
    ) THEN
        CREATE POLICY "View conversations (admin email bypass)"
        ON public.conversations
        FOR SELECT
        USING (((auth.jwt() ->> 'email') ~~* 'admin_%@sistema.local'));
    END IF;
END $$;
