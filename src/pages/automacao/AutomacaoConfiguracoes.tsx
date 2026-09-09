import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import {
  Ambiente, Bloco, CameraSimples, DispositivoSimples, TIPOS_BLOCO, TipoBloco,
  enviarImagemAutomacao, excluirAmbiente, excluirBloco, listarAmbientes, listarBlocos,
  listarCameras, listarDispositivos, salvarAmbiente, salvarBloco,
} from "@/lib/automacao/api";
import { ANIMACOES } from "@/lib/automacao/icones";
import SeletorIcone from "@/components/automacao/SeletorIcone";

export default function AutomacaoConfiguracoes() {
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [dispositivos, setDispositivos] = useState<DispositivoSimples[]>([]);
  const [cameras, setCameras] = useState<CameraSimples[]>([]);
  const [ambienteEdit, setAmbienteEdit] = useState<Partial<Ambiente> | null>(null);
  const [blocoEdit, setBlocoEdit] = useState<Partial<Bloco> | null>(null);
  const [excluir, setExcluir] = useState<{ tipo: "ambiente" | "bloco"; id: string; nome: string } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const carregar = useCallback(async () => {
    const [a, b, d, c] = await Promise.all([listarAmbientes(), listarBlocos(), listarDispositivos(), listarCameras()]);
    setAmbientes(a); setBlocos(b); setDispositivos(d); setCameras(c);
  }, []);

  const cfg = (blocoEdit?.config ?? {}) as Record<string, any>;
  const setCfg = (patch: Record<string, any>) =>
    setBlocoEdit((b) => ({ ...b, config: { ...((b?.config ?? {}) as Record<string, any>), ...patch } }));

  useEffect(() => { carregar(); }, [carregar]);

  const gravarAmbiente = async () => {
    if (!ambienteEdit?.nome?.trim()) { toast.error("Informe o nome do ambiente."); return; }
    await salvarAmbiente(ambienteEdit);
    setAmbienteEdit(null);
    toast.success("Ambiente salvo.");
    carregar();
  };

  const gravarBloco = async () => {
    if (!blocoEdit?.nome?.trim()) { toast.error("Informe o nome do bloco."); return; }
    if (!blocoEdit.ambiente_id) { toast.error("Escolha o ambiente."); return; }
    await salvarBloco(blocoEdit);
    setBlocoEdit(null);
    toast.success("Bloco salvo.");
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    if (excluir.tipo === "ambiente") await excluirAmbiente(excluir.id);
    else await excluirBloco(excluir.id);
    setExcluir(null);
    toast.success("Excluído.");
    carregar();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Ambientes</CardTitle>
          <Button size="sm" onClick={() => setAmbienteEdit({ nome: "", ordem: ambientes.length })}>
            <Plus className="h-4 w-4 mr-2" /> Novo ambiente
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {!ambientes.length && <p className="text-sm text-muted-foreground">Nenhum ambiente criado.</p>}
          {ambientes.map((a) => (
            <div key={a.id} className="flex items-center gap-2 rounded-lg border p-2">
              <span className="flex-1 truncate text-sm font-medium">{a.nome}</span>
              <Button variant="ghost" size="icon" onClick={() => setAmbienteEdit(a)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setExcluir({ tipo: "ambiente", id: a.id, nome: a.nome })}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Blocos do painel</CardTitle>
          <Button
            size="sm"
            disabled={!ambientes.length}
            onClick={() => setBlocoEdit({ nome: "", tipo: "luz", ambiente_id: ambientes[0]?.id, canal: 0, x: 0, y: 0, w: 3, h: 2 })}
          >
            <Plus className="h-4 w-4 mr-2" /> Novo bloco
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {!blocos.length && <p className="text-sm text-muted-foreground">Nenhum bloco criado.</p>}
          {blocos.map((b) => {
            const amb = ambientes.find((a) => a.id === b.ambiente_id);
            const dev = dispositivos.find((d) => d.id === b.device_id);
            return (
              <div key={b.id} className="flex items-center gap-2 rounded-lg border p-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{b.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {TIPOS_BLOCO.find((t) => t.valor === b.tipo)?.label} · {amb?.nome ?? "Sem ambiente"} ·{" "}
                    {dev?.nome ?? "Sem dispositivo"}
                  </p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setBlocoEdit(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setExcluir({ tipo: "bloco", id: b.id, nome: b.nome })}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Dialog open={!!ambienteEdit} onOpenChange={(o) => !o && setAmbienteEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{ambienteEdit?.id ? "Editar ambiente" : "Novo ambiente"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={ambienteEdit?.nome ?? ""}
                placeholder="Sala, Garagem, Portaria..."
                onChange={(e) => setAmbienteEdit((a) => ({ ...a, nome: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAmbienteEdit(null)}>Cancelar</Button>
            <Button onClick={gravarAmbiente}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!blocoEdit} onOpenChange={(o) => !o && setBlocoEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{blocoEdit?.id ? "Editar bloco" : "Novo bloco"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input
                value={blocoEdit?.nome ?? ""}
                placeholder="Luz da sala"
                onChange={(e) => setBlocoEdit((b) => ({ ...b, nome: e.target.value }))}
              />
            </div>
            <div>
              <Label>Tipo</Label>
              <Select
                value={blocoEdit?.tipo ?? "luz"}
                onValueChange={(v) => setBlocoEdit((b) => ({ ...b, tipo: v as TipoBloco }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {TIPOS_BLOCO.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ambiente</Label>
              <Select
                value={blocoEdit?.ambiente_id ?? ""}
                onValueChange={(v) => setBlocoEdit((b) => ({ ...b, ambiente_id: v }))}
              >
                <SelectTrigger><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {ambientes.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {blocoEdit?.tipo === "icone" && (
              <div className="space-y-2">
                <Label>Elemento</Label>
                <SeletorIcone valor={cfg.icone} onChange={(n) => setCfg({ icone: n })} />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Animação</Label>
                    <Select value={cfg.animacao ?? "brilho"} onValueChange={(v) => setCfg({ animacao: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        {ANIMACOES.map((a) => <SelectItem key={a.valor} value={a.valor}>{a.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Fundo</Label>
                    <Select value={cfg.fundo ?? "circulo"} onValueChange={(v) => setCfg({ fundo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="circulo">Redondo</SelectItem>
                        <SelectItem value="quadrado">Quadrado</SelectItem>
                        <SelectItem value="nenhum">Sem fundo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>O que o elemento faz</Label>
                  <Select value={cfg.acao ?? "alternar"} onValueChange={(v) => setCfg({ acao: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="alternar">Liga e desliga</SelectItem>
                      <SelectItem value="ligar">Somente ligar</SelectItem>
                      <SelectItem value="desligar">Somente desligar</SelectItem>
                      <SelectItem value="pulso">Pulso (portão/porta)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {blocoEdit?.tipo === "imagem" && (
              <div className="space-y-2">
                <Label>Imagem</Label>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={enviando}
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    setEnviando(true);
                    const caminho = await enviarImagemAutomacao(f);
                    setEnviando(false);
                    if (!caminho) return toast.error("Não foi possível enviar a imagem.");
                    setCfg({ caminho, url: undefined });
                    toast.success("Imagem enviada.");
                  }}
                />
                {enviando && <p className="text-xs text-muted-foreground">Enviando imagem...</p>}
                {cfg.caminho && <p className="text-xs text-muted-foreground">Imagem enviada e salva.</p>}
                <div>
                  <Label>Ou endereço da imagem (link)</Label>
                  <Input
                    value={cfg.url ?? ""}
                    placeholder="https://..."
                    onChange={(e) => setCfg({ url: e.target.value || undefined })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Ajuste</Label>
                    <Select value={cfg.ajuste ?? "cobrir"} onValueChange={(v) => setCfg({ ajuste: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-popover">
                        <SelectItem value="cobrir">Preencher o bloco</SelectItem>
                        <SelectItem value="conter">Mostrar imagem inteira</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Opacidade (%)</Label>
                    <Input
                      type="number" min={10} max={100}
                      value={cfg.opacidade ?? 100}
                      onChange={(e) => setCfg({ opacidade: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            )}

            {blocoEdit?.tipo === "camera" && (
              <div>
                <Label>Câmera</Label>
                <Select
                  value={cfg.camera_id ?? ""}
                  onValueChange={(v) => {
                    const cam = cameras.find((c) => c.id === v);
                    setCfg({ camera_id: v, filial_id: cam?.filial_id ?? null });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Escolha a câmera" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {cameras.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!cameras.length && <p className="text-xs text-muted-foreground mt-1">Nenhuma câmera ativa cadastrada.</p>}
              </div>
            )}

            {blocoEdit?.tipo === "mapa" && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label>Latitude</Label>
                  <Input
                    value={cfg.lat ?? ""}
                    placeholder="-23.5505"
                    onChange={(e) => setCfg({ lat: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Longitude</Label>
                  <Input
                    value={cfg.lng ?? ""}
                    placeholder="-46.6333"
                    onChange={(e) => setCfg({ lng: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Zoom</Label>
                  <Input
                    type="number" min={3} max={19}
                    value={cfg.zoom ?? 15}
                    onChange={(e) => setCfg({ zoom: Number(e.target.value) })}
                  />
                </div>
              </div>
            )}

            {blocoEdit?.tipo === "cena" && (
              <div>
                <Label>O que o botão faz</Label>
                <Select value={cfg.acao ?? "alternar"} onValueChange={(v) => setCfg({ acao: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="alternar">Liga e desliga</SelectItem>
                    <SelectItem value="ligar">Somente ligar</SelectItem>
                    <SelectItem value="desligar">Somente desligar</SelectItem>
                    <SelectItem value="pulso">Pulso (portão/porta)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {blocoEdit?.tipo === "grafico" && (
              <div>
                <Label>Ler o estado a cada (segundos)</Label>
                <Input
                  type="number" min={10}
                  value={cfg.intervalo_seg ?? 30}
                  onChange={(e) => setCfg({ intervalo_seg: Number(e.target.value) })}
                />
              </div>
            )}

            {blocoEdit?.tipo !== "camera" && blocoEdit?.tipo !== "mapa" && (
              <div>
                <Label>Dispositivo</Label>
                <Select
                  value={blocoEdit?.device_id ?? ""}
                  onValueChange={(v) => setBlocoEdit((b) => ({ ...b, device_id: v }))}
                >
                  <SelectTrigger><SelectValue placeholder="Escolha o equipamento" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {dispositivos.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.nome} {d.ip ? `· ${d.ip}` : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>Canal</Label>
                <Input
                  type="number" min={0}
                  value={blocoEdit?.canal ?? 0}
                  onChange={(e) => setBlocoEdit((b) => ({ ...b, canal: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Largura</Label>
                <Input
                  type="number" min={2} max={12}
                  value={blocoEdit?.w ?? 3}
                  onChange={(e) => setBlocoEdit((b) => ({ ...b, w: Number(e.target.value) }))}
                />
              </div>
              <div>
                <Label>Altura</Label>
                <Input
                  type="number" min={1} max={6}
                  value={blocoEdit?.h ?? 2}
                  onChange={(e) => setBlocoEdit((b) => ({ ...b, h: Number(e.target.value) }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlocoEdit(null)}>Cancelar</Button>
            <Button onClick={gravarBloco}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </div>
  );
}
