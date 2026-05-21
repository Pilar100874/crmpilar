import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { X, Upload, Trash2, Palette, Image as ImageIcon, Loader2, AlertCircle, Type, Images, Cpu } from 'lucide-react';
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
  prompt: string;
  negative_prompt: string;
  images: string[];
  use_prompt: boolean;
  use_images: boolean;
  selected_images: number[];
  preferred_model: string;
}

const VI_IMAGE_MODELS = [
  { value: '', label: 'Usar modelo do bloco (padrão)' },
  { value: 'google/gemini-2.5-flash-image', label: '🟦 Gemini Flash Image' },
  { value: 'google/gemini-3-pro-image-preview', label: '🟦 Gemini 3 Pro Image' },
  { value: 'openai/dall-e-4', label: '🟢 DALL·E 4' },
  { value: 'openai/dall-e-3', label: '🟢 DALL·E 3' },
  { value: 'stability/sd3.5-turbo', label: '🟣 SD 3.5 Turbo' },
  { value: 'stability/sd3', label: '🟣 Stable Diffusion 3' },
  { value: 'midjourney/v7', label: '🔵 Midjourney v7' },
  { value: 'flux/1.1-pro', label: '⚡ Flux 1.1 Pro' },
  { value: 'flux/schnell', label: '⚡ Flux Schnell' },
  { value: 'ideogram/v3', label: '🎨 Ideogram v3' },
  { value: 'apiframe/gpt-image', label: '⚡ AF: GPT Image' },
  { value: 'apiframe/midjourney', label: '⚡ AF: Midjourney' },
  { value: 'wavespeed/gpt-image-2', label: '🌊 WS: GPT Image 2' },
  { value: 'wavespeed/flux-pro', label: '🌊 WS: Flux Pro' },
  { value: 'wavespeed/seedream-3', label: '🌊 WS: Seedream 3' },
  { value: 'chatgpt_image/gpt-image-1', label: '🖼️ ChatGPT Image 1' },
];
const MAX_IMAGES = 10;


