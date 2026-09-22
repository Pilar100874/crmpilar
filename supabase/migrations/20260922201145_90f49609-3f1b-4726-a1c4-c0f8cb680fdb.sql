DROP POLICY IF EXISTS "Usuários do mesmo estabelecimento podem ver tarefas" ON public.calendario_tarefas;
CREATE POLICY "Usuarios veem tarefas do seu estabelecimento"
ON public.calendario_tarefas FOR SELECT TO authenticated
USING (estabelecimento_id = public.get_user_estabelecimento_id(auth.uid()));