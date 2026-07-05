UPDATE public.cv_cameras
SET protocolo = 'rtsp',
    porta = 554,
    snapshot_path = COALESCE(NULLIF(snapshot_path,''), '/stream1')
WHERE marca = 'tplink_tapo'
  AND (protocolo = 'http' OR porta = 80);