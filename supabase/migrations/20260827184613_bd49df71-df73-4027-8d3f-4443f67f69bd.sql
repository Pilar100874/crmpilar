ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS is_porteiro boolean NOT NULL DEFAULT false;

-- Marca usuários que já eram porteiros
UPDATE public.usuarios u
SET is_porteiro = true
FROM public.porteiros p
WHERE p.ativo = true AND p.user_id IS NOT NULL AND u.auth_user_id = p.user_id;

-- Remove FKs para a tabela antiga e reaponta registros para usuarios.id quando possível
ALTER TABLE public.livro_ocorrencias DROP CONSTRAINT IF EXISTS livro_ocorrencias_porteiro_id_fkey;
ALTER TABLE public.livro_encomendas DROP CONSTRAINT IF EXISTS livro_encomendas_porteiro_id_fkey;
ALTER TABLE public.transp_movimentos DROP CONSTRAINT IF EXISTS transp_movimentos_porteiro_entrada_id_fkey;
ALTER TABLE public.transp_movimentos DROP CONSTRAINT IF EXISTS transp_movimentos_porteiro_saida_id_fkey;
ALTER TABLE public.vis_access_records DROP CONSTRAINT IF EXISTS vis_access_records_porteiro_entrada_id_fkey;
ALTER TABLE public.vis_access_records DROP CONSTRAINT IF EXISTS vis_access_records_porteiro_saida_id_fkey;
ALTER TABLE public.cv_vehicle_movements DROP CONSTRAINT IF EXISTS cv_vehicle_movements_porteiro_saida_id_fkey;
ALTER TABLE public.cv_vehicle_movements DROP CONSTRAINT IF EXISTS cv_vehicle_movements_porteiro_entrada_id_fkey;

UPDATE public.livro_ocorrencias t SET porteiro_id = u.id
FROM public.porteiros p JOIN public.usuarios u ON u.auth_user_id = p.user_id
WHERE t.porteiro_id = p.id;

UPDATE public.livro_encomendas t SET porteiro_id = u.id
FROM public.porteiros p JOIN public.usuarios u ON u.auth_user_id = p.user_id
WHERE t.porteiro_id = p.id;

UPDATE public.transp_movimentos t SET porteiro_entrada_id = u.id
FROM public.porteiros p JOIN public.usuarios u ON u.auth_user_id = p.user_id
WHERE t.porteiro_entrada_id = p.id;

UPDATE public.transp_movimentos t SET porteiro_saida_id = u.id
FROM public.porteiros p JOIN public.usuarios u ON u.auth_user_id = p.user_id
WHERE t.porteiro_saida_id = p.id;

UPDATE public.vis_access_records t SET porteiro_entrada_id = u.id
FROM public.porteiros p JOIN public.usuarios u ON u.auth_user_id = p.user_id
WHERE t.porteiro_entrada_id = p.id;

UPDATE public.vis_access_records t SET porteiro_saida_id = u.id
FROM public.porteiros p JOIN public.usuarios u ON u.auth_user_id = p.user_id
WHERE t.porteiro_saida_id = p.id;

UPDATE public.cv_vehicle_movements t SET porteiro_entrada_id = u.id
FROM public.porteiros p JOIN public.usuarios u ON u.auth_user_id = p.user_id
WHERE t.porteiro_entrada_id = p.id;

UPDATE public.cv_vehicle_movements t SET porteiro_saida_id = u.id
FROM public.porteiros p JOIN public.usuarios u ON u.auth_user_id = p.user_id
WHERE t.porteiro_saida_id = p.id;

DROP TABLE IF EXISTS public.porteiros CASCADE;