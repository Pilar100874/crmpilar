import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Upload, Trash2, Palette, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface VisualIdentityData {
  id?: string;
  is_active: boolean;
  name: string;
  images: string[];
}

const MAX_IMAGES = 10;

const VisualIdentityPanel: React.FC<Props> = ({ open, onClose }) => {
  const [data, setData] = useState<VisualIdentityData>({ is_active: false, name: 'Identidade Visual', images: [] });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteIdx, setDeleteIdx] = useState<number | null>(null);
  
  const estabelecimentoId = localStorage.getItem('estabelecimentoId') || '';

  const load = useCallback(async () => {
    if (!estabelecimentoId) return;
    setLoading(true);
    try {
      const { data: row } = await supabase
        .from('studio_visual_identity')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .maybeSingle();
      if (row) {
        setData({
          id: row.id,
          is_active: row.is_active,
          name: row.name || 'Identidade Visual',
          images: Array.isArray(row.images) ? row.images as string[] : [],
        });
      }
    } catch (err) {
      console.error('Error loading visual identity:', err);
    } finally {
      setLoading(false);
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const save = async (newData: VisualIdentityData) => {
    if (!estabelecimentoId) return;
    setSaving(true);
    try {
      const payload = {
        estabelecimento_id: estabelecimentoId,
        is_active: newData.is_active,
        name: newData.name,
        images: newData.images,
      };

      if (newData.id) {
        const { error } = await supabase
          .from('studio_visual_identity')
          .update(payload)
          .eq('id', newData.id);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from('studio_visual_identity')
          .insert([payload] as any)
          .select()
          .single();
        if (error) throw error;
        if (inserted) newData.id = inserted.id;
      }
      setData(newData);
      toast.success('Identidade visual salva!');
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao salvar: ' + (err.message || 'Desconhecido'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (checked: boolean) => {
    const newData = { ...data, is_active: checked };
    setData(newData);
    save(newData);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (data.images.length + files.length > MAX_IMAGES) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens permitido`);
      return;
    }

    setUploading(true);
    const newImages = [...data.images];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} não é uma imagem`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} excede 5MB`);
        continue;
      }

      try {
        const ext = file.name.split('.').pop() || 'png';
        const fileName = `visual-identity/${estabelecimentoId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage
          .from('marketing-images')
          .upload(fileName, file, { contentType: file.type, upsert: true });
        if (error) throw error;

        const { data: publicData } = supabase.storage
          .from('marketing-images')
          .getPublicUrl(fileName);
        
        if (publicData?.publicUrl) {
          newImages.push(publicData.publicUrl);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }

    const newData = { ...data, images: newImages };
    setData(newData);
    await save(newData);
    setUploading(false);
    e.target.value = '';
  };

  const handleRemoveImage = async () => {
    if (deleteIdx === null) return;
    const newImages = data.images.filter((_, i) => i !== deleteIdx);
    const newData = { ...data, images: newImages };
    await save(newData);
    setDeleteIdx(null);
  };

  if (!open) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 bottom-0 w-[380px] bg-background border-l border-border z-50 flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-sm">Identidade Visual</h2>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div>
                    <Label className="text-sm font-medium">Ativar Identidade Visual</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Quando ativada, será usada em todas as gerações de imagens e vídeos
                    </p>
                  </div>
                  <Switch
                    checked={data.is_active}
                    onCheckedChange={handleToggle}
                    disabled={saving}
                  />
                </div>

                {/* Name */}
                <div>
                  <Label className="text-xs text-muted-foreground">Nome</Label>
                  <Input
                    value={data.name}
                    onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                    onBlur={() => save(data)}
                    placeholder="Ex: Marca Principal"
                    className="mt-1 h-8 text-sm"
                  />
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Adicione imagens de referência da sua marca (logotipo, paleta de cores, exemplos de design, produtos).
                    Quando ativada, essas referências serão automaticamente incluídas em <strong>todas</strong> as gerações de imagens e vídeos.
                  </p>
                </div>

                {/* Images */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-xs text-muted-foreground">
                      Imagens de Referência ({data.images.length}/{MAX_IMAGES})
                    </Label>
                    {data.images.length < MAX_IMAGES && (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1.5 pointer-events-none"
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          {uploading ? 'Enviando...' : 'Adicionar'}
                        </Button>
                      </label>
                    )}
                  </div>

                  {data.images.length === 0 ? (
                    <label className="cursor-pointer block">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">
                          Clique ou arraste imagens aqui
                        </p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">
                          PNG, JPG, WEBP — máx 5MB cada
                        </p>
                      </div>
                    </label>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {data.images.map((url, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-border bg-muted/30">
                          <img
                            src={url}
                            alt={`Ref ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                              variant="destructive"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDeleteIdx(idx)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                            {idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Status */}
                {data.is_active && data.images.length > 0 && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                      ✅ Identidade visual ativa — {data.images.length} referência(s) serão incluídas em todas as gerações
                    </p>
                  </div>
                )}

                {data.is_active && data.images.length === 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-[11px] text-yellow-600 dark:text-yellow-400 font-medium">
                      ⚠️ Identidade visual ativa, mas sem imagens. Adicione referências acima.
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </motion.div>
      </AnimatePresence>

      <DeleteConfirmDialog
        open={deleteIdx !== null}
        onOpenChange={(open) => { if (!open) setDeleteIdx(null); }}
        onConfirm={handleRemoveImage}
        title="Remover Imagem"
        description="Deseja realmente remover esta imagem de referência?"
      />
    </>
  );
};

export default VisualIdentityPanel;

// Helper to fetch active visual identity images (used by useStudioExecution)
export async function getActiveVisualIdentityImages(estabelecimentoId: string): Promise<string[]> {
  if (!estabelecimentoId) return [];
  try {
    const { data } = await supabase
      .from('studio_visual_identity')
      .select('is_active, images')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('is_active', true)
      .maybeSingle();
    if (data && Array.isArray(data.images)) {
      return data.images as string[];
    }
  } catch (err) {
    console.error('[VisualIdentity] Error fetching:', err);
  }
  return [];
}
