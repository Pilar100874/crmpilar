import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Ambiente, Bloco, CameraSimples, DispositivoSimples, TIPOS_BLOCO, TipoBloco,
  enviarImagemAutomacao, salvarBloco,
} from "@/lib/automacao/api";
import { ANIMACOES } from "@/lib/automacao/icones";
import SeletorIcone from "@/components/automacao/SeletorIcone";
import BlocoCard from "@/components/automacao/BlocoCard";

interface Props {
  bloco: Partial<Bloco> | null;
  ambientes: Ambiente[];
  dispositivos: DispositivoSimples[];
  cameras: CameraSimples[];
  onChange: (b: Partial<Bloco> | null) => void;
  onSalvo: () => void;
}

export default function BlocoEditorDialog({ bloco, ambientes, dispositivos, cameras, onChange, onSalvo }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [simLigado, setSimLigado] = useState(false);
  const blocoEdit = bloco;
  const setBlocoEdit = (fn: (b: Partial<Bloco> | null) => Partial<Bloco>) => onChange(fn(blocoEdit));
  const cfg = (blocoEdit?.config ?? {}) as Record<string, any>;
  const setCfg = (patch: Record<string, any>) =>
    setBlocoEdit((b) => ({ ...b, config: { ...((b?.config ?? {}) as Record<string, any>), ...patch } }));

  const gravar = async () => {
    if (!blocoEdit?.nome?.trim()) { toast.error("Informe o nome do elemento."); return; }
    if (!blocoEdit.ambiente_id) { toast.error("Escolha o ambiente."); return; }
    await salvarBloco(blocoEdit);
    onChange(null);
    toast.success("Elemento salvo.");
    onSalvo();
  };

  const blocoPreview = {
    id: blocoEdit?.id ?? "preview",
    nome: blocoEdit?.nome?.trim() || "Novo elemento",
    tipo: (blocoEdit?.tipo ?? "luz") as TipoBloco,
    ambiente_id: blocoEdit?.ambiente_id ?? "",
    device_id: blocoEdit?.device_id ?? null,
    canal: blocoEdit?.canal ?? 0,
    x: 0, y: 0,
    w: blocoEdit?.w ?? 3,
    h: blocoEdit?.h ?? 2,
    visivel: true,
    config: cfg,
  } as unknown as Bloco;

  return (
    <Dialog open={!!blocoEdit} onOpenChange={(o) => !o && onChange(null)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{blocoEdit?.id ? "Editar elemento" : "Novo elemento"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <Label className="text-sm font-semibold">Simulação</Label>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={simLigado}
                  onChange={(e) => setSimLigado(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                Simular ligado
              </label>
            </div>
            <div className="flex items-center justify-center rounded-md bg-background/60 p-3">
              <div
                className="pointer-events-none"
                style={{
                  width: Math.min(320, (blocoEdit?.w ?? 3) * 56),
                  height: Math.min(220, (blocoEdit?.h ?? 2) * 56),
                }}
              >
                <BlocoCard bloco={blocoPreview} ligado={simLigado} onEstado={() => {}} />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Prévia apenas visual: nada é enviado para o equipamento.
            </p>
          </div>
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
                {(["Controle", "Informação", "Visual"] as const).map((grupo) => {
                  const itens = TIPOS_BLOCO.filter(
                    (t) => t.grupo === grupo && (!t.legado || t.valor === blocoEdit?.tipo),
                  );
                  if (!itens.length) return null;
                  return (
                    <SelectGroup key={grupo}>
                      <SelectLabel>{grupo}</SelectLabel>
                      {itens.map((t) => (
                        <SelectItem key={t.valor} value={t.valor}>
                          <span className="flex flex-col">
                            <span>{t.label}</span>
                            <span className="text-[11px] text-muted-foreground">{t.descricao}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  );
                })}
              </SelectContent>
            </Select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {TIPOS_BLOCO.find((t) => t.valor === (blocoEdit?.tipo ?? "luz"))?.descricao}
            </p>
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
          <div className="space-y-2 rounded-lg border p-3">
            <Label className="text-sm font-semibold">Aparência</Label>
            <div>
              <Label className="text-xs">Curvatura das bordas ({cfg.raio ?? 16}px)</Label>
              <input
                type="range" min={0} max={40} step={1}
                value={cfg.raio ?? 16}
                onChange={(e) => setCfg({ raio: Number(e.target.value) })}
                className="w-full accent-primary"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cfg.transparente === true}
                onChange={(e) => setCfg({ transparente: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Fundo transparente
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={cfg.legenda !== false}
                onChange={(e) => setCfg({ legenda: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Mostrar legenda (nome e situação)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={blocoEdit?.visivel !== false}
                onChange={(e) => setBlocoEdit((b) => ({ ...b, visivel: e.target.checked }))}
                className="h-4 w-4 accent-primary"
              />
              Visível no painel (desmarque para ocultar)
            </label>
          </div>

          {["luz", "tomada", "portao", "sensor"].includes(blocoEdit?.tipo ?? "") && (
            <div className="space-y-2">
              <Label>Visual do bloco</Label>
              <Select value={cfg.estilo ?? "padrao"} onValueChange={(v) => setCfg({ estilo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="padrao">Padrão</SelectItem>
                  <SelectItem value="realista">Botão realista (brilho 3D)</SelectItem>
                </SelectContent>
              </Select>
              {cfg.estilo === "realista" && (
                <div className="flex items-center gap-2">
                  <Label>Cor do brilho</Label>
                  <input
                    type="color"
                    value={cfg.cor ?? "#facc15"}
                    onChange={(e) => setCfg({ cor: e.target.value })}
                    className="h-8 w-12 cursor-pointer rounded border bg-transparent"
                  />
                </div>
              )}
            </div>
          )}
          {blocoEdit?.tipo === "icone" && (
            <div className="space-y-2">
              <Label>Elemento</Label>
              <SeletorIcone valor={cfg.icone} onChange={(n) => setCfg({ icone: n })} />
              <div>
                <Label className="text-xs">Tamanho do ícone ({cfg.tamanho ?? 0 ? `${cfg.tamanho}px` : "Automático"})</Label>
                <input
                  type="range" min={0} max={128} step={4}
                  value={cfg.tamanho ?? 0}
                  onChange={(e) => setCfg({ tamanho: Number(e.target.value) || undefined })}
                  className="w-full accent-primary"
                />
                <p className="text-[11px] text-muted-foreground">Em "Automático" o ícone cresce junto com o bloco.</p>
              </div>
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

          {blocoEdit?.tipo !== "camera" && blocoEdit?.tipo !== "mapa" && blocoEdit?.tipo !== "imagem" && (
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
          <Button variant="outline" onClick={() => onChange(null)}>Cancelar</Button>
          <Button onClick={gravar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
