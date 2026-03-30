import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Megaphone, Plus, Trash2, Save, Upload, Image, Eye, EyeOff, GripVertical, Calendar, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const POSITIONS = [
  { value: "home_banner", label: "Banner da Home" },
  { value: "catalogo_topo", label: "Topo do Catálogo" },
  { value: "sidebar", label: "Sidebar" },
  { value: "popup", label: "Popup" },
  { value: "footer", label: "Rodapé" },
];

interface Ad {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_url: string | null;
  link_url: string | null;
  posicao: string;
  tipo: string;
  html_conteudo: string | null;
  ordem: number;
  ativo: boolean;
  data_inicio: string | null;
  data_fim: string | null;
}

export default function EcommerceAdsManager() {
  const navigate = useNavigate();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Partial<Ad> | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadAds(); }, []);

  const loadAds = async () => {
    const estId = await getEstabelecimentoId();
    if (!estId) return;
    const { data } = await supabase
      .from("ecommerce_anuncios")
      .select("*")
      .eq("estabelecimento_id", estId)
      .order("ordem");
    setAds((data as Ad[]) || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditingAd({ titulo: "", posicao: "home_banner", tipo: "imagem", ativo: true, ordem: ads.length });
    setDialogOpen(true);
  };

  const openEdit = (ad: Ad) => {
    setEditingAd({ ...ad });
    setDialogOpen(true);
  };

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    const estId = await getEstabelecimentoId();
    if (!estId) return;
    const ext = file.name.split(".").pop();
    const path = `${estId}/ad_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("ecommerce-assets").upload(path, file);
    if (error) { toast.error("Erro no upload"); setUploading(false); return; }
    const { data: urlData } = supabase.storage.from("ecommerce-assets").getPublicUrl(path);
    setEditingAd((prev) => prev ? { ...prev, imagem_url: urlData.publicUrl } : prev);
    setUploading(false);
  };

  const handleSave = async () => {
    if (!editingAd?.titulo) { toast.error("Título obrigatório"); return; }
    setSaving(true);
    const estId = await getEstabelecimentoId();
    if (!estId) return;

    const payload = {
      estabelecimento_id: estId,
      titulo: editingAd.titulo,
      descricao: editingAd.descricao || null,
      imagem_url: editingAd.imagem_url || null,
      link_url: editingAd.link_url || null,
      posicao: editingAd.posicao || "home_banner",
      tipo: editingAd.tipo || "imagem",
      html_conteudo: editingAd.html_conteudo || null,
      ordem: editingAd.ordem ?? 0,
      ativo: editingAd.ativo ?? true,
      data_inicio: editingAd.data_inicio || null,
      data_fim: editingAd.data_fim || null,
    };

    if (editingAd.id) {
      await supabase.from("ecommerce_anuncios").update(payload).eq("id", editingAd.id);
    } else {
      await supabase.from("ecommerce_anuncios").insert(payload);
    }
    toast.success(editingAd.id ? "Anúncio atualizado!" : "Anúncio criado!");
    setDialogOpen(false);
    setEditingAd(null);
    setSaving(false);
    loadAds();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("ecommerce_anuncios").delete().eq("id", id);
    toast.success("Anúncio removido");
    loadAds();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("ecommerce_anuncios").update({ ativo: !current }).eq("id", id);
    loadAds();
  };

  if (loading) return <div className="p-6 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ecommerce-config")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6" />Anúncios & Banners</h1>
          <p className="text-sm text-muted-foreground">Gerencie os banners, popups e promoções visuais da loja</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Anúncio</Button>
      </div>

      {ads.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium mb-1">Nenhum anúncio criado</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie banners e promoções para exibir na loja</p>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Criar Primeiro Anúncio</Button>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {ads.map((ad, i) => (
              <motion.div key={ad.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.03 }}>
                <Card className={`overflow-hidden group ${!ad.ativo ? "opacity-60" : ""}`}>
                  <div className="aspect-video bg-muted/30 relative overflow-hidden">
                    {ad.imagem_url ? (
                      <img src={ad.imagem_url} alt={ad.titulo} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Image className="h-10 w-10 text-muted-foreground/30" /></div>
                    )}
                    <div className="absolute top-2 left-2 flex gap-1">
                      <Badge variant="secondary" className="text-[10px]">{POSITIONS.find((p) => p.value === ad.posicao)?.label || ad.posicao}</Badge>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Badge variant={ad.ativo ? "default" : "outline"} className="text-[10px]">{ad.ativo ? "Ativo" : "Inativo"}</Badge>
                    </div>
                  </div>
                  <CardContent className="p-3 space-y-2">
                    <h3 className="font-medium text-sm truncate">{ad.titulo}</h3>
                    {ad.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{ad.descricao}</p>}
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEdit(ad)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(ad.id, ad.ativo)}>
                        {ad.ativo ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(ad.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAd?.id ? "Editar Anúncio" : "Novo Anúncio"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input value={editingAd?.titulo || ""} onChange={(e) => setEditingAd((p) => p ? { ...p, titulo: e.target.value } : p)} />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={editingAd?.descricao || ""} onChange={(e) => setEditingAd((p) => p ? { ...p, descricao: e.target.value } : p)} rows={2} />
            </div>
            <div>
              <Label>Posição</Label>
              <Select value={editingAd?.posicao || "home_banner"} onValueChange={(v) => setEditingAd((p) => p ? { ...p, posicao: v } : p)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{POSITIONS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Imagem do Banner</Label>
              {editingAd?.imagem_url && (
                <div className="mb-2 rounded-lg overflow-hidden border aspect-video">
                  <img src={editingAd.imagem_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUploadImage(e.target.files[0])} />
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full">
                <Upload className="h-4 w-4 mr-2" />{uploading ? "Enviando..." : "Enviar Imagem"}
              </Button>
            </div>
            <div>
              <Label>Link de Destino</Label>
              <Input value={editingAd?.link_url || ""} onChange={(e) => setEditingAd((p) => p ? { ...p, link_url: e.target.value } : p)} placeholder="https:// ou /ecommerce/catalogo?cat=..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Data Início</Label>
                <Input type="date" value={editingAd?.data_inicio?.slice(0, 10) || ""} onChange={(e) => setEditingAd((p) => p ? { ...p, data_inicio: e.target.value || null } : p)} />
              </div>
              <div>
                <Label className="text-xs">Data Fim</Label>
                <Input type="date" value={editingAd?.data_fim?.slice(0, 10) || ""} onChange={(e) => setEditingAd((p) => p ? { ...p, data_fim: e.target.value || null } : p)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editingAd?.ativo ?? true} onCheckedChange={(v) => setEditingAd((p) => p ? { ...p, ativo: v } : p)} />
              <Label>Ativo</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar Anúncio"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
