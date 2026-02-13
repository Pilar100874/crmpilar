import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Images, Upload, Trash2, Search, X, Plus, 
  User, Mountain, Palette, Brush, Box, Star, Move
} from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export interface GalleryImage {
  id: string;
  categoria: string;
  nome: string | null;
  descricao: string | null;
  image_url: string;
  storage_path: string | null;
  tags: string[] | null;
  created_at: string;
}

export const GALLERY_CATEGORIES = [
  { id: 'influencer', label: 'Influencers', icon: User, color: '#ec4899', gradient: 'from-pink-500/20 to-rose-500/20', desc: 'Fotos de modelos e influenciadores' },
  { id: 'ambiente', label: 'Ambientes', icon: Mountain, color: '#22c55e', gradient: 'from-green-500/20 to-emerald-500/20', desc: 'Cenários e referências de ambientação' },
  { id: 'estilo', label: 'Estilos', icon: Brush, color: '#8b5cf6', gradient: 'from-violet-500/20 to-purple-500/20', desc: 'Referências de estilo visual' },
  { id: 'paleta', label: 'Paletas', icon: Palette, color: '#f59e0b', gradient: 'from-amber-500/20 to-yellow-500/20', desc: 'Paletas e combinações de cores' },
  { id: 'textura', label: 'Texturas', icon: Box, color: '#06b6d4', gradient: 'from-cyan-500/20 to-sky-500/20', desc: 'Texturas e materiais de referência' },
  { id: 'logo', label: 'Logos', icon: Star, color: '#f43f5e', gradient: 'from-rose-500/20 to-red-500/20', desc: 'Logos e identidade visual' },
  { id: 'pose', label: 'Poses', icon: Move, color: '#6366f1', gradient: 'from-indigo-500/20 to-blue-500/20', desc: 'Referências de poses e composição' },
] as const;

export type GalleryCategoryId = typeof GALLERY_CATEGORIES[number]['id'];

interface StudioGalleryManagerProps {
  open: boolean;
  onClose: () => void;
}

const StudioGalleryManager: React.FC<StudioGalleryManagerProps> = ({ open, onClose }) => {
  const [activeCategory, setActiveCategory] = useState<GalleryCategoryId>('influencer');
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<GalleryImage | null>(null);
  const estabelecimentoId = localStorage.getItem('estabelecimentoId') || '';

  const fetchImages = useCallback(async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('studio_gallery_images')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('categoria', activeCategory)
      .order('created_at', { ascending: false });
    if (!error) setImages((data as GalleryImage[]) || []);
    setLoading(false);
  }, [estabelecimentoId, activeCategory]);

  useEffect(() => {
    if (open) fetchImages();
  }, [open, fetchImages]);

  const handleUpload = useCallback(async (files: FileList) => {
    if (!estabelecimentoId || files.length === 0) return;
    setUploading(true);
    
    const uploadPromises = Array.from(files).map(async (file) => {
      const ext = file.name.split('.').pop();
      const path = `${estabelecimentoId}/${activeCategory}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('studio-gallery')
        .upload(path, file, { upsert: false });
      
      if (uploadError) {
        toast.error(`Erro ao enviar ${file.name}`);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage.from('studio-gallery').getPublicUrl(path);

      const { error: dbError } = await supabase
        .from('studio_gallery_images')
        .insert({
          estabelecimento_id: estabelecimentoId,
          categoria: activeCategory,
          nome: file.name.replace(/\.[^.]+$/, ''),
          image_url: publicUrl,
          storage_path: path,
        });

      if (dbError) {
        toast.error(`Erro ao salvar ${file.name}`);
        return null;
      }
      return true;
    });

    await Promise.all(uploadPromises);
    toast.success(`${files.length} imagem(ns) enviada(s)!`);
    fetchImages();
    setUploading(false);
  }, [estabelecimentoId, activeCategory, fetchImages]);

  const handleDelete = useCallback(async (img: GalleryImage) => {
    try {
      if (img.storage_path) {
        await supabase.storage.from('studio-gallery').remove([img.storage_path]);
      }
      const { error } = await supabase.from('studio_gallery_images').delete().eq('id', img.id);
      if (error) {
        console.error('Erro ao excluir:', error);
        toast.error('Erro ao remover imagem');
        return;
      }
      toast.success('Imagem removida');
      fetchImages();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      toast.error('Erro ao remover imagem');
    } finally {
      setDeleteConfirm(null);
    }
  }, [fetchImages]);

  const filtered = images.filter(img => 
    !search || img.nome?.toLowerCase().includes(search.toLowerCase())
  );

  const activeCat = GALLERY_CATEGORIES.find(c => c.id === activeCategory)!;

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-background border border-border rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <Images className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Galeria de Referências</h2>
              <p className="text-xs text-muted-foreground">Organize imagens por categoria para usar nos workflows</p>
            </div>
          </div>
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar - Categories */}
          <div className="w-56 border-r border-border p-3 space-y-1 overflow-y-auto shrink-0">
            {GALLERY_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                    isActive 
                      ? 'bg-primary/10 text-primary font-medium' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" style={{ color: isActive ? cat.color : undefined }} />
                  <span className="truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gradient-to-r ${activeCat.gradient} text-xs font-medium`}>
                {React.createElement(activeCat.icon, { className: 'h-3 w-3' })}
                {activeCat.label}
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex-1" />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleUpload(e.target.files)}
                  disabled={uploading}
                />
                <Button size="sm" className="gap-1.5 text-xs h-8" disabled={uploading} asChild>
                  <span>
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? 'Enviando...' : 'Adicionar'}
                  </span>
                </Button>
              </label>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Carregando...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-4 rounded-2xl bg-muted/30 mb-4">
                    {React.createElement(activeCat.icon, { className: 'h-8 w-8 text-muted-foreground/40' })}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">Nenhuma imagem em "{activeCat.label}"</p>
                  <p className="text-xs text-muted-foreground/60">{activeCat.desc}</p>
                  <label className="cursor-pointer mt-4">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && handleUpload(e.target.files)}
                    />
                    <Button size="sm" variant="outline" className="gap-1.5 text-xs" asChild>
                      <span>
                        <Plus className="h-3.5 w-3.5" />
                        Adicionar imagens
                      </span>
                    </Button>
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {filtered.map((img) => (
                    <div key={img.id} className="group relative rounded-xl overflow-hidden border border-border/50 bg-muted/20 aspect-square">
                      <img src={img.image_url} alt={img.nome || ''} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-white truncate">{img.nome}</p>
                        </div>
                        <button
                          onClick={() => setDeleteConfirm(img)}
                          className="p-1.5 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-white transition-colors shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Delete confirm - rendered with portal via AlertDialog */}
      {deleteConfirm && (
        <AlertDialog open={true} onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}>
          <AlertDialogContent className="z-[200]" onClick={(e) => e.stopPropagation()}>
            <AlertDialogHeader>
              <AlertDialogTitle>Remover imagem</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja remover "{deleteConfirm.nome}"? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setDeleteConfirm(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(deleteConfirm);
                }}
              >
                Remover
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </motion.div>
  );
};

export default StudioGalleryManager;
