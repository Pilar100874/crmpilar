-- 1) Mapeia filiais antigas -> unidades
CREATE TEMP TABLE _map AS
SELECT f.id AS filial_id,
       (SELECT u.id FROM public.unidades u
        WHERE upper(u.nome) = CASE
          WHEN upper(f.nome) LIKE '%MATRIZ%' THEN 'SP EMBU'
          WHEN upper(f.nome) LIKE '%BAURU%' THEN 'SP BAURU'
          ELSE upper(replace(f.nome, 'PILAR PAPEIS - ', ''))
        END
        ORDER BY u.id LIMIT 1) AS unidade_id
FROM public.ponto_filiais f;

-- 2) Remove FKs antigas
ALTER TABLE public.cv_cameras DROP CONSTRAINT IF EXISTS cv_cameras_filial_id_fkey;
ALTER TABLE public.ponto_departamentos DROP CONSTRAINT IF EXISTS ponto_departamentos_filial_id_fkey;
ALTER TABLE public.ponto_funcionarios DROP CONSTRAINT IF EXISTS ponto_funcionarios_filial_id_fkey;
ALTER TABLE public.ponto_equipamentos DROP CONSTRAINT IF EXISTS ponto_equipamentos_filial_id_fkey;
ALTER TABLE public.ponto_permissoes DROP CONSTRAINT IF EXISTS ponto_permissoes_filial_id_fkey;
ALTER TABLE public.ponto_geofences DROP CONSTRAINT IF EXISTS ponto_geofences_filial_id_fkey;
ALTER TABLE public.ponto_redes_autorizadas DROP CONSTRAINT IF EXISTS ponto_redes_autorizadas_filial_id_fkey;
ALTER TABLE public.ponto_funcionario_vinculos DROP CONSTRAINT IF EXISTS ponto_funcionario_vinculos_filial_id_fkey;
ALTER TABLE public.ponto_equipes DROP CONSTRAINT IF EXISTS ponto_equipes_filial_id_fkey;
ALTER TABLE public.ponto_cargos DROP CONSTRAINT IF EXISTS ponto_cargos_filial_id_fkey;
ALTER TABLE public.ponto_afd_importacoes DROP CONSTRAINT IF EXISTS ponto_afd_importacoes_filial_id_fkey;

-- 3) Converte os dados existentes
UPDATE public.cv_cameras t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;
UPDATE public.ponto_equipamentos t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;
UPDATE public.ponto_departamentos t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;
UPDATE public.ponto_funcionarios t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;
UPDATE public.ponto_permissoes t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;
UPDATE public.ponto_geofences t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;
UPDATE public.ponto_redes_autorizadas t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;
UPDATE public.ponto_funcionario_vinculos t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;
UPDATE public.ponto_equipes t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;
UPDATE public.ponto_cargos t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;
UPDATE public.ponto_afd_importacoes t SET filial_id = m.unidade_id FROM _map m WHERE t.filial_id = m.filial_id;

-- Limpa referências órfãs (sem unidade correspondente)
UPDATE public.cv_cameras t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);
UPDATE public.ponto_equipamentos t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);
UPDATE public.ponto_departamentos t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);
UPDATE public.ponto_funcionarios t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);
UPDATE public.ponto_permissoes t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);
UPDATE public.ponto_geofences t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);
UPDATE public.ponto_redes_autorizadas t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);
UPDATE public.ponto_funcionario_vinculos t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);
UPDATE public.ponto_equipes t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);
UPDATE public.ponto_cargos t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);
UPDATE public.ponto_afd_importacoes t SET filial_id = NULL WHERE filial_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = t.filial_id);

-- 4) Novas FKs apontando para unidades
ALTER TABLE public.cv_cameras ADD CONSTRAINT cv_cameras_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.ponto_departamentos ADD CONSTRAINT ponto_departamentos_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.ponto_funcionarios ADD CONSTRAINT ponto_funcionarios_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.ponto_equipamentos ADD CONSTRAINT ponto_equipamentos_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.ponto_permissoes ADD CONSTRAINT ponto_permissoes_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.ponto_geofences ADD CONSTRAINT ponto_geofences_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.ponto_redes_autorizadas ADD CONSTRAINT ponto_redes_autorizadas_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.ponto_funcionario_vinculos ADD CONSTRAINT ponto_funcionario_vinculos_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.ponto_equipes ADD CONSTRAINT ponto_equipes_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.ponto_cargos ADD CONSTRAINT ponto_cargos_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;
ALTER TABLE public.ponto_afd_importacoes ADD CONSTRAINT ponto_afd_importacoes_unidade_fkey FOREIGN KEY (filial_id) REFERENCES public.unidades(id) ON DELETE SET NULL;