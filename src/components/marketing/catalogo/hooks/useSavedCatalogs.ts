import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CatalogConfig, CatalogPage } from '../types';
import { toast } from 'sonner';
import { Json } from '@/integrations/supabase/types';

export interface SavedCatalog {
  id: string;
  estabelecimento_id: string;
  nome: string;
  config: CatalogConfig;
  cover_page: CatalogPage | null;
  products_page: CatalogPage | null;
  backcover_page: CatalogPage | null;
  thumbnail: string | null;
  created_at: string;
  updated_at: string;
}

const parseJsonField = <T,>(json: Json | null): T | null => {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  return json as unknown as T;
};

export const useSavedCatalogs = (estabelecimentoId: string | null) => {
  const [catalogs, setCatalogs] = useState<SavedCatalog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCatalogs = useCallback(async () => {
    if (!estabelecimentoId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('catalogos_salvos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Parse JSONB fields
      const parsedData = (data || []).map(item => ({
        ...item,
        config: parseJsonField<CatalogConfig>(item.config) || {
          name: '',
          pages: [],
          primaryColor: '#0f172a',
          secondaryColor: '#64748b',
          fontFamily: 'Inter, sans-serif',
          showPrices: true,
          showCodes: true,
          showPriceTable: true,
        },
        cover_page: parseJsonField<CatalogPage>(item.cover_page),
        products_page: parseJsonField<CatalogPage>(item.products_page),
        backcover_page: parseJsonField<CatalogPage>(item.backcover_page),
      }));
      
      setCatalogs(parsedData);
    } catch (error) {
      console.error('Erro ao buscar catálogos:', error);
      toast.error('Erro ao carregar catálogos salvos');
    } finally {
      setIsLoading(false);
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const saveCatalog = async (
    nome: string,
    config: CatalogConfig,
    coverPage: CatalogPage,
    productsPage: CatalogPage,
    backcoverPage: CatalogPage,
    thumbnail?: string,
    existingId?: string
  ): Promise<SavedCatalog | null> => {
    if (!estabelecimentoId) {
      toast.error('Estabelecimento não selecionado');
      return null;
    }

    setIsSaving(true);
    try {
      const catalogData = {
        estabelecimento_id: estabelecimentoId,
        nome,
        config: config as unknown as Json,
        cover_page: coverPage as unknown as Json,
        products_page: productsPage as unknown as Json,
        backcover_page: backcoverPage as unknown as Json,
        thumbnail: thumbnail || null,
      };

      if (existingId) {
        // Update existing catalog
        const { data, error } = await supabase
          .from('catalogos_salvos')
          .update(catalogData)
          .eq('id', existingId)
          .select()
          .single();

        if (error) throw error;
        
        toast.success('Catálogo atualizado com sucesso!');
        await fetchCatalogs();
        
        return {
          ...data,
          config: parseJsonField<CatalogConfig>(data.config) || config,
          cover_page: parseJsonField<CatalogPage>(data.cover_page),
          products_page: parseJsonField<CatalogPage>(data.products_page),
          backcover_page: parseJsonField<CatalogPage>(data.backcover_page),
        };
      } else {
        // Create new catalog
        const { data, error } = await supabase
          .from('catalogos_salvos')
          .insert([catalogData])
          .select()
          .single();

        if (error) throw error;
        
        toast.success('Catálogo salvo com sucesso!');
        await fetchCatalogs();
        
        return {
          ...data,
          config: parseJsonField<CatalogConfig>(data.config) || config,
          cover_page: parseJsonField<CatalogPage>(data.cover_page),
          products_page: parseJsonField<CatalogPage>(data.products_page),
          backcover_page: parseJsonField<CatalogPage>(data.backcover_page),
        };
      }
    } catch (error) {
      console.error('Erro ao salvar catálogo:', error);
      toast.error('Erro ao salvar catálogo');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCatalog = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('catalogos_salvos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Catálogo excluído com sucesso!');
      await fetchCatalogs();
      return true;
    } catch (error) {
      console.error('Erro ao excluir catálogo:', error);
      toast.error('Erro ao excluir catálogo');
      return false;
    }
  };

  const duplicateCatalog = async (catalog: SavedCatalog): Promise<SavedCatalog | null> => {
    if (!estabelecimentoId) return null;

    try {
      const { data, error } = await supabase
        .from('catalogos_salvos')
        .insert([{
          estabelecimento_id: estabelecimentoId,
          nome: `${catalog.nome} (Cópia)`,
          config: catalog.config as unknown as Json,
          cover_page: catalog.cover_page as unknown as Json,
          products_page: catalog.products_page as unknown as Json,
          backcover_page: catalog.backcover_page as unknown as Json,
          thumbnail: catalog.thumbnail,
        }])
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Catálogo duplicado com sucesso!');
      await fetchCatalogs();
      
      return {
        ...data,
        config: parseJsonField<CatalogConfig>(data.config) || catalog.config,
        cover_page: parseJsonField<CatalogPage>(data.cover_page),
        products_page: parseJsonField<CatalogPage>(data.products_page),
        backcover_page: parseJsonField<CatalogPage>(data.backcover_page),
      };
    } catch (error) {
      console.error('Erro ao duplicar catálogo:', error);
      toast.error('Erro ao duplicar catálogo');
      return null;
    }
  };

  return {
    catalogs,
    isLoading,
    isSaving,
    fetchCatalogs,
    saveCatalog,
    deleteCatalog,
    duplicateCatalog,
  };
};
