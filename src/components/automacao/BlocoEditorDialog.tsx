import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Bloco, CameraSimples, DispositivoSimples, TIPOS_BLOCO, TipoBloco,
  enviarImagemAutomacao, salvarBloco, listarUnidades, UnidadeSimples,
} from "@/lib/automacao/api";
import { ANIMACOES } from "@/lib/automacao/icones";
import SeletorIcone from "@/components/automacao/SeletorIcone";
import BlocoCard from "@/components/automacao/BlocoCard";
import { MODULOS_PORTARIA } from "@/components/automacao/BlocoPortaria";
import { FONTES_TEXTO } from "@/components/automacao/BlocoTexto";
import { FORMAS } from "@/components/automacao/BlocoForma";

/** Tipos em que o estado ligado/desligado faz sentido na simulação. */
const TIPOS_COM_LIGADO = ["luz", "tomada", "icone", "cena", "ambiente", "imagemluz", "sensor"];

/** Tipos que não controlam equipamento: não mostram Dispositivo nem Canal. */
const TIPOS_SEM_DISPOSITIVO = [
  "camera", "mapa", "imagem", "rastreamento", "portaria", "pilarfone",
  "interfone", "texto", "forma", "clima", "grafico", "abas",
];



interface Props {
  bloco: Partial<Bloco> | null;
  dispositivos: DispositivoSimples[];
  cameras: CameraSimples[];
  onChange: (b: Partial<Bloco> | null) => void;
  onSalvo: (salvo?: Bloco | null) => void;
}

