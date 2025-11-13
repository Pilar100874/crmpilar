-- Calendario tarefas: permitir admins verem todas as tarefas
-- 1) Garantir RLS habilitado
ALTER TABLE public.calendario_tarefas ENABLE ROW LEVEL SECURITY;

-- 2) Política: Admin por e-mail pode ver todas as tarefas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'calendario_tarefas' 
      AND policyname = 'Admin email can view all tasks'
  ) THEN
    CREATE POLICY "Admin email can view all tasks"
      ON public.calendario_tarefas
      FOR SELECT
      TO authenticated
      USING ((auth.jwt() ->> 'email') ILIKE 'admin_%@sistema.local');
  END IF;
END $$;

-- 3) Política: Usuários presentes na tabela administradores podem ver todas as tarefas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'calendario_tarefas' 
      AND policyname = 'Administradores table can view all tasks'
  ) THEN
    CREATE POLICY "Administradores table can view all tasks"
      ON public.calendario_tarefas
      FOR SELECT
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.administradores a
        WHERE a.id = auth.uid()
      ));
  END IF;
END $$;

-- 4) Já existe política para has_role('admin'): mantida; e política de ver próprias tarefas
-- Nada mais a fazer