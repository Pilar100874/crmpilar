ALTER TABLE public.usuarios ADD COLUMN operador_maquina boolean NOT NULL DEFAULT false;
ALTER TABLE public.usuarios ADD COLUMN setor_produtivo boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.usuarios.operador_maquina IS 'Usuário é operador de máquina; só operadores aparecem no vínculo máquina x usuário (produção).';
COMMENT ON COLUMN public.usuarios.setor_produtivo IS 'Usuário pertence ao setor produtivo.';