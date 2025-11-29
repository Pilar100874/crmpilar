-- Add traccar_device_id column to veiculos table
ALTER TABLE public.veiculos 
ADD COLUMN traccar_device_id VARCHAR(100);

-- Create index for faster lookups
CREATE INDEX idx_veiculos_traccar_device_id ON public.veiculos(traccar_device_id) WHERE traccar_device_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.veiculos.traccar_device_id IS 'ID do dispositivo no Traccar Client App';