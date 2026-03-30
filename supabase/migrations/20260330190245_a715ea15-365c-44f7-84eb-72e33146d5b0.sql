-- Allow public read access to ecommerce_config for storefront visitors
CREATE POLICY "Public can view ecommerce config"
ON public.ecommerce_config
FOR SELECT
TO anon, authenticated
USING (true);

-- Drop the restrictive policy that blocks cross-estabelecimento reads
DROP POLICY IF EXISTS "Users can view own ecommerce config" ON public.ecommerce_config;