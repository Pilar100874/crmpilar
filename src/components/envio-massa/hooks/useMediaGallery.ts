import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { MediaGalleryItem } from '../types';

export function useMediaGallery(estabelecimentoId: string) {
  const [media, setMedia] = useState<MediaGalleryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMedia = async () => {
    if (!estabelecimentoId) return;
    
    try {
      // Fetch from media_gallery
      const { data: galleryData, error: galleryError } = await supabase
        .from('media_gallery')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });

      if (galleryError) throw galleryError;

      // Fetch from catalog_ai_images
      const { data: aiData, error: aiError } = await supabase
        .from('catalog_ai_images')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });

      if (aiError) console.warn('Error fetching AI images:', aiError);

      // Combine both sources
      const combinedMedia: MediaGalleryItem[] = [
        ...(galleryData || []).map((item: any) => ({
          id: item.id,
          tipo: item.tipo as MediaGalleryItem['tipo'],
          storage_path: item.storage_path,
          public_url: item.public_url,
          nome: item.nome,
          descricao: item.descricao,
          thumbnail_url: item.thumbnail_url,
          duracao_segundos: item.duracao_segundos
        })),
        ...(aiData || []).map((item: any) => ({
          id: item.id,
          tipo: 'image' as const,
          storage_path: item.storage_path,
          public_url: item.public_url,
          nome: item.prompt || 'Imagem IA',
          descricao: item.prompt
        }))
      ];

      setMedia(combinedMedia);
    } catch (error: any) {
      console.error('Error fetching media:', error);
      toast.error('Erro ao carregar galeria de mídias');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedia();
  }, [estabelecimentoId]);

  const uploadMedia = async (file: File): Promise<MediaGalleryItem | null> => {
    try {
      const isVideo = file.type.startsWith('video/');
      const isImage = file.type.startsWith('image/');
      
      if (!isVideo && !isImage) {
        toast.error('Apenas imagens e vídeos são permitidos');
        return null;
      }

      const bucket = isVideo ? 'marketing-videos' : 'marketing-images';
      const tipo = isVideo ? 'video' : 'image';
      const filename = `${estabelecimentoId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filename, file, {
          contentType: file.type,
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filename);

      // Save to media_gallery
      const { data, error } = await supabase
        .from('media_gallery')
        .insert({
          estabelecimento_id: estabelecimentoId,
          tipo,
          storage_path: filename,
          public_url: urlData.publicUrl,
          nome: file.name,
          tamanho_bytes: file.size,
          mime_type: file.type,
          origem: 'envio_massa'
        })
        .select()
        .single();

      if (error) throw error;

      const newItem: MediaGalleryItem = {
        id: data.id,
        tipo: data.tipo as MediaGalleryItem['tipo'],
        storage_path: data.storage_path,
        public_url: data.public_url,
        nome: data.nome
      };

      setMedia(prev => [newItem, ...prev]);
      toast.success('Mídia enviada com sucesso!');
      return newItem;
    } catch (error: any) {
      console.error('Error uploading media:', error);
      toast.error('Erro ao enviar mídia');
      return null;
    }
  };

  return {
    media,
    loading,
    uploadMedia,
    refetch: fetchMedia
  };
}
