import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeleteConfirmTrigger } from "@/components/tv-signage/DeleteConfirmTrigger";
import {
  Plus, Pencil, Trash2, Images, PlayCircle, Upload, ArrowUp, ArrowDown,
  Image as ImageIcon, Video as VideoIcon, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/services/tvSignage/tvSignageService";
import { TRANSICOES_MURAL, type MuralItem } from "@/pages/TvMural";

const uid = () => Math.random().toString(36).slice(2, 10);

interface MuralRow {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  itens: MuralItem[];
  duracao_padrao_imagem: number;
  transicao: string;
  transicao_ms: number;
  loop: boolean;
  embaralhar: boolean;
}

const NOVO: MuralRow = {
  id: "",
  nome: "",
  descricao: "",
  ativo: true,
  itens: [],
  duracao_padrao_imagem: 8,
  transicao: "cinematic_fade",
  transicao_ms: 1200,
  loop: true,
  embaralhar: false,
};

export default function TvSignageMurais() {
  const [list, setList] = useState<MuralRow[]>([]);
  const [estabId, setEstabId] = useState<string | null>(null);
  const [edit, setEdit] = useState<MuralRow | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const est = await getEstabelecimentoId();
    setEstabId(est);
    const { data, error } = await supabase.from("tv_murais").select("*").order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setList(((data as any[]) || []).map((r) => ({ ...r, itens: Array.isArray(r.itens) ? r.itens : [] })));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!edit) return;
    if (!edit.nome.trim()) return toast.error("Informe o nome do mural");
    if (edit.itens.length === 0) return toast.error("Adicione ao menos uma mídia");
    if (!estabId) return toast.error("Estabelecimento não encontrado");
    setSalvando(true);
    const payload = {
      nome: edit.nome.trim().toUpperCase(),
      descricao: edit.descricao || null,
      ativo: edit.ativo,
      itens: edit.itens as any,
      duracao_padrao_imagem: edit.duracao_padrao_imagem,
      transicao: edit.transicao,
      transicao_ms: edit.transicao_ms,
      loop: edit.loop,
      embaralhar: edit.embaralhar,
      updated_at: new Date().toISOString(),
    };
    const res = edit.id
      ? await supabase.from("tv_murais").update(payload as any).eq("id", edit.id)
      : await supabase.from("tv_murais").insert({ ...payload, estabelecimento_id: estabId } as any);
    setSalvando(false);
    if (res.error) return toast.error(res.error.message);
    toast.success("Mural salvo");
    setEdit(null);
    carregar();
  };

  const mover = (idx: number, dir: -1 | 1) => {
    if (!edit) return;
    const arr = [...edit.itens];
    const alvo = idx + dir;
    if (alvo < 0 || alvo >= arr.length) return;
    [arr[idx], arr[alvo]] = [arr[alvo], arr[idx]];
    setEdit({ ...edit, itens: arr });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <p className="text-sm text-muted-foreground">
          Murais de mídia: imagens e vídeos exibidos em sequência com transição cinematográfica entre cada item.
        </p>
        <Button onClick={() => setEdit({ ...NOVO })}>
          <Plus className="w-4 h-4 mr-1" />Novo mural
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((m) => (
          <Card key={m.id} className="p-4 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Images className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.nome}</div>
                  <div className="text-xs text-muted-foreground">{m.itens.length} mídia(s)</div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" title="Pré-visualizar" onClick={() => window.open(`/tv/mural?id=${m.id}`, "_blank")}>
                  <PlayCircle className="w-4 h-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEdit(m)}><Pencil className="w-4 h-4" /></Button>
                <DeleteConfirmTrigger
                  onConfirm={async () => { await supabase.from("tv_murais").delete().eq("id", m.id); carregar(); }}
                  title="Excluir mural?"
                  description={`"${m.nome}" será removido.`}
                  trigger={<Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                />
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap gap-2 pt-2 border-t border-border">
              <span>🎬 {TRANSICOES_MURAL.find((t) => t.value === m.transicao)?.label || m.transicao}</span>
              <span>⏱ {m.duracao_padrao_imagem}s/imagem</span>
              {m.loop && <span>🔁 Loop</span>}
              {!m.ativo && <Badge variant="secondary">Inativo</Badge>}
            </div>
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="p-8 text-center text-muted-foreground col-span-full">Nenhum mural criado ainda.</Card>
        )}
      </div>

      <Dialog open={edit !== null} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle>{edit?.id ? "Editar mural" : "Novo mural"}</DialogTitle>
          </DialogHeader>
          {edit && (
            <div className="space-y-4 overflow-y-auto px-6 py-2 flex-1">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><Label>Nome</Label><Input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value.toUpperCase() })} /></div>
                <div><Label>Descrição</Label><Input value={edit.descricao || ""} onChange={(e) => setEdit({ ...edit, descricao: e.target.value })} /></div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Transição entre mídias</Label>
                  <Select value={edit.transicao} onValueChange={(v) => setEdit({ ...edit, transicao: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TRANSICOES_MURAL.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Duração da transição (ms)</Label>
                  <Input type="number" min={200} max={5000} value={edit.transicao_ms}
                    onChange={(e) => setEdit({ ...edit, transicao_ms: Math.max(200, Math.min(5000, Number(e.target.value) || 1200)) })} />
                </div>
                <div>
                  <Label>Tempo padrão por imagem (segundos)</Label>
                  <Input type="number" min={2} max={600} value={edit.duracao_padrao_imagem}
                    onChange={(e) => setEdit({ ...edit, duracao_padrao_imagem: Math.max(2, Math.min(600, Number(e.target.value) || 8)) })} />
                  <p className="text-[11px] text-muted-foreground mt-1">Vídeos avançam ao terminar a reprodução.</p>
                </div>
                <div className="space-y-2 pt-5">
                  <div className="flex items-center justify-between"><Label className="text-sm">Repetir em loop</Label>
                    <Switch checked={edit.loop} onCheckedChange={(v) => setEdit({ ...edit, loop: v })} /></div>
                  <div className="flex items-center justify-between"><Label className="text-sm">Ordem aleatória</Label>
                    <Switch checked={edit.embaralhar} onCheckedChange={(v) => setEdit({ ...edit, embaralhar: v })} /></div>
                  <div className="flex items-center justify-between"><Label className="text-sm">Ativo</Label>
                    <Switch checked={edit.ativo} onCheckedChange={(v) => setEdit({ ...edit, ativo: v })} /></div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Mídias ({edit.itens.length})</Label>
                  <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
                    <Plus className="w-4 h-4 mr-1" />Adicionar mídias
                  </Button>
                </div>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {edit.itens.map((it, idx) => (
                    <div key={it.id} className="flex items-center gap-2 rounded-md border p-2">
                      <div className="w-16 h-12 rounded bg-muted overflow-hidden shrink-0 flex items-center justify-center relative">
                        {it.tipo === "video" ? (
                          <>
                            <video src={`${it.url}#t=0.1`} className="w-full h-full object-cover" muted playsInline preload="metadata" />
                            <VideoIcon className="w-4 h-4 text-white absolute drop-shadow" />
                          </>
                        ) : (
                          <img src={it.url} alt={it.nome || "Mídia"} className="w-full h-full object-cover" loading="lazy" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate">{it.nome || (it.tipo === "video" ? "Vídeo" : "Imagem")}</div>
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {it.tipo === "image" && (
                            <>
                              <Input type="number" min={2} max={600} className="h-7 w-20 text-xs"
                                value={it.duracao ?? edit.duracao_padrao_imagem}
                                onChange={(e) => {
                                  const arr = [...edit.itens];
                                  arr[idx] = { ...it, duracao: Math.max(2, Math.min(600, Number(e.target.value) || edit.duracao_padrao_imagem)) };
                                  setEdit({ ...edit, itens: arr });
                                }} />
                              <span className="text-[11px] text-muted-foreground mr-1">segundos</span>
                            </>
                          )}
                          <Select
                            value={it.ajuste ?? "esticar"}
                            onValueChange={(v) => {
                              const arr = [...edit.itens];
                              arr[idx] = { ...it, ajuste: v as MuralAjuste };
                              setEdit({ ...edit, itens: arr });
                            }}
                          >
                            <SelectTrigger className="h-7 w-[190px] text-xs">
                              <SelectValue placeholder="Modo de exibição" />
                            </SelectTrigger>
                            <SelectContent>
                              {AJUSTES_MURAL.map((a) => (
                                <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => mover(idx, -1)}><ArrowUp className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => mover(idx, 1)}><ArrowDown className="w-4 h-4" /></Button>
                        <DeleteConfirmTrigger
                          onConfirm={async () => setEdit({ ...edit, itens: edit.itens.filter((x) => x.id !== it.id) })}
                          title="Remover mídia?"
                          description="A mídia será removida deste mural."
                          trigger={<Button variant="ghost" size="icon"><Trash2 className="w-4 h-4 text-red-500" /></Button>}
                        />
                      </div>
                    </div>
                  ))}
                  {edit.itens.length === 0 && (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Nenhuma mídia. Escolha da galeria ou envie do computador.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="p-6 pt-2">
            <Button variant="outline" onClick={() => setEdit(null)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MuralMediaPicker
        open={pickerOpen}
        estabelecimentoId={estabId}
        onClose={() => setPickerOpen(false)}
        onPick={(novos) => {
          if (edit) setEdit({ ...edit, itens: [...edit.itens, ...novos] });
          setPickerOpen(false);
        }}
      />
    </div>
  );
}

// ============ Seletor de mídias (galeria + upload) ============
function MuralMediaPicker({
  open, onClose, onPick, estabelecimentoId,
}: { open: boolean; onClose: () => void; onPick: (itens: MuralItem[]) => void; estabelecimentoId: string | null }) {
  const [tab, setTab] = useState<"galeria" | "upload">("galeria");
  const [media, setMedia] = useState<MuralItem[]>([]);
  const [selected, setSelected] = useState<Record<string, MuralItem>>({});
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filtro, setFiltro] = useState<"all" | "image" | "video">("all");

  useEffect(() => {
    if (!open || !estabelecimentoId) return;
    (async () => {
      setLoading(true);
      setSelected({});
      const { data } = await supabase
        .from("media_gallery")
        .select("id,tipo,public_url,nome")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });
      setMedia(((data as any[]) || [])
        .filter((g) => !!g.public_url)
        .map((g) => ({ id: `g_${g.id}`, tipo: g.tipo === "video" ? "video" : "image", url: g.public_url, nome: g.nome })));
      setLoading(false);
    })();
  }, [open, estabelecimentoId]);

  const toggle = (it: MuralItem) => {
    setSelected((s) => {
      const copy = { ...s };
      if (copy[it.id]) delete copy[it.id];
      else copy[it.id] = { ...it, id: uid() };
      return copy;
    });
  };

  const enviar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !estabelecimentoId) return;
    setUploading(true);
    try {
      const novos: MuralItem[] = [];
      for (const file of files) {
        const isVideo = file.type.startsWith("video/");
        const bucket = isVideo ? "marketing-videos" : "marketing-images";
        const filename = `${estabelecimentoId}/murais/${Date.now()}_${file.name}`;
        const { error: upErr } = await supabase.storage.from(bucket).upload(filename, file, { upsert: true, contentType: file.type });
        if (upErr) { toast.error(`Falha ao enviar ${file.name}`); continue; }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filename);
        await supabase.from("media_gallery").insert({
          estabelecimento_id: estabelecimentoId,
          tipo: isVideo ? "video" : "image",
          storage_path: filename,
          public_url: urlData.publicUrl,
          nome: file.name,
          tamanho_bytes: file.size,
          mime_type: file.type,
          origem: "mural_tv",
        } as any);
        novos.push({ id: uid(), tipo: isVideo ? "video" : "image", url: urlData.publicUrl, nome: file.name });
      }
      if (novos.length) { onPick(novos); toast.success(`${novos.length} mídia(s) enviada(s)`); }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const filtradas = media.filter((m) => filtro === "all" || m.tipo === filtro);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Adicionar mídias</DialogTitle></DialogHeader>
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="flex-1 overflow-hidden flex flex-col">
          <TabsList>
            <TabsTrigger value="galeria"><ImageIcon className="w-4 h-4 mr-1" />Galeria</TabsTrigger>
            <TabsTrigger value="upload"><Upload className="w-4 h-4 mr-1" />Enviar do computador</TabsTrigger>
          </TabsList>

          <TabsContent value="galeria" className="flex-1 overflow-hidden flex flex-col gap-3">
            <div className="flex gap-2">
              {(["all", "image", "video"] as const).map((f) => (
                <Button key={f} size="sm" variant={filtro === f ? "default" : "outline"} onClick={() => setFiltro(f)}>
                  {f === "all" ? "Todas" : f === "image" ? "Imagens" : "Vídeos"}
                </Button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 auto-rows-min content-start gap-3 p-1">
              {loading && <div className="col-span-full py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>}
              {!loading && filtradas.map((m) => {
                const on = !!selected[m.id];
                return (
                  <button key={m.id} type="button" onClick={() => toggle(m)}
                    className={`relative aspect-video w-full rounded-md overflow-hidden bg-muted border-2 ${on ? "border-primary" : "border-border"}`}>
                    {m.tipo === "video" ? (
                      <>
                        <video src={`${m.url}#t=0.1`} className="absolute inset-0 w-full h-full object-cover" muted playsInline preload="metadata" />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                          <VideoIcon className="w-6 h-6 text-white drop-shadow" />
                        </span>
                      </>
                    ) : (
                      <img src={m.url} alt={m.nome || "Mídia"} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    )}
                    <span className="absolute bottom-0 inset-x-0 truncate bg-black/55 text-white text-[10px] px-1 py-0.5 text-left">
                      {m.nome || (m.tipo === "video" ? "Vídeo" : "Imagem")}
                    </span>
                    {on && <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[10px] px-1.5 rounded">✓</span>}
                  </button>
                );
              })}

              {!loading && filtradas.length === 0 && (
                <p className="col-span-full text-center text-sm text-muted-foreground py-8">Nenhuma mídia na galeria.</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="flex-1 flex flex-col items-center justify-center gap-3 py-8">
            <input id="mural-upload" type="file" multiple accept="image/*,video/*" className="hidden" onChange={enviar} />
            <Button asChild disabled={uploading}>
              <label htmlFor="mural-upload" className="cursor-pointer">
                {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                Selecionar arquivos
              </label>
            </Button>
            <p className="text-xs text-muted-foreground">Imagens e vídeos. Os arquivos também ficam salvos na galeria.</p>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button
            onClick={() => {
              const arr = Object.values(selected);
              if (!arr.length) return toast.error("Selecione ao menos uma mídia");
              onPick(arr);
            }}
            disabled={tab !== "galeria"}
          >
            Adicionar selecionadas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
