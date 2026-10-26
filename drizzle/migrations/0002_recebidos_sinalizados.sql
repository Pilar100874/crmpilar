CREATE TABLE public.recebidos_sinalizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL DEFAULT public.get_current_usuario_id(),
  tipo text NOT NULL CHECK (tipo IN ('email','whatsapp')),
  ref_id text NOT NULL,
  marcado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, tipo, ref_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recebidos_sinalizados TO authenticated;
GRANT ALL ON public.recebidos_sinalizados TO service_role;
ALTER TABLE public.recebidos_sinalizados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia suas sinalizações" ON public.recebidos_sinalizados
FOR ALL TO authenticated
USING (usuario_id = public.get_current_usuario_id())
WITH CHECK (usuario_id = public.get_current_usuario_id());