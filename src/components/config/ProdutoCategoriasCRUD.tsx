import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Pencil, Plus, Upload, ImageIcon, X } from "lucide-react";
import { ProdutoCategoria } from "@/types/orcamento";

interface ProdutoCategoriasCRUDProps {
  estabelecimentoId: string;
}

const ICON_SIZE = 64; // px for display in e-commerce

export function ProdutoCategoriasCRUD({ estabelecimentoId }: ProdutoCategoriasCRUDProps) {
  const [categorias, setCategorias] = useState<(ProdutoCategoria & { icone_url?: string | null })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<(ProdutoCategoria & { icone_url?: string | null }) | null>(null);
  const [nome, setNome] = useState("");
  const [iconeUrl, setIconeUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (estabelecimentoId) loadCategorias();
  }, [estabelecimentoId]);

  const loadCategorias = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("produto_categorias")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");
      if (error) throw error;
      setCategorias(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar categorias:", error);
      toast.error("Erro ao carregar categorias");
    } finally {
      setLoading(false);
    }
  };

  const loadGallery = async () => {
    setGalleryLoading(true);
    try {
      const imageFilter = (f: { name: string }) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.name);
      const allUrls: string[] = [];

      // Load from ecommerce-assets bucket
      const { data: ecomData } = await supabase.storage.from("ecommerce-assets").list(estabelecimentoId, { limit: 100 });
      if (ecomData) {
        ecomData.filter(imageFilter).forEach(f => {
          const { data: urlData } = supabase.storage.from("ecommerce-assets").getPublicUrl(`${estabelecimentoId}/${f.name}`);
          allUrls.push(urlData.publicUrl);
        });
      }

      // Load from produtos bucket
      const { data: prodData } = await supabase.storage.from("produtos").list(estabelecimentoId, { limit: 100 });
      if (prodData) {
        prodData.filter(imageFilter).forEach(f => {
          const { data: urlData } = supabase.storage.from("produtos").getPublicUrl(`${estabelecimentoId}/${f.name}`);
          allUrls.push(urlData.publicUrl);
        });
      }

      setGalleryImages(allUrls);
    } catch {
      // ignore
    }
    setGalleryLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${estabelecimentoId}/cat-icon-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ecommerce-assets").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("ecommerce-assets").getPublicUrl(path);
      setIconeUrl(urlData.publicUrl);
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    try {
      const payload: any = { nome, icone_url: iconeUrl || null };

      if (editingCategoria) {
        const { error } = await supabase
          .from("produto_categorias")
          .update(payload)
          .eq("id", editingCategoria.id);
        if (error) { toast.error(`Erro: ${error.message}`); return; }
        toast.success("Categoria atualizada!");
      } else {
        const { error } = await supabase
          .from("produto_categorias")
          .insert({ estabelecimento_id: estabelecimentoId, ...payload });
        if (error) { toast.error(`Erro: ${error.message}`); return; }
        toast.success("Categoria criada!");
      }

      setShowDialog(false);
      setEditingCategoria(null);
      setNome("");
      setIconeUrl(null);
      loadCategorias();
    } catch (error: any) {
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleEdit = (categoria: ProdutoCategoria & { icone_url?: string | null }) => {
    setEditingCategoria(categoria);
    setNome(categoria.nome);
    setIconeUrl(categoria.icone_url || null);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;
    try {
      const { error } = await supabase.from("produto_categorias").delete().eq("id", id);
      if (error) throw error;
      toast.success("Categoria excluída!");
      loadCategorias();
    } catch (error: any) {
      toast.error("Erro ao excluir categoria");
    }
  };

  const openDialog = () => {
    setEditingCategoria(null);
    setNome("");
    setIconeUrl(null);
    setShowDialog(true);
  };

  if (loading) return <div>Carregando categorias...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Categorias de Produtos</h3>
        <Button onClick={openDialog}>
          <Plus className="w-4 h-4 mr-2" /> Nova Categoria
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Ícone</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categorias.map((categoria) => (
            <TableRow key={categoria.id}>
              <TableCell>
                {categoria.icone_url ? (
                  <img
                    src={categoria.icone_url}
                    alt={categoria.nome}
                    className="w-10 h-10 rounded-lg object-cover border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <ImageIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{categoria.nome}</TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="icon" onClick={() => handleEdit(categoria)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(categoria.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {categorias.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                Nenhuma categoria cadastrada
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCategoria ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label>Nome *</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome da categoria" />
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Imagem da Categoria (E-commerce)
              </Label>
              <p className="text-xs text-muted-foreground">
                Esta imagem será exibida no menu e na listagem de categorias do e-commerce.
              </p>

              {/* Preview */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  {iconeUrl ? (
                    <div className="relative">
                      <img
                        src={iconeUrl}
                        alt="Imagem da categoria"
                        className="w-20 h-20 rounded-xl object-cover border-2 border-primary/20"
                      />
                      <button
                        onClick={() => setIconeUrl(null)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30">
                      <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  <p>Formatos: JPG, PNG, WebP, SVG</p>
                  <p>Tamanho recomendado: {ICON_SIZE}x{ICON_SIZE}px</p>
                </div>
              </div>

              <Tabs defaultValue="upload" onValueChange={(v) => { if (v === "galeria") loadGallery(); }}>
                <TabsList className="w-full">
                  <TabsTrigger value="upload" className="flex-1 gap-1.5 text-xs">
                    <Upload className="w-3.5 h-3.5" /> Upload
                  </TabsTrigger>
                  <TabsTrigger value="galeria" className="flex-1 gap-1.5 text-xs">
                    <ImageIcon className="w-3.5 h-3.5" /> Galeria
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="mt-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleUpload}
                  />
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Enviando..." : "Escolher imagem"}
                  </Button>
                </TabsContent>

                <TabsContent value="galeria" className="mt-3">
                  {galleryLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
                  ) : galleryImages.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma imagem na galeria</p>
                  ) : (
                    <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                      {galleryImages.map((url, i) => (
                        <button
                          key={i}
                          onClick={() => { setIconeUrl(url); toast.success("Imagem selecionada!"); }}
                          className={`aspect-square rounded-lg overflow-hidden border-2 transition-all hover:border-primary ${iconeUrl === url ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
