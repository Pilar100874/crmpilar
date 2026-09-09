UPDATE public.automacao_blocos
SET nome = 'Portão', tipo = 'portao', device_id = '55b5833f-50ee-47bb-a0d9-27139daae901',
    x = 0, y = 0, w = 3, h = 2,
    config = jsonb_build_object('estilo','realista','cor','#38bdf8')
WHERE id = '1633d9d0-181a-484a-8d49-5c2b7f80ee68';

UPDATE public.automacao_blocos
SET nome = 'Porta', tipo = 'portao', device_id = '03a38ee8-e7a3-4d87-9bd8-6e39649b78b5',
    x = 3, y = 0, w = 3, h = 2,
    config = jsonb_build_object('estilo','realista','cor','#f59e0b')
WHERE id = 'c92962d5-7582-401e-bf45-4f57c9c755f6';

INSERT INTO public.automacao_blocos (ambiente_id, tipo, nome, device_id, canal, x, y, w, h, config)
SELECT '89c57d32-7c9c-40e4-9726-8a51ecb8cb0c', 'sensor', 'Leitor Facial', 'c61b797c-afa1-45f5-adde-955932bd6e8b', 0, 6, 0, 3, 2,
       jsonb_build_object('estilo','realista','cor','#22c55e')
WHERE NOT EXISTS (
  SELECT 1 FROM public.automacao_blocos
  WHERE ambiente_id = '89c57d32-7c9c-40e4-9726-8a51ecb8cb0c' AND nome = 'Leitor Facial'
);