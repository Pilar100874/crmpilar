import { useEffect, useState } from "react";
import { Node } from "@xyflow/react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, X, StickyNote } from "lucide-react";
import { TV_BLOCK_BY_TYPE, TvFlowNodeData, EVENTOS_SISTEMA_GRUPOS, ICONES_BARRA } from "@/types/tvWorkflow";

interface Props {
  node: Node | null;
  onChange: (id: string, data: Partial<TvFlowNodeData>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

const COMANDOS = [
  { value: "reiniciar_app", label: "Reiniciar aplicativo" },
  { value: "limpar_cache", label: "Limpar cache" },
  { value: "sincronizar", label: "Sincronizar" },
  { value: "atualizar_dashboard", label: "Atualizar dashboard" },
  { value: "bloquear", label: "Bloquear" },
  { value: "desbloquear", label: "Desbloquear" },
];

const DIAS = [
  { v: 0, l: "Dom" }, { v: 1, l: "Seg" }, { v: 2, l: "Ter" }, { v: 3, l: "Qua" },
  { v: 4, l: "Qui" }, { v: 5, l: "Sex" }, { v: 6, l: "Sáb" },
];

export function TvPropertiesPanel({ node, onChange, onDelete, onClose }: Props) {
  const [dashboards, setDashboards] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [estabelecimentos, setEstabelecimentos] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("tv_dashboards").select("id,nome").order("nome").then(({ data }) => setDashboards(data || []));
    supabase.from("tv_devices").select("id,nome").order("nome").then(({ data }) => setDevices(data || []));
    supabase.from("tv_groups").select("id,nome").order("nome").then(({ data }) => setGrupos(data || []));
    supabase.from("tv_playlists").select("id,nome").order("nome").then(({ data }) => setPlaylists(data || []));
    supabase.from("whatsapp_sessions").select("*").then(({ data }) => setSessoes(data || []));
    supabase.from("estabelecimentos").select("id,nome").order("nome").then(({ data }) => setEstabelecimentos(data || []));
  }, []);

  if (!node) return null;
  const nodeData = node.data as unknown as TvFlowNodeData;
  const def = TV_BLOCK_BY_TYPE[nodeData.type];
  if (!def) return null;

  const cfg = nodeData.config || {};
  const setCfg = (patch: Record<string, any>) =>
    onChange(node.id, { config: { ...cfg, ...patch } });

