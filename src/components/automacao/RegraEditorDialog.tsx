import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Ambiente, Bloco, DispositivoSimples } from "@/lib/automacao/api";
import {
  ACOES, Acao, CONDICOES, Condicao, DIAS_SEMANA, GATILHOS, Regra, salvarRegra,
} from "@/lib/automacao/workflow";

interface Props {
  regra: Partial<Regra> | null;
  ambientes: Ambiente[];
  blocos: Bloco[];
  dispositivos: DispositivoSimples[];
  onChange: (r: Partial<Regra> | null) => void;
  onSalvo: () => void;
}

const SEM = "__nenhum__";

export default function RegraEditorDialog({ regra, ambientes, blocos, dispositivos, onChange, onSalvo }: Props) {
  const [salvando, setSalvando] = useState(false);
  if (!regra) return null;

  const gatilho = regra.gatilho ?? { tipo: "bloco_clicado" as const };
  const condicoes = regra.condicoes ?? [];
  const acoes = regra.acoes ?? [];
  const blocosDoAmbiente = regra.ambiente_id ? blocos.filter((b) => b.ambiente_id === regra.ambiente_id) : blocos;

  const set = (p: Partial<Regra>) => onChange({ ...regra, ...p });
  const setCondicao = (i: number, c: Partial<Condicao>) =>
    set({ condicoes: condicoes.map((x, idx) => (idx === i ? { ...x, ...c } : x)) });
  const setAcao = (i: number, a: Partial<Acao>) =>
    set({ acoes: acoes.map((x, idx) => (idx === i ? { ...x, ...a } : x)) });

  const salvar = async () => {
    if (!regra.nome?.trim()) { toast.error("Dê um nome para a automação."); return; }
    if (!acoes.length) { toast.error("Adicione pelo menos uma ação."); return; }
    setSalvando(true);
    const salvo = await salvarRegra(regra);
    setSalvando(false);
    if (!salvo) { toast.error("Não foi possível salvar a automação."); return; }
    toast.success("Automação salva.");
    onChange(null);
    onSalvo();
  };

  const seletorBloco = (valor: string | null | undefined, aoMudar: (v: string | null) => void, rotulo = "Elemento") => (
    <div className="space-y-1">
      <Label className="text-xs">{rotulo}</Label>
      <Select value={valor ?? SEM} onValueChange={(v) => aoMudar(v === SEM ? null : v)}>
        <SelectTrigger className="text-left"><SelectValue placeholder="Escolher" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={SEM}>Qualquer</SelectItem>
          {blocosDoAmbiente.map((b) => (
            <SelectItem key={b.id} value={b.id}>{b.nome || "Sem nome"}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const seletorDispositivo = (valor: string | null | undefined, aoMudar: (v: string | null) => void) => (
    <div className="space-y-1">
      <Label className="text-xs">Equipamento</Label>
      <Select value={valor ?? SEM} onValueChange={(v) => aoMudar(v === SEM ? null : v)}>
        <SelectTrigger className="text-left"><SelectValue placeholder="Escolher" /></SelectTrigger>
        <SelectContent>
          <SelectItem value={SEM}>Escolher</SelectItem>
          {dispositivos.map((d) => (
            <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onChange(null)}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{regra.id ? "Editar automação" : "Nova automação"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={regra.nome ?? ""}
                onChange={(e) => set({ nome: e.target.value })}
                placeholder="Ex.: Botão da sala acende tudo"
              />
            </div>
            <div className="space-y-1">
              <Label>Ambiente</Label>
              <Select
                value={regra.ambiente_id ?? SEM}
                onValueChange={(v) => set({ ambiente_id: v === SEM ? null : v })}
              >
                <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM}>Todos os ambientes</SelectItem>
                  {ambientes.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Switch checked={regra.ativo !== false} onCheckedChange={(v) => set({ ativo: v })} />
            <span className="text-sm">{regra.ativo !== false ? "Automação ligada" : "Automação desligada"}</span>
          </div>

          {/* Gatilho */}
          <div className="rounded-xl border p-3 space-y-3">
            <p className="text-sm font-semibold">Quando acontecer</p>
            <Select
              value={gatilho.tipo}
              onValueChange={(v) => set({ gatilho: { ...gatilho, tipo: v as any } })}
            >
              <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GATILHOS.map((g) => (
                  <SelectItem key={g.valor} value={g.valor} className="text-left">
                    <span className="block">{g.label}</span>
                    <span className="block text-xs text-muted-foreground">{g.descricao}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {["bloco_clicado", "bloco_ligado", "bloco_desligado"].includes(gatilho.tipo) &&
              seletorBloco(gatilho.bloco_id, (v) => set({ gatilho: { ...gatilho, bloco_id: v } }))}
            {["dispositivo_ligado", "dispositivo_desligado"].includes(gatilho.tipo) &&
              seletorDispositivo(gatilho.device_id, (v) => set({ gatilho: { ...gatilho, device_id: v } }))}
          </div>

          {/* Condições */}
          <div className="rounded-xl border p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">Só se</p>
              <Select
                value={regra.combinador ?? "todas"}
                onValueChange={(v) => set({ combinador: v as "todas" | "qualquer" })}
              >
                <SelectTrigger className="h-8 w-56 text-left"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as condições valerem</SelectItem>
                  <SelectItem value="qualquer">Qualquer condição valer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => set({ condicoes: [...condicoes, { tipo: "sempre" }] })}
              >
                <Plus className="h-4 w-4 mr-1" /> Condição
              </Button>
            </div>
            {!condicoes.length && (
              <p className="text-xs text-muted-foreground">Sem condições: a automação roda sempre que o gatilho acontecer.</p>
            )}
            {condicoes.map((c, i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Condição</Label>
                  <Select value={c.tipo} onValueChange={(v) => setCondicao(i, { tipo: v as any })}>
                    <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONDICOES.map((x) => (
                        <SelectItem key={x.valor} value={x.valor} className="text-left">{x.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {["bloco_ligado", "bloco_desligado"].includes(c.tipo) &&
                  seletorBloco(c.bloco_id, (v) => setCondicao(i, { bloco_id: v }))}
                {["dispositivo_ligado", "dispositivo_desligado"].includes(c.tipo) &&
                  seletorDispositivo(c.device_id, (v) => setCondicao(i, { device_id: v }))}
                {c.tipo === "horario_entre" && (
                  <div className="flex items-end gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Das</Label>
                      <Input type="time" value={c.de ?? "18:00"} onChange={(e) => setCondicao(i, { de: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Até</Label>
                      <Input type="time" value={c.ate ?? "23:00"} onChange={(e) => setCondicao(i, { ate: e.target.value })} />
                    </div>
                  </div>
                )}
                {c.tipo === "dia_semana" && (
                  <div className="flex flex-wrap gap-1">
                    {DIAS_SEMANA.map((d) => {
                      const marcado = (c.dias ?? []).includes(d.valor);
                      return (
                        <Button
                          key={d.valor}
                          size="sm"
                          variant={marcado ? "default" : "outline"}
                          onClick={() =>
                            setCondicao(i, {
                              dias: marcado
                                ? (c.dias ?? []).filter((x) => x !== d.valor)
                                : [...(c.dias ?? []), d.valor],
                            })
                          }
                        >
                          {d.label}
                        </Button>
                      );
                    })}
                  </div>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="justify-self-end"
                  onClick={() => set({ condicoes: condicoes.filter((_, idx) => idx !== i) })}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>

          {/* Ações */}
          <div className="rounded-xl border p-3 space-y-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">Então fazer</p>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => set({ acoes: [...acoes, { tipo: "ligar", alvo: "dispositivo" }] })}
              >
                <Plus className="h-4 w-4 mr-1" /> Ação
              </Button>
            </div>
            {!acoes.length && <p className="text-xs text-muted-foreground">Adicione o que deve acontecer.</p>}
            {acoes.map((a, i) => (
              <div key={i} className="grid gap-2 rounded-lg border p-2 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Ação</Label>
                  <Select value={a.tipo} onValueChange={(v) => setAcao(i, { tipo: v as any })}>
                    <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACOES.map((x) => (
                        <SelectItem key={x.valor} value={x.valor} className="text-left">{x.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {["ligar", "desligar", "alternar", "pulso", "status"].includes(a.tipo) && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-xs">Aplicar em</Label>
                      <Select value={a.alvo ?? "dispositivo"} onValueChange={(v) => setAcao(i, { alvo: v as any })}>
                        <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dispositivo">Um equipamento</SelectItem>
                          <SelectItem value="bloco">Um elemento do painel</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {(a.alvo ?? "dispositivo") === "bloco"
                      ? seletorBloco(a.bloco_id, (v) => setAcao(i, { bloco_id: v }))
                      : seletorDispositivo(a.device_id, (v) => setAcao(i, { device_id: v }))}
                  </>
                )}
                {a.tipo === "esperar" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Segundos</Label>
                    <Input
                      type="number" min={1} max={300}
                      value={a.segundos ?? 2}
                      onChange={(e) => setAcao(i, { segundos: Number(e.target.value) || 1 })}
                    />
                  </div>
                )}
                {a.tipo === "mensagem" && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Texto do aviso</Label>
                    <Input value={a.texto ?? ""} onChange={(e) => setAcao(i, { texto: e.target.value })} />
                  </div>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="justify-self-end"
                  onClick={() => set({ acoes: acoes.filter((_, idx) => idx !== i) })}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onChange(null)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
