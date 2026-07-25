import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { Mic, Settings2, Search, ShieldCheck, FileBarChart, ExternalLink, Save, MessageCircle, Plus, X as XIcon, RotateCcw, Pencil } from "lucide-react";
import { ROTAS_SISTEMA, type RotaSistema } from "@/lib/voz/rotasSistema";
import { GRUPOS_FRASES, FRASES_PADRAO, aliasesEfetivosRota, type FraseGrupoId } from "@/lib/voz/frasesGatilho";
import RelatoriosVozConfig from "./RelatoriosVozConfig";
import RelatoriosVozSnapshots from "./RelatoriosVozSnapshots";

const VOZES = ["alloy", "echo", "fable", "onyx", "nova", "shimmer", "coral", "sage"];

export default function AssistenteVozConfig() {
  const [config, setConfig] = useState<any>({
    wake_word_ativo: true,
    responder_por_voz: true,
    voz: "alloy",
    wake_word: "ei pilar",
    frases_customizadas: {} as Record<string, string[]>,
  });
  const [busca, setBusca] = useState("");
  const [buscaFrase, setBuscaFrase] = useState("");
  const [novaFrase, setNovaFrase] = useState<Record<string, string>>({});
  const [novoAliasRota, setNovoAliasRota] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("assistente_voz_config")
        .select("*")
        .eq("auth_user_id", u.user.id)
        .maybeSingle();
      if (data) setConfig({ ...config, ...data });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvarConfig = async (patch: any) => {
    const novo = { ...config, ...patch };
    setConfig(novo);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("assistente_voz_config")
      .upsert({ ...novo, auth_user_id: u.user.id }, { onConflict: "auth_user_id" });
    if (error) toast.error(error.message);
    else toast.success("Configuração salva");
  };

  const salvarChave = async (chave: string, valores: string[]) => {
    const dedup = Array.from(new Set(valores.map((s) => s.trim()).filter(Boolean)));
    const frases_customizadas = { ...(config.frases_customizadas || {}), [chave]: dedup };
    await salvarConfig({ frases_customizadas });
  };

  const rotasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return ROTAS_SISTEMA;
    return ROTAS_SISTEMA.filter(
      (r) =>
        r.titulo.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        (r.aliases || []).some((a) => a.toLowerCase().includes(q)) ||
        (((config.frases_customizadas || {})[`rota:${r.path}`] as string[]) || []).some((a) => a.toLowerCase().includes(q)),
    );
  }, [busca, config.frases_customizadas]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Mic className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Assistente de Voz "Pilar"</h1>
          <p className="text-sm text-muted-foreground">
            Só responde a duas intenções: <b>abrir tela</b> ou <b>relatórios</b>. Sem chance de alucinação.
          </p>
        </div>
      </div>

      <Card className="p-3 bg-primary/5 border-primary/20 flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
        <div className="text-sm text-muted-foreground">
          <b className="text-foreground">Modo determinístico:</b> a fala é comparada apenas com esta lista de
          telas e com os relatórios cadastrados. Se não houver correspondência clara, o Pilar mostra opções
          para você escolher — <b>nunca inventa uma resposta</b>.
        </div>
      </Card>

      <Tabs defaultValue="telas">
        <TabsList>
          <TabsTrigger value="telas">
            <ExternalLink className="w-4 h-4 mr-2" /> Telas por voz
          </TabsTrigger>
          <TabsTrigger value="frases">
            <MessageCircle className="w-4 h-4 mr-2" /> Frases por voz
          </TabsTrigger>
          <TabsTrigger value="relatorios">
            <FileBarChart className="w-4 h-4 mr-2" /> Relatórios por voz
          </TabsTrigger>
          <TabsTrigger value="snapshots">
            <Save className="w-4 h-4 mr-2" /> Snapshots
          </TabsTrigger>
          <TabsTrigger value="config">
            <Settings2 className="w-4 h-4 mr-2" /> Configurações
          </TabsTrigger>
        </TabsList>

        {/* ======================= TELAS ======================= */}
        <TabsContent value="telas" className="space-y-3">
          <Card className="p-3">
            <p className="text-sm text-muted-foreground mb-2">
              Estas são as telas que o Pilar sabe abrir. Diga <b>"abrir &lt;nome&gt;"</b> ou qualquer um dos
              apelidos listados. Para adicionar novas telas ou apelidos, edite o arquivo <code>rotasSistema.ts</code>.
            </p>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, rota ou apelido…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-8"
              />
            </div>
          </Card>

          <div className="grid gap-2 sm:grid-cols-2">
            {rotasFiltradas.map((r) => (
              <Card key={r.path} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.titulo}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{r.path}</div>
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    <Mic className="w-3 h-3 mr-1" /> voz
                  </Badge>
                </div>
                {r.aliases && r.aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.aliases.map((a) => (
                      <span
                        key={a}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary"
                      >
                        "{a}"
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
            {rotasFiltradas.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground sm:col-span-2">
                Nenhuma tela encontrada com "{busca}".
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ======================= FRASES ======================= */}
        <TabsContent value="frases" className="space-y-3">
          <Card className="p-3">
            <p className="text-sm text-muted-foreground mb-2">
              Estas são as <b>frases (apelidos)</b> que o Pilar reconhece para ações rápidas: voltar, avançar,
              gerar PDF e abrir a lista de relatórios. Você pode adicionar novos apelidos ou remover extras.
              Os apelidos padrão vêm marcados como <Badge variant="secondary" className="text-[10px] mx-1">padrão</Badge>
              e não podem ser removidos — se quiser desabilitar um padrão, cadastre um sinônimo específico e nos avise.
            </p>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar frase…"
                value={buscaFrase}
                onChange={(e) => setBuscaFrase(e.target.value)}
                className="pl-8"
              />
            </div>
          </Card>

          <div className="grid gap-3">
            {GRUPOS_FRASES.map((grupo) => {
              const custom: string[] = (config?.frases_customizadas?.[grupo.id] as string[]) || [];
              const padrao = FRASES_PADRAO[grupo.id];
              const q = buscaFrase.trim().toLowerCase();
              const filtro = (s: string) => !q || s.toLowerCase().includes(q);
              const padraoFiltrado = padrao.filter(filtro);
              const customFiltrado = custom.filter(filtro);

              const salvarFrases = async (novoArr: string[]) => {
                const dedup = Array.from(new Set(novoArr.map((s) => s.trim()).filter(Boolean)));
                const frases_customizadas = { ...(config.frases_customizadas || {}), [grupo.id]: dedup };
                await salvarConfig({ frases_customizadas });
              };

              const adicionar = async () => {
                const v = (novaFrase[grupo.id] || "").trim();
                if (!v) return;
                // não duplica um padrão
                if (padrao.some((p) => p.toLowerCase() === v.toLowerCase())) {
                  toast.info("Esse apelido já existe como padrão.");
                  setNovaFrase({ ...novaFrase, [grupo.id]: "" });
                  return;
                }
                await salvarFrases([...custom, v]);
                setNovaFrase({ ...novaFrase, [grupo.id]: "" });
              };

              return (
                <Card key={grupo.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="font-medium">{grupo.titulo}</div>
                      <div className="text-xs text-muted-foreground">{grupo.descricao}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Ex.: diga <b>"{grupo.exemplo}"</b>
                      </div>
                    </div>
                    {custom.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => salvarFrases([])}
                        title="Remover todos os apelidos personalizados"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Limpar
                      </Button>
                    )}
                  </div>

                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder={`Adicionar novo apelido para "${grupo.titulo}"…`}
                      value={novaFrase[grupo.id] || ""}
                      onChange={(e) => setNovaFrase({ ...novaFrase, [grupo.id]: e.target.value })}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); adicionar(); } }}
                    />
                    <Button onClick={adicionar} disabled={!(novaFrase[grupo.id] || "").trim()}>
                      <Plus className="w-4 h-4 mr-1" /> Adicionar
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {padraoFiltrado.map((f) => (
                      <span
                        key={`p-${f}`}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-muted text-foreground"
                        title="Apelido padrão do sistema"
                      >
                        "{f}"
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">padrão</Badge>
                      </span>
                    ))}
                    {customFiltrado.map((f) => (
                      <span
                        key={`c-${f}`}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary"
                      >
                        "{f}"
                        <button
                          onClick={() => salvarFrases(custom.filter((x) => x !== f))}
                          className="hover:bg-primary/20 rounded p-0.5"
                          title="Remover apelido"
                        >
                          <XIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                    {padraoFiltrado.length === 0 && customFiltrado.length === 0 && (
                      <span className="text-xs text-muted-foreground">Nenhuma frase para "{buscaFrase}".</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </TabsContent>



        {/* ======================= RELATÓRIOS ======================= */}
        <TabsContent value="relatorios" className="pt-2">
          <div className="-mx-4 sm:-mx-6">
            <RelatoriosVozConfig />
          </div>
        </TabsContent>

        <TabsContent value="snapshots" className="pt-2">
          <div className="-mx-4 sm:-mx-6">
            <RelatoriosVozSnapshots />
          </div>
        </TabsContent>

        {/* ======================= CONFIGURAÇÕES ======================= */}
        <TabsContent value="config" className="space-y-3">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Responder por voz</div>
                <div className="text-sm text-muted-foreground">
                  Além do texto, fala a resposta em áudio.
                </div>
              </div>
              <Switch
                checked={!!config?.responder_por_voz}
                onCheckedChange={(v) => salvarConfig({ responder_por_voz: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Wake word (escuta contínua)</div>
                <div className="text-sm text-muted-foreground">
                  Ativa por palavra-chave sem precisar apertar o botão.
                </div>
              </div>
              <Switch
                checked={!!config?.wake_word_ativo}
                onCheckedChange={(v) => salvarConfig({ wake_word_ativo: v })}
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Palavra de ativação</Label>
                <Input
                  value={config?.wake_word || ""}
                  onChange={(e) => setConfig({ ...config, wake_word: e.target.value })}
                  onBlur={() => salvarConfig({ wake_word: config.wake_word })}
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Dica: use 2 sílabas + "pilar" (ex.: "ei pilar", "oi pilar").
                </p>
              </div>
              <div>
                <Label>Voz da resposta</Label>
                <Select value={config?.voz || "alloy"} onValueChange={(v) => salvarConfig({ voz: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOZES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/30">
            <div className="text-sm">
              <b>Como funciona (garantia de 0% alucinação):</b>
              <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                <li>
                  <b>Abrir tela:</b> só abre quando o nome falado tem correspondência clara com uma tela desta
                  lista (score alto + margem sobre o segundo colocado). Em caso de dúvida, mostra as opções.
                </li>
                <li>
                  <b>Relatórios:</b> só gera relatórios explicitamente cadastrados na aba
                  <b> Relatórios por voz</b>, usando o prompt definido por você.
                </li>
                <li>
                  Qualquer outra frase recebe a resposta padrão: <i>"Não entendi. Diga 'abrir &lt;tela&gt;' ou
                  'relatórios'."</i>
                </li>
              </ul>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
