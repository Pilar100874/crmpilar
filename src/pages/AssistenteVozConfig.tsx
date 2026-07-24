import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { toast } from "sonner";
import { Mic, Plus, Pencil, Trash2, Wrench, Settings2, MessageSquare } from "lucide-react";

type TipoAcao = "navegar" | "consultar_metrica" | "responder" | "disparar_bot" | "comando_tv";

interface Comando {
  id: string;
  frase_gatilho: string;
  descricao: string | null;
  tipo_acao: TipoAcao;
  payload: any;
  resposta_falada: string | null;
  ativo: boolean;
}

const FERRAMENTAS_NATIVAS = [
  { id: "navegar_para", nome: "Navegar entre telas", desc: "Permite abrir telas via voz (ex: \"abrir dashboard\")." },
  { id: "consultar_metrica", nome: "Consultar métricas", desc: "Veículos online, empresas, orçamentos, TVs, etc." },
  { id: "disparar_bot", nome: "Disparar automações", desc: "Rodar bots/campanhas por voz (pede confirmação)." },
  { id: "enviar_comando_tv", nome: "Comandos para TVs", desc: "Refresh, reiniciar, limpar cache nas TVs." },
];

const VOZES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "coral", "sage"];

const METRICAS = [
  "veiculos_online","empresas_total","contatos_total","orcamentos_hoje",
  "orcamentos_mes","tv_dispositivos_online","alertas_ponto_hoje","atendimentos_abertos",
];

const COMANDOS_TV = ["refresh", "reiniciar_app", "limpar_cache"];