  return (
    <div className="w-80 h-[calc(100%-1rem)] m-2 rounded-2xl shadow-lg border-2 border-border bg-background flex flex-col overflow-hidden">
      <div className={`px-4 py-3 border-b flex items-center justify-between ${def.color}`}>
        <div className="flex items-center gap-2 min-w-0">
          <def.icon className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold truncate">{def.label}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div>
            <Label className="text-xs">Nome do bloco</Label>
            <Input
              value={nodeData.label || ""}
              onChange={(e) => onChange(node.id, { label: e.target.value })}
              placeholder={def.label}
            />
          </div>

          {/* ---------- Gatilhos ---------- */}
          {nodeData.type === "gatilho_evento" && (
            <div>
              <Label className="text-xs">Evento</Label>
              <Select value={cfg.evento || "manual"} onValueChange={(v) => setCfg({ evento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENTOS_SISTEMA_GRUPOS.map((g) => (
                    <div key={g.grupo}>
                      <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">{g.grupo}</div>
                      {g.itens.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {nodeData.type === "gatilho_agendado" && (
            <div>
              <Label className="text-xs">Expressão cron</Label>
              <Input value={cfg.cron || ""} onChange={(e) => setCfg({ cron: e.target.value })} placeholder="0 8 * * *" />
              <p className="text-[10px] text-muted-foreground mt-1">Ex.: <code>0 8 * * *</code> = todos os dias às 8h</p>
            </div>
          )}

          {nodeData.type === "gatilho_intervalo" && (
            <div>
              <Label className="text-xs">Intervalo (minutos)</Label>
              <Input
                type="number"
                min={1}
                max={1440}
                value={cfg.intervalo_min ?? 15}
                onChange={(e) => setCfg({ intervalo_min: parseInt(e.target.value) || 1 })}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Dispara a cada N minutos (mín. 1, máx. 1440).</p>
            </div>
          )}

          {/* Gatilhos de evento pré-fixado — permitem sobrescrever o evento */}
          {def.category === "gatilho" &&
            !["gatilho_evento", "gatilho_agendado", "gatilho_intervalo", "gatilho_webhook"].includes(nodeData.type) && (
              <Card className="p-3 text-xs space-y-2">
                <div>
                  <Label className="text-xs">Evento monitorado</Label>
                  <Input
                    value={cfg.evento || def.defaultData.evento || ""}
                    onChange={(e) => setCfg({ evento: e.target.value })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Este bloco escuta o evento acima. Você pode adicionar filtros extras nos campos abaixo.
                </p>
                <div>
                  <Label className="text-xs">Filtro adicional (opcional)</Label>
                  <Input
                    placeholder="Ex.: valor > 1000, placa = ABC1D23"
                    value={cfg.filtro_extra || ""}
                    onChange={(e) => setCfg({ filtro_extra: e.target.value })}
                  />
                </div>
              </Card>
            )}

          {nodeData.type === "gatilho_webhook" && (
            <Card className="p-3 text-xs text-muted-foreground">
              Este workflow será disparado quando um POST for enviado para o endpoint público do webhook (mostrado após salvar).
            </Card>
          )}

          {/* ---------- Condições ---------- */}
          {nodeData.type === "condicao_filtro" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Campo (ex.: placa, valor, motorista)</Label>
                <Input value={cfg.campo || ""} onChange={(e) => setCfg({ campo: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Operador</Label>
                <Select value={cfg.operador || "="} onValueChange={(v) => setCfg({ operador: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="=">= igual</SelectItem>
                    <SelectItem value="!=">≠ diferente</SelectItem>
                    <SelectItem value=">">&gt; maior que</SelectItem>
                    <SelectItem value="<">&lt; menor que</SelectItem>
                    <SelectItem value="contem">contém</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Valor</Label>
                <Input value={cfg.valor ?? ""} onChange={(e) => setCfg({ valor: e.target.value })} />
              </div>
            </div>
          )}

          {nodeData.type === "condicao_horario" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">De</Label>
                  <Input type="time" value={cfg.hora_inicio || "08:00"} onChange={(e) => setCfg({ hora_inicio: e.target.value })} />
                </div>
                <div>
                  <Label className="text-xs">Até</Label>
                  <Input type="time" value={cfg.hora_fim || "18:00"} onChange={(e) => setCfg({ hora_fim: e.target.value })} />
                </div>
              </div>
              <div>
                <Label className="text-xs">Dias da semana</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {DIAS.map((d) => {
                    const on = (cfg.dias || []).includes(d.v);
                    return (
                      <button
                        key={d.v}
                        type="button"
                        onClick={() => setCfg({
                          dias: on ? (cfg.dias || []).filter((x: number) => x !== d.v) : [...(cfg.dias || []), d.v],
                        })}
                        className={`px-2 py-1 text-[10px] rounded border ${on ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-border"}`}
                      >
                        {d.l}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {nodeData.type === "condicao_escopo" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Escopo</Label>
                <Select value={cfg.escopo_tipo || "todos"}
                  onValueChange={(v) => setCfg({ escopo_tipo: v, escopo_ids: [], dashboard_id: null })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os dispositivos</SelectItem>
                    <SelectItem value="dispositivos">Dispositivos específicos</SelectItem>
                    <SelectItem value="grupos">Grupos</SelectItem>
                    <SelectItem value="dashboard">Dashboard atual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {cfg.escopo_tipo === "dispositivos" && (
                <MultiCheck items={devices} value={cfg.escopo_ids || []} onChange={(ids) => setCfg({ escopo_ids: ids })} />
              )}
              {cfg.escopo_tipo === "grupos" && (
                <MultiCheck items={grupos} value={cfg.escopo_ids || []} onChange={(ids) => setCfg({ escopo_ids: ids })} />
              )}
              {cfg.escopo_tipo === "dashboard" && (
                <Select value={cfg.dashboard_id || ""} onValueChange={(v) => setCfg({ dashboard_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha o dashboard" /></SelectTrigger>
                  <SelectContent>
                    {dashboards.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {nodeData.type === "condicao_grupo" && (
            <div>
              <Label className="text-xs">Grupos permitidos</Label>
              <MultiCheck items={grupos} value={cfg.grupo_ids || []} onChange={(ids) => setCfg({ grupo_ids: ids })} />
            </div>
          )}

          {nodeData.type === "condicao_estabelecimento" && (
            <div>
              <Label className="text-xs">Estabelecimentos permitidos</Label>
              <MultiCheck items={estabelecimentos} value={cfg.estabelecimento_ids || []} onChange={(ids) => setCfg({ estabelecimento_ids: ids })} />
            </div>
          )}

          {/* ---------- Ações ---------- */}
          {nodeData.type === "acao_duracao" && (
            <div className="space-y-2">
              <Label className="text-xs">Segundos que a mensagem fica na tela</Label>
              <Input
                type="number"
                min={1}
                max={300}
                value={cfg.segundos ?? 8}
                onChange={(e) => setCfg({ segundos: parseInt(e.target.value) || 8 })}
              />
              <p className="text-[11px] text-muted-foreground">
                Coloque este bloco antes de "Mostrar barra" / "Pop-up" / "Imagem"
                para sobrescrever a duração deles.
              </p>
            </div>
          )}

          {nodeData.type === "acao_barra" && (
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Mensagem (use {"{variavel}"})</Label>
                <Textarea rows={2} value={cfg.mensagem || ""} onChange={(e) => setCfg({ mensagem: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Duração (segundos)</Label>
                <Input type="number" min={1} max={120}
                  value={cfg.duracao_segundos ?? 8}
                  onChange={(e) => setCfg({ duracao_segundos: parseInt(e.target.value) || 8 })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Cor fundo</Label>
                  <Input type="color" value={cfg.estilo?.bg || "#0f172a"}
                    onChange={(e) => setCfg({ estilo: { ...cfg.estilo, bg: e.target.value } })} />
                </div>
                <div>
                  <Label className="text-xs">Cor texto</Label>
                  <Input type="color" value={cfg.estilo?.fg || "#ffffff"}
                    onChange={(e) => setCfg({ estilo: { ...cfg.estilo, fg: e.target.value } })} />
                </div>
                <div>
                  <Label className="text-xs">Ícone</Label>
                  <Select value={cfg.estilo?.icone || "Bell"}
                    onValueChange={(v) => setCfg({ estilo: { ...cfg.estilo, icone: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICONES_BARRA.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Posição</Label>
                  <Select value={cfg.estilo?.posicao || "bottom"}
                    onValueChange={(v) => setCfg({ estilo: { ...cfg.estilo, posicao: v } })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bottom">Inferior</SelectItem>
                      <SelectItem value="top">Superior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <label className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 cursor-pointer">
                <div>
                  <div className="text-xs font-medium">Piscar para chamar atenção</div>
                  <div className="text-[10px] text-muted-foreground">Alterna opacidade/brilho enquanto exibida</div>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!cfg.estilo?.piscar}
                  onChange={(e) => setCfg({ estilo: { ...cfg.estilo, piscar: e.target.checked } })}
                />
              </label>
              <div
                className={`rounded-md px-3 py-2 text-sm font-bold truncate ${cfg.estilo?.piscar ? "animate-tv-blink" : ""}`}
                style={{ background: cfg.estilo?.bg || "#0f172a", color: cfg.estilo?.fg || "#fff" }}
              >
                {cfg.mensagem || "Sua mensagem aparecerá aqui"}
              </div>
            </div>
          )}


          {nodeData.type === "acao_aguardar" && (
            <div>
              <Label className="text-xs">Segundos</Label>
              <Input type="number" min={1} value={cfg.segundos ?? 5}
                onChange={(e) => setCfg({ segundos: parseInt(e.target.value) || 5 })} />
            </div>
          )}

          {nodeData.type === "acao_trocar_dashboard" && (
            <div>
              <Label className="text-xs">Dashboard</Label>
              <Select value={cfg.dashboard_id || ""} onValueChange={(v) => setCfg({ dashboard_id: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha o dashboard" /></SelectTrigger>
                <SelectContent>
                  {dashboards.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {nodeData.type === "acao_comando" && (
            <div>
              <Label className="text-xs">Comando</Label>
              <Select value={cfg.comando || "reiniciar_app"} onValueChange={(v) => setCfg({ comando: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMANDOS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {nodeData.type === "acao_som" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Som</Label>
                <Select value={cfg.som || "beep"} onValueChange={(v) => setCfg({ som: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beep">Beep</SelectItem>
                    <SelectItem value="alerta">Alerta</SelectItem>
                    <SelectItem value="sucesso">Sucesso</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Volume (%)</Label>
                <Input type="number" min={0} max={100} value={cfg.volume ?? 80}
                  onChange={(e) => setCfg({ volume: parseInt(e.target.value) || 0 })} />
              </div>
            </div>
          )}

          {nodeData.type === "acao_log" && (
            <div className="space-y-2">
              <Input placeholder="Título" value={cfg.titulo || ""} onChange={(e) => setCfg({ titulo: e.target.value })} />
              <Textarea rows={2} placeholder="Mensagem" value={cfg.mensagem || ""} onChange={(e) => setCfg({ mensagem: e.target.value })} />
              <Select value={cfg.nivel || "info"} onValueChange={(v) => setCfg({ nivel: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warn">Aviso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {nodeData.type === "acao_popup" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={cfg.titulo || ""} onChange={(e) => setCfg({ titulo: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Mensagem</Label>
                <Textarea rows={3} value={cfg.mensagem || ""} onChange={(e) => setCfg({ mensagem: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Duração (segundos)</Label>
                <Input type="number" min={1} max={300} value={cfg.duracao_segundos ?? 10}
                  onChange={(e) => setCfg({ duracao_segundos: parseInt(e.target.value) || 10 })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Cor fundo</Label>
                  <Input type="color" value={cfg.estilo?.bg || "#0f172a"}
                    onChange={(e) => setCfg({ estilo: { ...cfg.estilo, bg: e.target.value } })} />
                </div>
                <div>
                  <Label className="text-xs">Cor texto</Label>
                  <Input type="color" value={cfg.estilo?.fg || "#ffffff"}
                    onChange={(e) => setCfg({ estilo: { ...cfg.estilo, fg: e.target.value } })} />
                </div>
              </div>
              <label className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 cursor-pointer">
                <div>
                  <div className="text-xs font-medium">Piscar para chamar atenção</div>
                  <div className="text-[10px] text-muted-foreground">Popup pisca enquanto estiver visível</div>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={!!cfg.estilo?.piscar}
                  onChange={(e) => setCfg({ estilo: { ...cfg.estilo, piscar: e.target.checked } })}
                />
              </label>
            </div>
          )}


          {nodeData.type === "acao_imagem" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">URL da imagem</Label>
                <Input value={cfg.url || ""} onChange={(e) => setCfg({ url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Duração (segundos)</Label>
                <Input type="number" min={1} max={300} value={cfg.duracao_segundos ?? 8}
                  onChange={(e) => setCfg({ duracao_segundos: parseInt(e.target.value) || 8 })} />
              </div>
              {cfg.url && (
                <img src={cfg.url} alt="preview" className="w-full rounded border max-h-40 object-contain bg-muted" />
              )}
            </div>
          )}

          {nodeData.type === "acao_trocar_playlist" && (
            <div>
              <Label className="text-xs">Playlist</Label>
              <Select value={cfg.playlist_id || ""} onValueChange={(v) => setCfg({ playlist_id: v })}>
                <SelectTrigger><SelectValue placeholder="Escolha a playlist" /></SelectTrigger>
                <SelectContent>
                  {playlists.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {nodeData.type === "acao_brilho" && (
            <div>
              <Label className="text-xs">Brilho (%)</Label>
              <Input type="number" min={0} max={100} value={cfg.brilho ?? 80}
                onChange={(e) => setCfg({ brilho: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) })} />
            </div>
          )}

          {nodeData.type === "acao_whatsapp" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Sessão WhatsApp</Label>
                <Select value={cfg.sessao_id || ""} onValueChange={(v) => setCfg({ sessao_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Escolha a sessão" /></SelectTrigger>
                  <SelectContent>
                    {sessoes.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nome_sessao || s.nome || s.session_name || s.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Destinatário (número)</Label>
                <Input value={cfg.destinatario || ""} onChange={(e) => setCfg({ destinatario: e.target.value })} placeholder="5511999999999" />
              </div>
              <div>
                <Label className="text-xs">Mensagem</Label>
                <Textarea rows={3} value={cfg.mensagem || ""} onChange={(e) => setCfg({ mensagem: e.target.value })} />
              </div>
            </div>
          )}

          {nodeData.type === "acao_push" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">Título</Label>
                <Input value={cfg.titulo || ""} onChange={(e) => setCfg({ titulo: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Mensagem</Label>
                <Textarea rows={2} value={cfg.mensagem || ""} onChange={(e) => setCfg({ mensagem: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">URL (opcional)</Label>
                <Input value={cfg.url || ""} onChange={(e) => setCfg({ url: e.target.value })} placeholder="/rota" />
              </div>
            </div>
          )}

          {nodeData.type === "acao_webhook_out" && (
            <div className="space-y-2">
              <div>
                <Label className="text-xs">URL</Label>
                <Input value={cfg.url || ""} onChange={(e) => setCfg({ url: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <Label className="text-xs">Método</Label>
                <Select value={cfg.metodo || "POST"} onValueChange={(v) => setCfg({ metodo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Body (JSON)</Label>
                <Textarea rows={3} value={cfg.body || ""} onChange={(e) => setCfg({ body: e.target.value })} placeholder='{"chave":"valor"}' />
              </div>
            </div>
          )}

          {(nodeData.type === "acao_screenshot" ||
            nodeData.type === "acao_reiniciar" ||
            nodeData.type === "acao_atualizar") && (
            <Card className="p-3 text-xs text-muted-foreground">
              Esta ação não possui parâmetros — será aplicada no dispositivo alvo do escopo do workflow.
            </Card>
          )}


          <div className="pt-2 border-t">
            <Label className="text-xs flex items-center gap-1">
              <StickyNote className="w-3 h-3" /> Nota / comentário
            </Label>
            <Textarea
              rows={2}
              className="bg-yellow-500/5 border-yellow-500/20"
              value={nodeData.nota || ""}
              onChange={(e) => onChange(node.id, { nota: e.target.value })}
              placeholder="Anotação interna sobre este bloco"
            />
          </div>
        </div>
      </ScrollArea>

      <div className="border-t p-3">
        <Button variant="destructive" size="sm" className="w-full" onClick={() => onDelete(node.id)}>
          <Trash2 className="w-4 h-4 mr-2" /> Excluir bloco
        </Button>
      </div>
    </div>
  );
}

function MultiCheck({ items, value, onChange }: { items: any[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
      {items.map((it) => (
        <label key={it.id} className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={value.includes(it.id)}
            onChange={(e) =>
              onChange(e.target.checked ? [...value, it.id] : value.filter((x) => x !== it.id))
            }
          />
          {it.nome}
        </label>
      ))}
      {items.length === 0 && <span className="text-xs text-muted-foreground">Nenhum item</span>}
    </div>
  );
}
