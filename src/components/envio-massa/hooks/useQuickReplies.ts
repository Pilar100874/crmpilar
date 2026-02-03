import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QuickReply, QuickReplyCategory } from '../types';

export function useQuickReplies(estabelecimentoId: string) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [categories, setCategories] = useState<QuickReplyCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!estabelecimentoId) return;
    
    try {
      // Fetch replies
      const { data: repliesData, error: repliesError } = await supabase
        .from('quick_replies')
        .select('id, title, content, categoria, shortcut')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });

      if (repliesError) throw repliesError;
      setReplies(repliesData || []);

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('quick_reply_categories')
        .select('id, nome, ordem')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);
    } catch (error: any) {
      console.error('Error fetching quick replies:', error);
      toast.error('Erro ao carregar textos prontos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [estabelecimentoId]);

  const addCategory = async (nome: string) => {
    try {
      const { data, error } = await supabase
        .from('quick_reply_categories')
        .insert({
          estabelecimento_id: estabelecimentoId,
          nome,
          ordem: categories.length
        })
        .select()
        .single();

      if (error) throw error;
      setCategories(prev => [...prev, data]);
      toast.success('Categoria criada!');
      return data;
    } catch (error: any) {
      console.error('Error adding category:', error);
      toast.error('Erro ao criar categoria');
      return null;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quick_reply_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCategories(prev => prev.filter(c => c.id !== id));
      toast.success('Categoria removida!');
    } catch (error: any) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao remover categoria');
    }
  };

  const getGroupedReplies = () => {
    const grouped: Record<string, QuickReply[]> = {
      'Sem categoria': []
    };

    // Initialize categories
    categories.forEach(cat => {
      grouped[cat.nome] = [];
    });

    // Group replies
    replies.forEach(reply => {
      if (reply.categoria && grouped[reply.categoria]) {
        grouped[reply.categoria].push(reply);
      } else {
        grouped['Sem categoria'].push(reply);
      }
    });

    return grouped;
  };

  return {
    replies,
    categories,
    loading,
    addCategory,
    deleteCategory,
    getGroupedReplies,
    refetch: fetchData
  };
}