export default function AssistenteVozConfig() {
  const [comandos, setComandos] = useState<Comando[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Comando> | null>(null);
  const [confirmDel, setConfirmDel] = useState<Comando | null>(null);

  const carregar = async () => {
    setLoading(true);
    const { data: cmds } = await supabase.from("assistente_voz_comandos").select("*").order("frase_gatilho");
    setComandos((cmds || []) as any);
    const { data: userRes } = await supabase.auth.getUser();
    if (userRes?.user) {
      const { data: cfg } = await supabase.from("assistente_voz_config")
        .select("*").eq("auth_user_id", userRes.user.id).maybeSingle();
      setConfig(cfg || {
        auth_user_id: userRes.user.id,
        wake_word_ativo: false,
        responder_por_voz: true,
        voz: "alloy",
        wake_word: "ei pilar",
        ferramentas_desativadas: [],
      });
    }
    setLoading(false);
  };

  useEffect(() => { carregar(); }, []);

  const salvarComando = async () => {
    if (!editing?.frase_gatilho || !editing?.tipo_acao) {
      toast.error("Frase e tipo são obrigatórios");
      return;
    }
    const { data: userRes } = await supabase.auth.getUser();
    const { data: usuario } = await supabase.from("usuarios")
      .select("estabelecimento_id").eq("auth_user_id", userRes!.user!.id).maybeSingle();
    if (!usuario?.estabelecimento_id) {
      toast.error("Estabelecimento não identificado");
      return;
    }
    const body: any = {
      frase_gatilho: editing.frase_gatilho.toLowerCase().trim(),
      descricao: editing.descricao || null,
      tipo_acao: editing.tipo_acao,
      payload: editing.payload || {},
      resposta_falada: editing.resposta_falada || null,
      ativo: editing.ativo ?? true,
      estabelecimento_id: usuario.estabelecimento_id,
    };
    let error;
    if (editing.id) {
      ({ error } = await supabase.from("assistente_voz_comandos").update(body).eq("id", editing.id));
    } else {
      body.created_by = userRes!.user!.id;
      ({ error } = await supabase.from("assistente_voz_comandos").insert(body));
    }
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo");
    setEditing(null);
    carregar();
  };

  const excluir = async () => {
    if (!confirmDel) return;
    const { error } = await supabase.from("assistente_voz_comandos").delete().eq("id", confirmDel.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Comando removido");
    setConfirmDel(null);
    carregar();
  };

  const salvarConfig = async (patch: any) => {
    const novo = { ...config, ...patch };
    setConfig(novo);
    const { error } = await supabase.from("assistente_voz_config").upsert(novo, { onConflict: "auth_user_id" });
    if (error) toast.error(error.message);
    else toast.success("Configuração salva");
  };

  const toggleFerramenta = async (id: string, ativa: boolean) => {
    const atuais: string[] = config?.ferramentas_desativadas || [];
    const novas = ativa ? atuais.filter((x) => x !== id) : Array.from(new Set([...atuais, id]));
    salvarConfig({ ferramentas_desativadas: novas });
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Mic className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Assistente de Voz "Pilar"</h1>
          <p className="text-sm text-muted-foreground">Comandos customizados, ferramentas nativas e preferências.</p>
        </div>
      </div>

      <Tabs defaultValue="comandos">
        <TabsList>
          <TabsTrigger value="comandos"><MessageSquare className="w-4 h-4 mr-2" />Comandos</TabsTrigger>
          <TabsTrigger value="ferramentas"><Wrench className="w-4 h-4 mr-2" />Ferramentas nativas</TabsTrigger>
          <TabsTrigger value="config"><Settings2 className="w-4 h-4 mr-2" />Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="comandos" className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Frases faladas pelo usuário que disparam ações. Ex: "vendas do dia" → abre relatório.
            </p>
            <Button onClick={() => setEditing({ tipo_acao: "navegar", ativo: true, payload: {} })}>
              <Plus className="w-4 h-4 mr-2" /> Novo comando
            </Button>
          </div>

          {loading && <Card className="p-8 text-center text-sm text-muted-foreground">Carregando…</Card>}

          {!loading && comandos.length === 0 && (
            <Card className="p-10 text-center">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-3">Nenhum comando customizado ainda.</p>
              <Button onClick={() => setEditing({ tipo_acao: "navegar", ativo: true, payload: {} })}>
                <Plus className="w-4 h-4 mr-2" /> Criar primeiro comando
              </Button>
            </Card>
          )}

          <div className="grid gap-2">
            {comandos.map((c) => (
              <Card key={c.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">"{c.frase_gatilho}"</span>
                    <Badge variant={c.ativo ? "default" : "secondary"}>{c.ativo ? "Ativo" : "Inativo"}</Badge>
                    <Badge variant="outline">{c.tipo_acao}</Badge>
                  </div>
                  {c.descricao && <p className="text-sm text-muted-foreground truncate mt-1">{c.descricao}</p>}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmDel(c)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="ferramentas" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Desative ferramentas que você não quer que o assistente use.
          </p>
          <div className="grid gap-2">
            {FERRAMENTAS_NATIVAS.map((f) => {
              const desativadas: string[] = config?.ferramentas_desativadas || [];
              const ativa = !desativadas.includes(f.id);
              return (
                <Card key={f.id} className="p-4 flex items-center gap-4">
                  <div className="flex-1">
                    <div className="font-medium">{f.nome}</div>
                    <div className="text-sm text-muted-foreground">{f.desc}</div>
                  </div>
                  <Switch checked={ativa} onCheckedChange={(v) => toggleFerramenta(f.id, v)} />
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="config" className="space-y-3">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Responder por voz</div>
                <div className="text-sm text-muted-foreground">Além do texto, fala a resposta.</div>
              </div>
              <Switch checked={!!config?.responder_por_voz}
                onCheckedChange={(v) => salvarConfig({ responder_por_voz: v })} />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Wake word (escuta contínua)</div>
                <div className="text-sm text-muted-foreground">Ativa por palavra-chave sem apertar o botão.</div>
              </div>
              <Switch checked={!!config?.wake_word_ativo}
                onCheckedChange={(v) => salvarConfig({ wake_word_ativo: v })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Palavra de ativação</Label>
                <Input value={config?.wake_word || ""} onChange={(e) => setConfig({ ...config, wake_word: e.target.value })}
                  onBlur={() => salvarConfig({ wake_word: config.wake_word })} />
              </div>
              <div>
                <Label>Voz</Label>
                <Select value={config?.voz || "alloy"} onValueChange={(v) => salvarConfig({ voz: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{VOZES.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar comando" : "Novo comando"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Frase gatilho</Label>
                <Input placeholder='ex: "vendas do dia"' value={editing.frase_gatilho || ""}
                  onChange={(e) => setEditing({ ...editing, frase_gatilho: e.target.value })} />
              </div>
              <div>
                <Label>Descrição (opcional)</Label>
                <Input value={editing.descricao || ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} />
              </div>
              <div>
                <Label>Tipo de ação</Label>
                <Select value={editing.tipo_acao} onValueChange={(v: TipoAcao) => setEditing({ ...editing, tipo_acao: v, payload: {} })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="navegar">Abrir tela (navegar)</SelectItem>
                    <SelectItem value="consultar_metrica">Consultar métrica</SelectItem>
                    <SelectItem value="responder">Apenas responder texto</SelectItem>
                    <SelectItem value="disparar_bot">Disparar automação</SelectItem>
                    <SelectItem value="comando_tv">Comando nas TVs</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editing.tipo_acao === "navegar" && (
                <div>
                  <Label>Rota (ex: /relatorios)</Label>
                  <Input value={editing.payload?.path || ""}
                    onChange={(e) => setEditing({ ...editing, payload: { ...editing.payload, path: e.target.value } })} />
                </div>
              )}
              {editing.tipo_acao === "consultar_metrica" && (
                <div>
                  <Label>Métrica</Label>
                  <Select value={editing.payload?.metrica || ""}
                    onValueChange={(v) => setEditing({ ...editing, payload: { metrica: v } })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{METRICAS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {editing.tipo_acao === "disparar_bot" && (
                <div>
                  <Label>Nome da automação</Label>
                  <Input value={editing.payload?.nome_automacao || ""}
                    onChange={(e) => setEditing({ ...editing, payload: { nome_automacao: e.target.value } })} />
                </div>
              )}
              {editing.tipo_acao === "comando_tv" && (
                <div>
                  <Label>Comando</Label>
                  <Select value={editing.payload?.comando || ""}
                    onValueChange={(v) => setEditing({ ...editing, payload: { comando: v } })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{COMANDOS_TV.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label>Resposta falada (opcional)</Label>
                <Textarea rows={2} value={editing.resposta_falada || ""}
                  onChange={(e) => setEditing({ ...editing, resposta_falada: e.target.value })} />
              </div>

              <div className="flex items-center gap-2">
                <Switch checked={editing.ativo ?? true} onCheckedChange={(v) => setEditing({ ...editing, ativo: v })} />
                <span className="text-sm">Ativo</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={salvarComando}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        onConfirm={excluir}
        title="Excluir comando?"
        description={confirmDel ? `"${confirmDel.frase_gatilho}" será removido.` : ""}
      />
    </div>
  );
}
