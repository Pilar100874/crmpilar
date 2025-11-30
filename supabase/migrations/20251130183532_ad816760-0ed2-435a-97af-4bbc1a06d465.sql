-- Inserir novos marketplaces
INSERT INTO public.marketplaces (nome, nome_display, descricao, icone, ativo) VALUES
('americanas', 'Americanas Marketplace', 'Americanas Marketplace - B2W Digital', 'ShoppingBag', true),
('carrefour', 'Carrefour Marketplace', 'Carrefour Marketplace Brasil', 'ShoppingCart', true),
('casas_bahia', 'Casas Bahia (Via)', 'Casas Bahia - Via Varejo', 'Store', true),
('olx', 'OLX', 'OLX - B2B, lotes e máquinas', 'Package', true),
('whatsapp_commerce', 'WhatsApp Commerce', 'WhatsApp Business Commerce', 'MessageCircle', true)
ON CONFLICT (nome) DO NOTHING;