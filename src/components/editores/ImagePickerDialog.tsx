import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Image as ImageIcon, Search, Link as LinkIcon, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  onInsert: (url: string, widthPct: string) => void;
}

export function ImagePickerDialog({ onInsert }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"galeria" | "produtos" | "upload" | "url">("galeria");
  const [estabId, setEstabId] = useState<string | null>(null);
  const [gallery, setGallery] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [urlManual, setUrlManual] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [largura, setLargura] = useState("100%");
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { getEstabelecimentoId().then(setEstabId); }, []);

  useEffect(() => {
    if (!open || !estabId) return;
    if (tab === "galeria") {
      supabase.from("media_gallery")
        .select("id,nome,public_url,thumbnail_url,tipo")
        .eq("estabelecimento_id", estabId)
        .eq("tipo", "image")
        .order("created_at", { ascending: false })
        .limit(100)
        .then(({ data }) => setGallery(data ?? []));
    } else if (tab === "produtos") {
      supabase.from("produtos")
        .select("id,nome,foto_url,codigo,produto_imagens(url,is_principal,ordem)")
        .eq("estabelecimento_id", estabId)
        .eq("ativo", true)
        .order("nome")
        .limit(100)
        .then(({ data }) => setProdutos((data ?? []).map((p: any) => ({
          ...p,
          url: p.produto_imagens?.find((i: any) => i.is_principal)?.url
            ?? p.produto_imagens?.[0]?.url
            ?? p.foto_url,
        })).filter((p: any) => !!p.url)));
    }
  }, [open, tab, estabId]);

  const filtered = (list: any[]) => list.filter(x => !busca || (x.nome ?? "").toLowerCase().includes(busca.toLowerCase()));

  const inserir = () => {
    const url = tab === "url" ? urlManual.trim() : tab === "upload" ? uploadPreview : sel;
    if (!url) return;
    onInsert(url, largura);
    setOpen(false);
    setSel(null); setUrlManual(""); setUploadPreview(null);
  };

  const handleUpload = async (file: File) => {
    if (!file || !estabId) return;
    if (!file.type.startsWith("image/")) { toast.error("Selecione uma imagem"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${estabId}/editores/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("marketing-images").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("marketing-images").getPublicUrl(path);
      setUploadPreview(data.publicUrl);
      // registra na galeria
      await supabase.from("media_gallery").insert({
        estabelecimento_id: estabId,
        tipo: "image",
        nome: file.name,
        public_url: data.publicUrl,
        storage_path: path,
      });
      toast.success("Imagem enviada");
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e.message ?? ""));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Inserir imagem">
          <ImageIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Inserir imagem</DialogTitle>
          <DialogDescription>Escolha da galeria, do catálogo ou informe uma URL.</DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v: any) => { setTab(v); setSel(null); }} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="self-start">
            <TabsTrigger value="galeria">Galeria</TabsTrigger>
            <TabsTrigger value="produtos">Catálogo</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="h-3 w-3 mr-1" /> Computador</TabsTrigger>
            <TabsTrigger value="url"><LinkIcon className="h-3 w-3 mr-1" /> URL</TabsTrigger>
          </TabsList>

          {(tab === "galeria" || tab === "produtos") && (
            <div className="relative my-2">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar…" className="pl-8" />
            </div>
          )}

          <TabsContent value="galeria" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[380px]">
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-1">
                {filtered(gallery).map(g => (
                  <button key={g.id} onClick={() => setSel(g.public_url)}
                    className={cn("aspect-square border rounded overflow-hidden bg-muted hover:ring-2 hover:ring-primary", sel === g.public_url && "ring-2 ring-primary")}>
                    <img src={g.thumbnail_url || g.public_url} alt={g.nome} className="w-full h-full object-cover" />
                  </button>
                ))}
                {filtered(gallery).length === 0 && <p className="col-span-full text-center text-xs text-muted-foreground py-8">Nenhuma imagem na galeria.</p>}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="produtos" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[380px]">
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 p-1">
                {filtered(produtos).map(p => (
                  <button key={p.id} onClick={() => setSel(p.url)}
                    className={cn("border rounded overflow-hidden bg-muted hover:ring-2 hover:ring-primary text-left", sel === p.url && "ring-2 ring-primary")}>
                    <div className="aspect-square">
                      <img src={p.url} alt={p.nome} className="w-full h-full object-contain bg-white" />
                    </div>
                    <div className="p-1 text-[10px] truncate">{p.nome}</div>
                  </button>
                ))}
                {filtered(produtos).length === 0 && <p className="col-span-full text-center text-xs text-muted-foreground py-8">Nenhum produto com imagem.</p>}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="upload" className="mt-2 space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ""; }}
            />
            <div
              onClick={() => !uploading && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); }}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f); }}
              className="border-2 border-dashed rounded-lg h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition"
            >
              {uploading ? (
                <><Loader2 className="h-6 w-6 animate-spin mb-2" /><p className="text-sm text-muted-foreground">Enviando…</p></>
              ) : (
                <><Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                <p className="text-sm">Clique ou arraste uma imagem aqui</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, GIF, WEBP</p></>
              )}
            </div>
            {uploadPreview && (
              <div className="flex items-center gap-3">
                <img src={uploadPreview} alt="preview" className="max-h-32 rounded border" />
                <p className="text-xs text-muted-foreground">Pronto para inserir.</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="url" className="mt-2 space-y-2">
            <label className="text-xs text-muted-foreground">URL da imagem</label>
            <Input value={urlManual} onChange={e => setUrlManual(e.target.value)} placeholder="https://…" />
            {urlManual && <img src={urlManual} alt="preview" className="max-h-40 rounded border" />}
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-2 border-t pt-3">
          <label className="text-xs text-muted-foreground">Largura</label>
          <Select value={largura} onValueChange={setLargura}>
            <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="25%">25%</SelectItem>
              <SelectItem value="50%">50%</SelectItem>
              <SelectItem value="75%">75%</SelectItem>
              <SelectItem value="100%">100%</SelectItem>
              <SelectItem value="200px">200px</SelectItem>
              <SelectItem value="400px">400px</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter className="ml-auto gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={inserir} disabled={tab === "url" ? !urlManual.trim() : tab === "upload" ? !uploadPreview : !sel}>Inserir</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