export default function BlocoEditorDialog({ bloco, dispositivos, cameras, onChange, onSalvo }: Props) {
  const [enviando, setEnviando] = useState(false);
  const [simLigado, setSimLigado] = useState(false);
  const [unidades, setUnidades] = useState<UnidadeSimples[]>([]);

  useEffect(() => {
    if ((bloco?.tipo === "rastreamento" || bloco?.tipo === "portaria") && unidades.length === 0) {
      listarUnidades().then(setUnidades);
    }
  }, [bloco?.tipo, unidades.length]);
  const blocoEdit = bloco;
  const setBlocoEdit = (fn: (b: Partial<Bloco> | null) => Partial<Bloco>) => onChange(fn(blocoEdit));
  const cfg = (blocoEdit?.config ?? {}) as Record<string, any>;
  const setCfg = (patch: Record<string, any>) =>
    setBlocoEdit((b) => ({ ...b, config: { ...((b?.config ?? {}) as Record<string, any>), ...patch } }));

  const gravar = async () => {
    if (!blocoEdit?.nome?.trim()) { toast.error("Informe o nome do elemento."); return; }
    if (!blocoEdit.ambiente_id) { toast.error("Escolha o ambiente."); return; }
    const salvo = await salvarBloco(blocoEdit);
    onChange(null);
    toast.success("Elemento salvo.");
    onSalvo(salvo);
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
              {TIPOS_COM_LIGADO.includes(blocoEdit?.tipo ?? "") && (
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={simLigado}
                    onChange={(e) => setSimLigado(e.target.checked)}
                    className="h-4 w-4 accent-primary"
                  />
                  Simular ligado
                </label>
              )}
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
              <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
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
                          <span className="flex flex-col items-start text-left">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Cor ativada</Label>
                  <input
                    type="color"
                    value={(cfg.corAtivo as string) ?? "#3b82f6"}
                    onChange={(e) => setCfg({ corAtivo: e.target.value })}
                    className="h-8 w-12 cursor-pointer rounded border bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Cor desativada</Label>
                  <input
                    type="color"
                    value={(cfg.corInativo as string) ?? "#64748b"}
                    onChange={(e) => setCfg({ corInativo: e.target.value })}
                    className="h-8 w-12 cursor-pointer rounded border bg-transparent"
                  />
                </div>
              </div>
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
              <div>
                <Label className="text-xs">Transparência ({cfg.opacidade ?? 100}%)</Label>
                <input
                  type="range" min={0} max={100} step={5}
                  value={cfg.opacidade ?? 100}
                  onChange={(e) => setCfg({ opacidade: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
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

          {(blocoEdit?.tipo === "imagem" || blocoEdit?.tipo === "ambiente" || blocoEdit?.tipo === "imagemluz") && (
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
              <div className={cn("grid grid-cols-2 gap-2", blocoEdit?.tipo === "ambiente" && "hidden")}>
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
              {blocoEdit?.tipo === "imagem" && (
                <div className="rounded-md border p-3 space-y-2">
                  <Label className="text-sm font-semibold">Fundo do bloco</Label>
                  <p className="text-xs text-muted-foreground">
                    Deixe sem cor para usar imagens PNG com fundo transparente.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="color"
                      className="h-10 w-14 p-1"
                      value={(cfg.fundo_cor as string) ?? "#000000"}
                      onChange={(e) => setCfg({ fundo_cor: e.target.value })}
                    />
                    <Button type="button" variant="outline" size="sm" onClick={() => setCfg({ fundo_cor: undefined })}>
                      Sem fundo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {blocoEdit?.tipo === "ambiente" && (
            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-sm font-semibold">Fundo do cartão</Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.semFundo === true}
                  onChange={(e) => setCfg({ semFundo: e.target.checked })}
                />
                Sem fundo (transparente)
              </label>
              {cfg.semFundo !== true && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Cor do fundo</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        className="h-10 w-14 p-1"
                        value={(cfg.fundoCor as string) ?? "#1c1c1e"}
                        onChange={(e) => setCfg({ fundoCor: e.target.value })}
                      />
                      <Button type="button" variant="outline" onClick={() => setCfg({ fundoCor: undefined })}>
                        Padrão
                      </Button>
                    </div>
                  </div>
                  <div>
                    <Label>Tom do fundo (%)</Label>
                    <Input
                      type="number" min={0} max={100}
                      value={(cfg.fundoOpacidade as number) ?? 100}
                      onChange={(e) => setCfg({ fundoOpacidade: Number(e.target.value) })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {blocoEdit?.tipo === "imagemluz" && (
            <div className="space-y-2 rounded-md border p-3">
              <Label className="text-sm font-semibold">Efeito de aceso</Label>
              <p className="text-xs text-muted-foreground">
                Use uma imagem PNG com fundo transparente por cima de outra imagem para mostrar a luz acesa.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Visível quando aceso (%)</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={(cfg.opacidadeAceso as number) ?? 100}
                    onChange={(e) => setCfg({ opacidadeAceso: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Visível quando apagado (%)</Label>
                  <Input
                    type="number" min={0} max={100}
                    value={(cfg.opacidadeApagado as number) ?? 0}
                    onChange={(e) => setCfg({ opacidadeApagado: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Brilho (px)</Label>
                  <Input
                    type="number" min={0} max={120}
                    value={(cfg.brilho as number) ?? 24}
                    onChange={(e) => setCfg({ brilho: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Cor do brilho</Label>
                  <Input
                    type="color"
                    className="h-10 w-14 p-1"
                    value={(cfg.corBrilho as string) ?? "#ffd479"}
                    onChange={(e) => setCfg({ corBrilho: e.target.value })}
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.legenda === true}
                  onChange={(e) => setCfg({ legenda: e.target.checked })}
                />
                Mostrar o nome sobre a imagem
              </label>
            </div>
          )}

          {blocoEdit?.tipo === "clima" && (
            <div className="space-y-3">
              <BuscaCidade
                cidade={cfg.cidade}
                onEscolher={(c) => setCfg({ cidade: c.nome, latitude: c.lat, longitude: c.lon })}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Latitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={cfg.latitude ?? ""}
                    placeholder="-23.5505"
                    onChange={(e) => setCfg({ latitude: e.target.value === "" ? undefined : Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Longitude</Label>
                  <Input
                    type="number"
                    step="0.0001"
                    value={cfg.longitude ?? ""}
                    placeholder="-46.6333"
                    onChange={(e) => setCfg({ longitude: e.target.value === "" ? undefined : Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.mostrar_hora !== false} onChange={(e) => setCfg({ mostrar_hora: e.target.checked })} />
                  Mostrar hora
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.mostrar_data !== false} onChange={(e) => setCfg({ mostrar_data: e.target.checked })} />
                  Mostrar data
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.mostrar_clima !== false} onChange={(e) => setCfg({ mostrar_clima: e.target.checked })} />
                  Mostrar clima
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.mostrar_detalhes !== false} onChange={(e) => setCfg({ mostrar_detalhes: e.target.checked })} />
                  Umidade e vento
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.segundos === true} onChange={(e) => setCfg({ segundos: e.target.checked })} />
                  Mostrar segundos
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={cfg.layout === "horizontal"} onChange={(e) => setCfg({ layout: e.target.checked ? "horizontal" : "vertical" })} />
                  Lado a lado
                </label>
              </div>
              <div>
                <Label className="text-xs">Fonte</Label>
                <Select value={cfg.fonte ?? "system"} onValueChange={(v) => setCfg({ fonte: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {FONTES_TEXTO.map((f) => (
                      <SelectItem key={f.valor} value={f.valor}>{f.rotulo}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Cor do texto</Label>
                  <input type="color" value={cfg.cor || "#f1f5f9"} onChange={(e) => setCfg({ cor: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
                </div>
                <div>
                  <Label className="text-xs">Cor secundária</Label>
                  <input type="color" value={cfg.cor_secundaria || "#94a3b8"} onChange={(e) => setCfg({ cor_secundaria: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
                </div>
                <div>
                  <Label className="text-xs">Fundo</Label>
                  <input type="color" value={cfg.fundo || "#1c1f26"} onChange={(e) => setCfg({ fundo: e.target.value })} className="h-8 w-full cursor-pointer rounded border bg-transparent" />
                  {cfg.fundo && (
                    <button type="button" className="text-[11px] text-muted-foreground underline" onClick={() => setCfg({ fundo: undefined })}>
                      remover
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Tamanho da hora ({cfg.tamanho_hora ?? 44}px)</Label>
                  <input type="range" min={12} max={120} value={cfg.tamanho_hora ?? 44} onChange={(e) => setCfg({ tamanho_hora: Number(e.target.value) })} className="w-full accent-primary" />
                </div>
                <div>
                  <Label className="text-xs">Tamanho da data ({cfg.tamanho_data ?? 14}px)</Label>
                  <input type="range" min={8} max={48} value={cfg.tamanho_data ?? 14} onChange={(e) => setCfg({ tamanho_data: Number(e.target.value) })} className="w-full accent-primary" />
                </div>
                <div>
                  <Label className="text-xs">Tamanho da temperatura ({cfg.tamanho_temp ?? 28}px)</Label>
                  <input type="range" min={12} max={96} value={cfg.tamanho_temp ?? 28} onChange={(e) => setCfg({ tamanho_temp: Number(e.target.value) })} className="w-full accent-primary" />
                </div>
              </div>
            </div>
          )}

          {blocoEdit?.tipo === "forma" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Formato</Label>
                <Select value={cfg.forma ?? "retangulo"} onValueChange={(v) => setCfg({ forma: v })}>
                  <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {FORMAS.map((f) => <SelectItem key={f.valor} value={f.valor}>{f.rotulo}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Cor de fundo</Label>
                  <div className="flex gap-1">
                    <Input type="color" className="w-12 p-1" value={cfg.fundo ?? "#1f2937"} onChange={(e) => setCfg({ fundo: e.target.value })} />
                    <Input value={cfg.fundo ?? ""} placeholder="transparente" onChange={(e) => setCfg({ fundo: e.target.value || undefined })} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Cor da borda</Label>
                  <div className="flex gap-1">
                    <Input type="color" className="w-12 p-1" value={cfg.borda_cor ?? "#ffffff"} onChange={(e) => setCfg({ borda_cor: e.target.value })} />
                    <Input value={cfg.borda_cor ?? "#ffffff"} onChange={(e) => setCfg({ borda_cor: e.target.value })} />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs">Espessura da borda ({cfg.borda_espessura ?? 2}px)</Label>
                <input type="range" min={0} max={30} value={cfg.borda_espessura ?? 2} onChange={(e) => setCfg({ borda_espessura: Number(e.target.value) })} className="w-full accent-primary" />
              </div>

              <div>
                <Label className="text-xs">Tipo de borda</Label>
                <Select value={cfg.borda_estilo ?? "solid"} onValueChange={(v) => setCfg({ borda_estilo: v })}>
                  <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="solid">Linha contínua</SelectItem>
                    <SelectItem value="dashed">Tracejada</SelectItem>
                    <SelectItem value="dotted">Pontilhada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(cfg.forma ?? "retangulo") === "retangulo" && (
                <div>
                  <Label className="text-xs">Cantos arredondados ({cfg.cantos ?? 12}px)</Label>
                  <input type="range" min={0} max={80} value={cfg.cantos ?? 12} onChange={(e) => setCfg({ cantos: Number(e.target.value) })} className="w-full accent-primary" />
                </div>
              )}

              <div>
                <Label className="text-xs">Transparência ({cfg.opacidade ?? 100}%)</Label>
                <input type="range" min={0} max={100} value={cfg.opacidade ?? 100} onChange={(e) => setCfg({ opacidade: Number(e.target.value) })} className="w-full accent-primary" />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!cfg.fundo} onChange={(e) => setCfg({ fundo: e.target.checked ? undefined : "#1f2937" })} />
                  Sem preenchimento
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={cfg.sombra === true} onChange={(e) => setCfg({ sombra: e.target.checked })} />
                  Sombra
                </label>
              </div>
            </div>
          )}

          {blocoEdit?.tipo === "abas" && (
            <div className="space-y-2 rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">
                Mostra os ambientes deste mesmo tipo de tela como botões. Ao tocar, o painel troca de ambiente.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Disposição</Label>
                  <Select value={cfg.orientacao ?? "horizontal"} onValueChange={(v) => setCfg({ orientacao: v })}>
                    <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="horizontal">Lado a lado</SelectItem>
                      <SelectItem value="vertical">Em coluna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Formato</Label>
                  <Select value={cfg.formato ?? "redondo"} onValueChange={(v) => setCfg({ formato: v })}>
                    <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="redondo">Arredondado</SelectItem>
                      <SelectItem value="reto">Cantos retos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Tamanho da letra</Label>
                  <Input type="number" min={8} max={80} value={cfg.tamanho ?? 16}
                    onChange={(e) => setCfg({ tamanho: Number(e.target.value) })} />
                </div>
                <div>
                  <Label className="text-xs">Cor da letra</Label>
                  <Input type="color" className="p-1" value={cfg.cor ?? "#e5e7eb"}
                    onChange={(e) => setCfg({ cor: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Fundo do botão</Label>
                  <Input type="color" className="p-1" value={cfg.fundo ?? "#1f2937"}
                    onChange={(e) => setCfg({ fundo: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Fundo do ambiente aberto</Label>
                  <Input type="color" className="p-1" value={cfg.corAtiva ?? "#2563eb"}
                    onChange={(e) => setCfg({ corAtiva: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {blocoEdit?.tipo === "texto" && (
            <div className="space-y-2">
              <div>
                <Label>Texto</Label>
                <Textarea
                  rows={3}
                  value={cfg.texto ?? ""}
                  placeholder="Escreva aqui..."
                  onChange={(e) => setCfg({ texto: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Fonte da letra</Label>
                <Select value={cfg.fonte ?? "system"} onValueChange={(v) => setCfg({ fonte: v })}>
                  <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {FONTES_TEXTO.map((f) => (
                      <SelectItem key={f.valor} value={f.valor} className="text-left">
                        <span style={{ fontFamily: f.css }}>{f.rotulo}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs">Tamanho</Label>
                  <Input
                    type="number" min={8} max={200}
                    value={cfg.tamanho ?? 20}
                    onChange={(e) => setCfg({ tamanho: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cor da letra</Label>
                  <div className="flex gap-1">
                    <Input
                      type="color"
                      className="w-12 p-1"
                      value={cfg.cor ?? "#ffffff"}
                      onChange={(e) => setCfg({ cor: e.target.value })}
                    />
                    <Input
                      value={cfg.cor ?? "#ffffff"}
                      onChange={(e) => setCfg({ cor: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Cor do fundo</Label>
                  <div className="flex gap-1">
                    <Input
                      type="color"
                      className="w-12 p-1"
                      value={cfg.fundo ?? "#000000"}
                      onChange={(e) => setCfg({ fundo: e.target.value })}
                    />
                    <Input
                      value={cfg.fundo ?? ""}
                      placeholder="transparente"
                      onChange={(e) => setCfg({ fundo: e.target.value || undefined })}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Alinhamento</Label>
                  <Select value={cfg.alinhamento ?? "left"} onValueChange={(v) => setCfg({ alinhamento: v })}>
                    <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="left">À esquerda</SelectItem>
                      <SelectItem value="center">Centralizado</SelectItem>
                      <SelectItem value="right">À direita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Posição na altura</Label>
                  <Select value={cfg.vertical ?? "center"} onValueChange={(v) => setCfg({ vertical: v })}>
                    <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="start">Em cima</SelectItem>
                      <SelectItem value="center">No meio</SelectItem>
                      <SelectItem value="end">Embaixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={cfg.negrito !== false}
                    onChange={(e) => setCfg({ negrito: e.target.checked })}
                  />
                  Negrito
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={cfg.italico === true}
                    onChange={(e) => setCfg({ italico: e.target.checked })}
                  />
                  Itálico
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={cfg.sublinhado === true}
                    onChange={(e) => setCfg({ sublinhado: e.target.checked })}
                  />
                  Sublinhado
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={cfg.sombra === true}
                    onChange={(e) => setCfg({ sombra: e.target.checked })}
                  />
                  Sombra no texto
                </label>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!cfg.fundo}
                  onChange={(e) => setCfg({ fundo: e.target.checked ? undefined : "#000000" })}
                />
                Fundo transparente
              </label>
            </div>
          )}

          {blocoEdit?.tipo === "rastreamento" && (
            <div className="space-y-2">
              <div>
                <Label>Veículos exibidos</Label>
                <Select
                  value={cfg.unidade_id ?? "todos"}
                  onValueChange={(v) => setCfg({ unidade_id: v === "todos" ? null : v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="todos">Todos os veículos</SelectItem>
                    {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
                {!unidades.length && (
                  <p className="mt-1 text-[11px] text-muted-foreground">Nenhuma unidade cadastrada.</p>
                )}
              </div>
              <div>
                <Label>Atualizar a cada (segundos)</Label>
                <Input
                  type="number" min={10}
                  value={cfg.intervalo_seg ?? 30}
                  onChange={(e) => setCfg({ intervalo_seg: Number(e.target.value) })}
                />
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

          {blocoEdit?.tipo === "portaria" && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-sm font-semibold">Controle de portaria</Label>
              <Select value={cfg.modulo ?? "visitantes"} onValueChange={(v) => setCfg({ modulo: v })}>
                <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {MODULOS_PORTARIA.map((m) => (
                    <SelectItem key={m.valor} value={m.valor}>
                      <span className="flex flex-col items-start text-left">
                        <span>{m.label}</span>
                        <span className="text-[11px] text-muted-foreground">{m.descricao}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div>
                <Label>Unidade</Label>
                <Select
                  value={cfg.unidade_id ?? "todas"}
                  onValueChange={(v) => setCfg({ unidade_id: v === "todas" ? null : v })}
                >
                  <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="todas">Todas as unidades</SelectItem>
                    {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade de registros na lista</Label>
                <Input
                  type="number" min={1} max={20}
                  value={cfg.limite ?? 4}
                  onChange={(e) => setCfg({ limite: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.mostrar_lista !== false}
                  onChange={(e) => setCfg({ mostrar_lista: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Mostrar os últimos registros
              </label>
              <div>
                <Label className="text-xs">Atualizar a cada (segundos)</Label>
                <Input
                  type="number" min={10}
                  value={cfg.intervalo_seg ?? 30}
                  onChange={(e) => setCfg({ intervalo_seg: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-2 rounded-md border border-dashed p-2">
                <Label className="text-xs font-semibold">Aparência</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Cor de fundo</Label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        className="h-8 w-9 cursor-pointer rounded border"
                        value={cfg.cor_fundo || "#1c1f26"}
                        onChange={(e) => setCfg({ cor_fundo: e.target.value })}
                      />
                      {cfg.cor_fundo && (
                        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setCfg({ cor_fundo: undefined })}>
                          Padrão
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Cor do texto</Label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        className="h-8 w-9 cursor-pointer rounded border"
                        value={cfg.cor_texto || "#f1f5f9"}
                        onChange={(e) => setCfg({ cor_texto: e.target.value })}
                      />
                      {cfg.cor_texto && (
                        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setCfg({ cor_texto: undefined })}>
                          Padrão
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Cor secundária</Label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        className="h-8 w-9 cursor-pointer rounded border"
                        value={cfg.cor_secundaria || "#94a3b8"}
                        onChange={(e) => setCfg({ cor_secundaria: e.target.value })}
                      />
                      {cfg.cor_secundaria && (
                        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setCfg({ cor_secundaria: undefined })}>
                          Padrão
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Cor de destaque</Label>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        className="h-8 w-9 cursor-pointer rounded border"
                        value={cfg.cor_destaque || "#3b82f6"}
                        onChange={(e) => setCfg({ cor_destaque: e.target.value })}
                      />
                      {cfg.cor_destaque && (
                        <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setCfg({ cor_destaque: undefined })}>
                          Padrão
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-xs">Título (px)</Label>
                    <Input
                      type="number" min={10} max={48}
                      value={cfg.tamanho_titulo ?? 14}
                      onChange={(e) => setCfg({ tamanho_titulo: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Texto (px)</Label>
                    <Input
                      type="number" min={9} max={40}
                      value={cfg.tamanho_texto ?? 12}
                      onChange={(e) => setCfg({ tamanho_texto: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Número (px)</Label>
                    <Input
                      type="number" min={14} max={96}
                      value={cfg.tamanho_numero ?? 24}
                      onChange={(e) => setCfg({ tamanho_numero: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {blocoEdit?.tipo === "interfone" && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-sm font-semibold">Interfone</Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.abrir_ao_tocar !== false}
                  onChange={(e) => setCfg({ abrir_ao_tocar: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Abrir sozinho quando tocarem a campainha
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={cfg.som !== false}
                  onChange={(e) => setCfg({ som: e.target.checked })}
                  className="h-4 w-4 accent-primary"
                />
                Tocar aviso sonoro
              </label>
            </div>
          )}

          {blocoEdit?.tipo === "pilarfone" && (
            <div className="space-y-2 rounded-lg border p-3">
              <Label className="text-sm font-semibold">Pilar Fone</Label>
              <div>
                <Label className="text-xs">Número ou ramal (deixe vazio para só abrir o telefone)</Label>
                <Input
                  value={cfg.numero ?? ""}
                  placeholder="1200"
                  onChange={(e) => setCfg({ numero: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Nome do contato</Label>
                <Input
                  value={cfg.contato ?? ""}
                  placeholder="Portaria"
                  onChange={(e) => setCfg({ contato: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Tela que abre</Label>
                <Select value={cfg.aba ?? "ramais"} onValueChange={(v) => setCfg({ aba: v })}>
                  <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="ramais">Ramais do CRM</SelectItem>
                    <SelectItem value="cadastros">Cadastros</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                    <SelectItem value="chamadas">Chamadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {!TIPOS_SEM_DISPOSITIVO.includes(blocoEdit?.tipo ?? "") && (
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
          <div className={TIPOS_SEM_DISPOSITIVO.includes(blocoEdit?.tipo ?? "") ? "grid grid-cols-2 gap-2" : "grid grid-cols-3 gap-2"}>
            {!TIPOS_SEM_DISPOSITIVO.includes(blocoEdit?.tipo ?? "") && (
              <div>
                <Label>Canal</Label>
                <Input
                  type="number" min={0}
                  value={blocoEdit?.canal ?? 0}
                  onChange={(e) => setBlocoEdit((b) => ({ ...b, canal: Number(e.target.value) }))}
                />
              </div>
            )}

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

/** Busca a cidade pelo nome (serviço público Open-Meteo) e preenche latitude/longitude. */
function BuscaCidade({ cidade, onEscolher }: { cidade?: string; onEscolher: (c: { nome: string; lat: number; lon: number }) => void }) {
  const [termo, setTermo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [itens, setItens] = useState<{ nome: string; lat: number; lon: number }[]>([]);

  const buscar = async () => {
    if (termo.trim().length < 2) return;
    setBuscando(true);
    try {
      const r = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(termo.trim())}&count=6&language=pt&format=json`,
      );
      const j = await r.json();
      setItens(
        (j.results ?? []).map((x: any) => ({
          nome: [x.name, x.admin1, x.country_code].filter(Boolean).join(", "),
          lat: x.latitude,
          lon: x.longitude,
        })),
      );
      if (!j.results?.length) toast.error("Nenhuma cidade encontrada.");
    } catch {
      toast.error("Não foi possível buscar a cidade agora.");
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs">Cidade {cidade ? `(atual: ${cidade})` : ""}</Label>
      <div className="flex gap-2">
        <Input
          value={termo}
          placeholder="Ex.: Campinas"
          onChange={(e) => setTermo(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              buscar();
            }
          }}
        />
        <Button type="button" variant="outline" onClick={buscar} disabled={buscando}>
          {buscando ? "Buscando..." : "Buscar"}
        </Button>
      </div>
      {itens.length > 0 && (
        <div className="max-h-40 space-y-1 overflow-auto rounded-md border p-1">
          {itens.map((c) => (
            <button
              key={`${c.lat},${c.lon}`}
              type="button"
              className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-muted"
              onClick={() => {
                onEscolher(c);
                setItens([]);
                setTermo("");
              }}
            >
              {c.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
