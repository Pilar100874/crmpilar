-- Create table for toll API configuration
CREATE TABLE public.pedagio_api_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estabelecimento_id UUID NOT NULL REFERENCES public.estabelecimentos(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'tollguru' or 'calcular_pedagio'
  api_key TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  configuracoes JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(estabelecimento_id, provider)
);

-- Enable RLS
ALTER TABLE public.pedagio_api_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their establishment's toll config"
ON public.pedagio_api_config FOR SELECT
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

CREATE POLICY "Users can insert toll config for their establishment"
ON public.pedagio_api_config FOR INSERT
WITH CHECK (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

CREATE POLICY "Users can update toll config for their establishment"
ON public.pedagio_api_config FOR UPDATE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

CREATE POLICY "Users can delete toll config for their establishment"
ON public.pedagio_api_config FOR DELETE
USING (
  estabelecimento_id IN (
    SELECT estabelecimento_id FROM usuarios WHERE auth_user_id = auth.uid()
  )
  OR EXISTS (SELECT 1 FROM administradores WHERE id = auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_pedagio_api_config_updated_at
BEFORE UPDATE ON public.pedagio_api_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();