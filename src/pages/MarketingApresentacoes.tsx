import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Plus, Pencil, Trash2, Image as ImageIcon, Video as VideoIcon,
  ArrowUp, ArrowDown, Copy, Play, Upload, ExternalLink, MonitorPlay, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { getEstabelecimentoId } from "@/services/tvSignage/tvSignageService";

type ItemTipo = "image" | "video";
interface ApresentacaoItem {
  id: string;
  tipo: ItemTipo;
  url: string;
  nome?: string;
  duracao?: number; // seconds (only images use it)
}
interface Apresentacao {
  id: string;
  estabelecimento_id: string;
  nome: string;
  descricao: string | null;
  versao: number;
  ativo: boolean;
  itens: ApresentacaoItem[];
  duracao_padrao_imagem: number;
  transicao: string;
  updated_at: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export default function MarketingApresentacoes() {
  const [list, setList] = useState<Apresentacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [estabId, setEstabId] = useState<string | null>(null);
  const [edit, setEdit] = useState<Apresentacao | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Apresentacao | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const est = await getEstabelecimentoId();
    setEstabId(est);
    const { data, error } = await supabase
      .from("apresentacoes_empresa")
      .select("*")
      .order("nome", { ascending: true })
      .order("versao", { ascending: false });
    if (error) toast.error("Erro ao carregar apresentações");
    setList(((data as any[]) || []).map((r) => ({ ...r, itens: Array.isArray(r.itens) ? r.itens : [] })));
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const novo = () => {
    if (!estabId) return toast.error("Estabelecimento não encontrado");
    setEdit({
      id: "",
      estabelecimento_id: estabId,
      nome: "",
      descricao: "",
      versao: 1,
      ativo: true,
      itens: [],
      duracao_padrao_imagem: 8,
      transicao: "fade",
      updated_at: new Date().toISOString(),
    });
  };

  const duplicar = async (a: Apresentacao) => {
    if (!estabId) return;
    const sameName = list.filter((x) => x.nome === a.nome);
    const nextVersao = Math.max(...sameName.map((x) => x.versao), 0) + 1;
    const { error } = await supabase.from("apresentacoes_empresa").insert({
      estabelecimento_id: estabId,
      nome: a.nome,
      descricao: a.descricao,
      versao: nextVersao,
      ativo: false,
      itens: a.itens as any,
      duracao_padrao_imagem: a.duracao_padrao_imagem,
      transicao: a.transicao,
    } as any);
    if (error) return toast.error("Erro ao duplicar");
    toast.success(`Versão ${nextVersao} criada`);
    carregar();
  };

  const salvar = async () => {
    if (!edit) return;
    if (!edit.nome.trim()) return toast.error("Informe um nome");
    if (edit.itens.length === 0) return toast.error("Adicione ao menos uma mídia");
    const payload = {
      estabelecimento_id: edit.estabelecimento_id,
      nome: edit.nome.trim(),
      descricao: edit.descricao,
      versao: edit.versao,
      ativo: edit.ativo,
      itens: edit.itens as any,
      duracao_padrao_imagem: edit.duracao_padrao_imagem,
      transicao: edit.transicao,
    };
    let res;
    if (edit.id) {
      res = await supabase.from("apresentacoes_empresa").update(payload as any).eq("id", edit.id);
    } else {
      res = await supabase.from("apresentacoes_empresa").insert(payload as any);
    }
    if (res.error) return toast.error("Erro ao salvar");
    toast.success("Apresentação salva");
    setEdit(null);
    carregar();
  };

  const [usoDashboards, setUsoDashboards] = useState<{ id: string; nome: string }[]>([]);

  const abrirExcluir = async (a: Apresentacao) => {
    setToDelete(a);
    setUsoDashboards([]);
    try {
      const { data } = await supabase
        .from("tv_dashboards")
        .select("id, nome, rota_interna")
        .ilike("rota_interna", `%/tv/apresentacao%${a.id}%`);
      setUsoDashboards((data || []).map((d: any) => ({ id: d.id, nome: d.nome })));
    } catch {}
  };

  const excluir = async () => {
    if (!toDelete) return;
    const { error } = await supabase.from("apresentacoes_empresa").delete().eq("id", toDelete.id);
    if (error) return toast.error("Erro ao excluir");
    toast.success(usoDashboards.length ? "Excluída — dashboards vinculados irão parar de exibir" : "Excluída");
    setToDelete(null);
    setUsoDashboards([]);
    carregar();
  };

  const move = (idx: number, dir: -1 | 1) => {
    if (!edit) return;
    const arr = [...edit.itens];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setEdit({ ...edit, itens: arr });
  };
  const removeItem = (idx: number) => {
    if (!edit) return;
    const arr = [...edit.itens]; arr.splice(idx, 1);
    setEdit({ ...edit, itens: arr });
  };
  const addItems = (items: ApresentacaoItem[]) => {
    if (!edit) return;
    setEdit({ ...edit, itens: [...edit.itens, ...items] });
  };

  const previewUrl = (a: Apresentacao) => `/tv/apresentacao?id=${a.id}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MonitorPlay className="w-5 h-5 text-primary" /> Apresentações da Empresa
          </h2>
          <p className="text-xs text-muted-foreground">
            Monte sequências de imagens e vídeos para exibir nas TVs (Gerenciador de Telas Remotas).
          </p>
        </div>
        <Button onClick={novo}><Plus className="w-4 h-4 mr-2" /> Nova apresentação</Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Nenhuma apresentação criada ainda. Clique em <b>Nova apresentação</b> para começar.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a) => (
            <Card key={a.id} className="p-4 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold truncate">{a.nome}</div>
                  <div className="text-[11px] text-muted-foreground flex gap-2 items-center">
                    <Badge variant="outline">v{a.versao}</Badge>
                    <Badge variant={a.ativo ? "default" : "secondary"}>{a.ativo ? "Ativo" : "Inativo"}</Badge>
                    <span>{a.itens.length} mídias</span>
                  </div>
                </div>
              </div>
              {a.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{a.descricao}</p>}
              <div className="flex gap-1 overflow-hidden">
                {a.itens.slice(0, 5).map((it, i) => (
                  <div key={i} className="w-12 h-12 rounded bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {it.tipo === "image" ? (
                      <img src={it.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <VideoIcon className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-1 flex-wrap mt-auto">
                <Button size="sm" variant="outline" onClick={() => setEdit(a)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(previewUrl(a), "_blank")}>
                  <Play className="w-3.5 h-3.5 mr-1" /> Prévia
                </Button>
                <Button size="sm" variant="outline" onClick={() => duplicar(a)}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> Nova versão
                </Button>
                <Button size="sm" variant="ghost" onClick={() => abrirExcluir(a)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Editor */}
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{edit?.id ? "Editar apresentação" : "Nova apresentação"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Nome</Label>
                  <Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} />
                </div>
                <div>
                  <Label>Versão</Label>
                  <Input type="number" min={1} value={edit.versao} onChange={(e) => setEdit({ ...edit, versao: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea rows={2} value={edit.descricao || ""} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} />
                </div>
                <div>
                  <Label>Duração padrão de imagem (segundos)</Label>
                  <Input type="number" min={2} max={120} value={edit.duracao_padrao_imagem}
                    onChange={(e) => setEdit({ ...edit, duracao_padrao_imagem: parseInt(e.target.value) || 8 })} />
                </div>
                <div>
                  <Label>Transição</Label>
                  <Select value={edit.transicao} onValueChange={(v) => setEdit({ ...edit, transicao: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fade">Fade</SelectItem>
                      <SelectItem value="slide">Slide</SelectItem>
                      <SelectItem value="none">Sem transição</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} />
                  <Label>Ativa (fica disponível para as TVs)</Label>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Sequência de mídias ({edit.itens.length})</Label>
                  <Button size="sm" onClick={() => setPickerOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" /> Adicionar mídia
                  </Button>
                </div>
                {edit.itens.length === 0 ? (
                  <Card className="p-6 text-center text-xs text-muted-foreground">
                    Nenhuma mídia. Adicione imagens ou vídeos da galeria ou faça upload.
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {edit.itens.map((it, idx) => (
                      <Card key={it.id} className="p-2 flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="w-14 h-14 rounded bg-muted overflow-hidden flex items-center justify-center shrink-0">
                          {it.tipo === "image" ? (
                            <img src={it.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <video src={it.url} className="w-full h-full object-cover" muted />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate flex items-center gap-2">
                            {it.tipo === "image" ? <ImageIcon className="w-3.5 h-3.5" /> : <VideoIcon className="w-3.5 h-3.5" />}
                            <span className="truncate">{it.nome || `Mídia ${idx + 1}`}</span>
                          </div>
                          {it.tipo === "image" && (
                            <div className="flex items-center gap-2 mt-1">
                              <Label className="text-[11px] text-muted-foreground">Duração:</Label>
                              <Input
                                type="number" min={2} max={120}
                                value={it.duracao ?? edit.duracao_padrao_imagem}
                                onChange={(e) => {
                                  const arr = [...edit.itens];
                                  arr[idx] = { ...it, duracao: parseInt(e.target.value) || edit.duracao_padrao_imagem };
                                  setEdit({ ...edit, itens: arr });
                                }}
                                className="w-20 h-7"
                              />
                              <span className="text-[11px] text-muted-foreground">seg</span>
                            </div>
                          )}
                        </div>
                        <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}>
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === edit.itens.length - 1}>
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(idx)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MediaPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={(items) => { addItems(items); setPickerOpen(false); }}
        estabelecimentoId={estabId}
      />

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => { if (!o) { setToDelete(null); setUsoDashboards([]); } }}
        onConfirm={excluir}
        title={usoDashboards.length ? "⚠️ Apresentação em uso — excluir mesmo assim?" : "Excluir apresentação?"}
        description={
          usoDashboards.length
            ? `"${toDelete?.nome}" (v${toDelete?.versao}) está sendo usada em ${usoDashboards.length} dashboard(s) do Gerenciador de Telas: ${usoDashboards.map(d => d.nome).join(", ")}. Ao excluir, essas telas deixarão de exibir esta apresentação. Confirma?`
            : `Tem certeza que deseja excluir "${toDelete?.nome}" (v${toDelete?.versao})?`
        }
      />
    </div>
  );
}

// ============= Picker =============
interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onPick: (items: ApresentacaoItem[]) => void;
  estabelecimentoId: string | null;
}
function MediaPickerDialog({ open, onClose, onPick, estabelecimentoId }: MediaPickerProps) {
  const [tab, setTab] = useState<"galeria" | "upload">("galeria");
  const [media, setMedia] = useState<ApresentacaoItem[]>([]);
  const [selected, setSelected] = useState<Record<string, ApresentacaoItem>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filtro, setFiltro] = useState<"all" | "image" | "video">("all");

  useEffect(() => {
    if (!open || !estabelecimentoId) return;
    (async () => {
      setLoading(true);
      setSelected({});
      const [{ data: gal }, { data: ai }] = await Promise.all([
        supabase.from("media_gallery").select("id,tipo,public_url,nome").eq("estabelecimento_id", estabelecimentoId).order("created_at", { ascending: false }),
        supabase.from("catalog_ai_images").select("id,public_url,prompt").eq("estabelecimento_id", estabelecimentoId).order("created_at", { ascending: false }),
      ]);
      const items: ApresentacaoItem[] = [
        ...((gal as any[]) || []).map((g) => ({
          id: `g_${g.id}`,
          tipo: (g.tipo === "video" ? "video" : "image") as ItemTipo,
          url: g.public_url,
          nome: g.nome,
        })),
        ...((ai as any[]) || []).map((g) => ({
          id: `ai_${g.id}`,
          tipo: "image" as ItemTipo,
          url: g.public_url,
          nome: g.prompt?.slice(0, 60) || "Imagem IA",
        })),
      ].filter((i) => !!i.url);
      setMedia(items);
      setLoading(false);
    })();
  }, [open, estabelecimentoId]);

  const toggle = (it: ApresentacaoItem) => {
    setSelected((s) => {
      const copy = { ...s };
      if (copy[it.id]) delete copy[it.id];
      else copy[it.id] = { ...it, id: uid() };
      return copy;
    });
  };

  const confirmar = () => {
    const arr = Object.values(selected);
    if (arr.length === 0) return toast.error("Selecione ao menos uma mídia");
    onPick(arr);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !estabelecimentoId) return;
    setUploading(true);
    try {
      const novos: ApresentacaoItem[] = [];
      for (const file of files) {
        const isVideo = file.type.startsWith("video/");
        const bucket = isVideo ? "marketing-videos" : "marketing-images";
        const filename = `${estabelecimentoId}/apresentacoes/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(filename, file, { upsert: true, contentType: file.type });
        if (upErr) { toast.error(`Falha ao enviar ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
        // registra na galeria também
        await supabase.from("media_gallery").insert({
          estabelecimento_id: estabelecimentoId,
          tipo: isVideo ? "video" : "image",
          storage_path: filename,
          public_url: urlData.publicUrl,
          nome: file.name,
          tamanho_bytes: file.size,
          mime_type: file.type,
          origem: "apresentacao",
        } as any);
        novos.push({ id: uid(), tipo: isVideo ? "video" : "image", url: urlData.publicUrl, nome: file.name });
      }
      if (novos.length) {
        onPick(novos);
        toast.success(`${novos.length} mídia(s) enviada(s)`);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const filtered = media.filter((m) => filtro === "all" || m.tipo === filtro);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar mídia</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList>
            <TabsTrigger value="galeria"><ImageIcon className="w-4 h-4 mr-1" /> Galeria</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-1" /> Upload</TabsTrigger>
          </TabsList>
          <TabsContent value="galeria" className="flex-1 overflow-hidden flex flex-col">
            <div className="flex gap-2 mb-2">
              <Button size="sm" variant={filtro === "all" ? "default" : "outline"} onClick={() => setFiltro("all")}>Todos</Button>
              <Button size="sm" variant={filtro === "image" ? "default" : "outline"} onClick={() => setFiltro("image")}>Imagens</Button>
              <Button size="sm" variant={filtro === "video" ? "default" : "outline"} onClick={() => setFiltro("video")}>Vídeos</Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <p className="text-sm text-muted-foreground p-4">Carregando…</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4">Nenhuma mídia disponível. Use a aba Upload.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {filtered.map((it) => {
                    const isSel = !!selected[it.id];
                    return (
                      <button
                        key={it.id}
                        onClick={() => toggle(it)}
                        className={`relative rounded-md overflow-hidden border-2 aspect-square bg-muted ${isSel ? "border-primary" : "border-transparent"}`}
                      >
                        {it.tipo === "image" ? (
                          <img src={it.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={it.url} className="w-full h-full object-cover" muted />
                        )}
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1 rounded flex items-center gap-1">
                          {it.tipo === "image" ? <ImageIcon className="w-3 h-3" /> : <VideoIcon className="w-3 h-3" />}
                          {it.tipo}
                        </span>
                        {isSel && (
                          <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] px-1.5 rounded">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="upload" className="flex-1 overflow-y-auto">
            <div className="p-8 border-2 border-dashed rounded-lg text-center">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm mb-3">Envie imagens (JPG, PNG, WEBP) ou vídeos (MP4, WEBM)</p>
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
                id="apresentacao-upload"
              />
              <Button asChild disabled={uploading}>
                <label htmlFor="apresentacao-upload" className="cursor-pointer">
                  {uploading ? "Enviando…" : "Selecionar arquivos"}
                </label>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          {tab === "galeria" && (
            <Button onClick={confirmar}>Adicionar {Object.keys(selected).length ? `(${Object.keys(selected).length})` : ""}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
