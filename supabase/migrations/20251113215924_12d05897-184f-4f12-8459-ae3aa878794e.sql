-- Ensure RLS and add admin visibility for calendario_tarefas
-- 1) Enable RLS on calendario_tarefas
ALTER TABLE public.calendario_tarefas ENABLE ROW LEVEL SECURITY;

-- 2) Allow each user to view their own tasks (if not already present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'calendario_tarefas' 
      AND policyname = 'Users can view own tasks'
  ) THEN
    CREATE POLICY "Users can view own tasks"
      ON public.calendario_tarefas
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- 3) Allow admins to view all tasks using public.has_role(auth.uid(), 'admin')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'calendario_tarefas' 
      AND policyname = 'Admins can view all tasks'
  ) THEN
    CREATE POLICY "Admins can view all tasks"
      ON public.calendario_tarefas
      FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;