const VisualIdentityPanel: React.FC<Props> = ({ open, onClose }) => {
  const [data, setData] = useState<VisualIdentityData>({
    is_active: false, name: 'Identidade Visual', prompt: '', negative_prompt: '', images: [],
    use_prompt: true, use_images: true, selected_images: [], preferred_model: '',
  });
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
        const images = Array.isArray(row.images) ? row.images as string[] : [];
        const selectedRaw = Array.isArray(row.selected_images) ? row.selected_images as number[] : [];
        // If no selection saved yet, select all by default
        const selected = selectedRaw.length > 0 ? selectedRaw : images.map((_, i) => i);
        setData({
          id: row.id,
          is_active: row.is_active,
          name: row.name || 'Identidade Visual',
          prompt: row.prompt || '',
          negative_prompt: (row as any).negative_prompt || '',
          images,
          use_prompt: row.use_prompt ?? true,
          use_images: row.use_images ?? true,
          selected_images: selected,
          preferred_model: (row as any).preferred_model || '',
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
        prompt: newData.prompt,
        images: newData.images,
        use_prompt: newData.use_prompt,
        use_images: newData.use_images,
        selected_images: newData.selected_images,
        preferred_model: newData.preferred_model || null,
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

  const handleTogglePrompt = (checked: boolean) => {
    const newData = { ...data, use_prompt: checked };
    setData(newData);
    save(newData);
  };

  const handleToggleImages = (checked: boolean) => {
    const newData = { ...data, use_images: checked };
    setData(newData);
    save(newData);
  };

  const handleToggleImageSelection = (idx: number, checked: boolean) => {
    const newSelected = checked
      ? [...data.selected_images, idx].sort((a, b) => a - b)
      : data.selected_images.filter(i => i !== idx);
    const newData = { ...data, selected_images: newSelected };
    setData(newData);
    save(newData);
  };

  const handleSelectAll = () => {
    const allSelected = data.images.map((_, i) => i);
    const newData = { ...data, selected_images: allSelected };
    setData(newData);
    save(newData);
  };

  const handleDeselectAll = () => {
    const newData = { ...data, selected_images: [] };
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
    const newSelected = [...data.selected_images];

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
          // Auto-select newly uploaded images
          newSelected.push(newImages.length);
          newImages.push(publicData.publicUrl);
        }
      } catch (err: any) {
        console.error(err);
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }

    const newData = { ...data, images: newImages, selected_images: newSelected };
    setData(newData);
    await save(newData);
    setUploading(false);
    e.target.value = '';
  };

  const handleRemoveImage = async () => {
    if (deleteIdx === null) return;
    const newImages = data.images.filter((_, i) => i !== deleteIdx);
    // Adjust selected_images: remove the deleted index and shift higher indices down
    const newSelected = data.selected_images
      .filter(i => i !== deleteIdx)
      .map(i => i > deleteIdx ? i - 1 : i);
    const newData = { ...data, images: newImages, selected_images: newSelected };
    await save(newData);
    setDeleteIdx(null);
  };

  if (!open) return null;

  const selectedCount = data.selected_images.length;
  const allSelected = selectedCount === data.images.length && data.images.length > 0;

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
                {/* Main Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                  <div>
                    <Label className="text-sm font-medium">Ativar Identidade Visual</Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Quando ativada, será usada nas gerações
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

                {/* Preferred Model */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                    <Label className="text-xs text-muted-foreground">Modelo Preferido</Label>
                  </div>
                  <Select
                    value={data.preferred_model || '_default'}
                    onValueChange={(val) => {
                      const newData = { ...data, preferred_model: val === '_default' ? '' : val };
                      setData(newData);
                      save(newData);
                    }}
                    disabled={saving || !data.is_active}
                  >
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Usar modelo do bloco (padrão)" />
                    </SelectTrigger>
                    <SelectContent>
                      {VI_IMAGE_MODELS.map((m) => (
                        <SelectItem key={m.value || '_default'} value={m.value || '_default'}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground/60">
                    Quando definido, este modelo será usado automaticamente em todas as gerações de imagem com a identidade visual ativa.
                  </p>
                </div>

                {/* Prompt Section with Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Type className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-xs text-muted-foreground">Prompt da Identidade Visual</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{data.use_prompt ? 'Ativo' : 'Inativo'}</span>
                      <Switch
                        checked={data.use_prompt}
                        onCheckedChange={handleTogglePrompt}
                        disabled={saving || !data.is_active}
                        className="scale-75"
                      />
                    </div>
                  </div>
                  <Textarea
                    value={data.prompt}
                    onChange={(e) => setData(prev => ({ ...prev, prompt: e.target.value }))}
                    onBlur={() => save(data)}
                    placeholder="Ex: Use cores vibrantes com tons de azul e laranja. Estilo moderno e minimalista..."
                    className={`text-sm min-h-[100px] resize-y transition-opacity ${!data.use_prompt ? 'opacity-50' : ''}`}
                    disabled={!data.use_prompt}
                  />
                  <p className="text-[10px] text-muted-foreground/60">
                    Descreva o estilo visual, cores, tipografia e regras de branding.
                    {!data.use_prompt && ' (Desativado — não será usado nas gerações)'}
                  </p>
                </div>

                {/* Info */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <AlertCircle className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Adicione imagens de referência da sua marca. Use os checkboxes para selecionar quais imagens serão enviadas nas gerações.
                  </p>
                </div>

                {/* Images Section with Toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Images className="h-3.5 w-3.5 text-muted-foreground" />
                      <Label className="text-xs text-muted-foreground">
                        Imagens de Referência ({data.images.length}/{MAX_IMAGES})
                      </Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">{data.use_images ? 'Ativo' : 'Inativo'}</span>
                      <Switch
                        checked={data.use_images}
                        onCheckedChange={handleToggleImages}
                        disabled={saving || !data.is_active}
                        className="scale-75"
                      />
                    </div>
                  </div>

                  {/* Select all / deselect all */}
                  {data.images.length > 0 && data.use_images && (
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {selectedCount} de {data.images.length} selecionada(s)
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1.5"
                          onClick={handleSelectAll}
                          disabled={allSelected || saving}
                        >
                          Todas
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 text-[10px] px-1.5"
                          onClick={handleDeselectAll}
                          disabled={selectedCount === 0 || saving}
                        >
                          Nenhuma
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className={`transition-opacity ${!data.use_images ? 'opacity-50 pointer-events-none' : ''}`}>
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
                        {data.images.map((url, idx) => {
                          const isSelected = data.selected_images.includes(idx);
                          return (
                            <div
                              key={idx}
                              className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-primary shadow-sm shadow-primary/20'
                                  : 'border-border opacity-60'
                              }`}
                              onClick={() => handleToggleImageSelection(idx, !isSelected)}
                            >
                              <img
                                src={url}
                                alt={`Ref ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                              {/* Checkbox overlay */}
                              <div className="absolute top-1 left-1 z-10">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    handleToggleImageSelection(idx, checked === true);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="h-4 w-4 bg-background/80 border-border"
                                />
                              </div>
                              {/* Delete on hover */}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteIdx(idx);
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white px-1.5 py-0.5 rounded">
                                {idx + 1}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {data.images.length > 0 && data.images.length < MAX_IMAGES && (
                      <label className="cursor-pointer mt-2 block">
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
                          className="h-7 text-[11px] gap-1.5 pointer-events-none w-full"
                          disabled={uploading}
                        >
                          {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                          {uploading ? 'Enviando...' : 'Adicionar Imagem'}
                        </Button>
                      </label>
                    )}
                  </div>
                </div>

                {/* Status */}
                {data.is_active && (data.use_images || data.use_prompt) && (
                  <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-[11px] text-green-600 dark:text-green-400 font-medium">
                      ✅ Identidade visual ativa
                      {data.use_prompt && data.prompt ? ' — prompt ativo' : ''}
                      {data.use_images && selectedCount > 0 ? ` — ${selectedCount} imagem(ns) selecionada(s)` : ''}
                    </p>
                  </div>
                )}

                {data.is_active && !data.use_images && !data.use_prompt && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-[11px] text-yellow-600 dark:text-yellow-400 font-medium">
                      ⚠️ Identidade visual ativa, mas prompt e imagens estão desativados.
                    </p>
                  </div>
                )}

                {data.is_active && data.use_images && data.images.length > 0 && selectedCount === 0 && (
                  <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                    <p className="text-[11px] text-yellow-600 dark:text-yellow-400 font-medium">
                      ⚠️ Imagens ativadas, mas nenhuma selecionada. Selecione as que deseja usar.
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

// Helper to fetch active visual identity data (used by useStudioExecution)
export interface VisualIdentityResult {
  images: string[];
  prompt: string;
  preferredModel?: string;
}

export async function getActiveVisualIdentity(estabelecimentoId: string): Promise<VisualIdentityResult | null> {
  if (!estabelecimentoId) return null;
  try {
    const { data } = await supabase
      .from('studio_visual_identity')
      .select('is_active, images, prompt, use_prompt, use_images, selected_images, preferred_model')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('is_active', true)
      .maybeSingle();
    if (data) {
      const allImages = Array.isArray(data.images) ? data.images as string[] : [];
      const usePrompt = data.use_prompt ?? true;
      const useImages = data.use_images ?? true;
      const selectedIndices = Array.isArray(data.selected_images) ? data.selected_images as number[] : [];

      let finalImages: string[] = [];
      if (useImages && allImages.length > 0) {
        if (selectedIndices.length > 0) {
          finalImages = selectedIndices
            .filter(i => i >= 0 && i < allImages.length)
            .map(i => allImages[i]);
        } else {
          finalImages = allImages;
        }
      }

      const finalPrompt = usePrompt ? ((data.prompt as string) || '') : '';
      const preferredModel = (data as any).preferred_model || '';

      if (finalImages.length > 0 || finalPrompt) {
        return { images: finalImages, prompt: finalPrompt, preferredModel: preferredModel || undefined };
      }
    }
  } catch (err) {
    console.error('[VisualIdentity] Error fetching:', err);
  }
  return null;
}



// Legacy helper (backwards compat)
export async function getActiveVisualIdentityImages(estabelecimentoId: string): Promise<string[]> {
  const vi = await getActiveVisualIdentity(estabelecimentoId);
  return vi?.images || [];
}
