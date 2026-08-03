DELETE FROM public.logistica_paradas_marcadas p
USING public.logistica_automacoes a,
LATERAL jsonb_array_elements(a.flow_data->'nodes') n
WHERE a.ativo = true
  AND a.estabelecimento_id = p.estabelecimento_id
  AND n->'data'->>'type' = 'condicao_zona_isenta'
  AND (n->'data'->'config'->>'zona_lat') IS NOT NULL
  AND (n->'data'->'config'->>'zona_lng') IS NOT NULL
  AND (
    2 * 6371000 * asin(sqrt(
      power(sin(radians((n->'data'->'config'->>'zona_lat')::numeric - p.lat) / 2), 2)
      + cos(radians(p.lat)) * cos(radians((n->'data'->'config'->>'zona_lat')::numeric))
        * power(sin(radians((n->'data'->'config'->>'zona_lng')::numeric - p.lng) / 2), 2)
    ))
  ) <= COALESCE((n->'data'->'config'->>'zona_raio_metros')::numeric, 200);