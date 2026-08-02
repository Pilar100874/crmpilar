import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { db, useEstabelecimento } from "@/lib/aip/db";
import { CATALOGO_RECURSOS } from "@/lib/aip/catalog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Save, ArrowLeft, Trash2, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { FlowExportImportGeneric } from "@/components/flow/FlowExportImportGeneric";
import { WorkflowRunPanel } from "@/components/ia-platform/WorkflowRunPanel";
import { WorkflowVersionsDialog } from "@/components/ia-platform/WorkflowVersionsDialog";


export default function WorkflowBuilderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const estabelecimentoId = useEstabelecimento();

  const [nome, setNome] = useState("Novo workflow");
  const [descricao, setDescricao] = useState("");
  const [versao, setVersao] = useState(1);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selecionado, setSelecionado] = useState<Node | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [executando, setExecutando] = useState(false);

  useEffect(() => {
    if (!id || id === "novo") return;
    (async () => {
      const { data } = await db.from("aip_workflows").select("*").eq("id", id).maybeSingle();
      if (!data) return;
      setNome(data.nome);
      setDescricao(data.descricao ?? "");
      setVersao(data.versao ?? 1);
      setNodes(data.flow_data?.nodes ?? []);
      setEdges(data.flow_data?.edges ?? []);
    })();
  }, [id, setNodes, setEdges]);

  const onConnect = useCallback(
    (c: Connection) =>
      setEdges((eds) => addEdge({ ...c, markerEnd: { type: MarkerType.ArrowClosed }, animated: true }, eds)),
    [setEdges],
  );

  const adicionarNo = (categoria: string, item: { slug: string; nome: string; icone: string }) => {
    const novo: Node = {
      id: `${item.slug}-${Date.now()}`,
      position: { x: 120 + Math.random() * 300, y: 100 + Math.random() * 250 },
      data: {
        label: `${item.icone} ${item.nome}`,
        categoria,
        slug: item.slug,
        nome: item.nome,
        config: {},
      },
      style: {
        borderRadius: 12,
        border: "1px solid hsl(var(--border))",
        background: "hsl(var(--card))",
        color: "hsl(var(--card-foreground))",
        padding: 10,
        fontSize: 12,
      },
    };
    setNodes((n) => [...n, novo]);
  };

  const atualizarConfig = (campo: string, valor: unknown) => {
    if (!selecionado) return;
    setNodes((ns) =>
      ns.map((n) =>
        n.id === selecionado.id
          ? { ...n, data: { ...n.data, config: { ...(n.data as any).config, [campo]: valor } } }
          : n,
      ),
    );
    setSelecionado((s) =>
      s ? ({ ...s, data: { ...s.data, config: { ...(s.data as any).config, [campo]: valor } } } as Node) : s,
    );
  };

  const excluirNo = () => {
    if (!selecionado) return;
    setNodes((ns) => ns.filter((n) => n.id !== selecionado.id));
    setEdges((es) => es.filter((e) => e.source !== selecionado.id && e.target !== selecionado.id));
    setSelecionado(null);
  };

  const salvar = async () => {
    if (!estabelecimentoId) return;
    if (!nome.trim()) return toast.error("Informe o nome do workflow");
    setSalvando(true);
    const flow_data = { nodes, edges };
    const nota = window.prompt("Observação desta versão (opcional):", "") ?? "";
    if (!id || id === "novo") {
      const { data, error } = await db
        .from("aip_workflows")
        .insert({ estabelecimento_id: estabelecimentoId, nome, descricao, flow_data, versao: 1 })
        .select()
        .single();
      if (error) {
        setSalvando(false);
        return toast.error(`Erro ao salvar: ${error.message}`);
      }
      await db.from("aip_workflow_versions").insert({
        estabelecimento_id: estabelecimentoId,
        workflow_id: data.id,
        versao: 1,
        flow_data,
        nota: nota || "Versão inicial",
      });
      setSalvando(false);
      toast.success("Workflow criado (v1)");
      navigate(`/ia-platform/workflows/${data.id}`, { replace: true });
      return;
    }
    const novaVersao = versao + 1;
    const { error } = await db
      .from("aip_workflows")
      .update({ nome, descricao, flow_data, versao: novaVersao })
      .eq("id", id);
    if (!error) {
      await db.from("aip_workflow_versions").insert({
        estabelecimento_id: estabelecimentoId,
        workflow_id: id,
        versao: novaVersao,
        flow_data,
        nota: nota || null,
      });
      setVersao(novaVersao);
    }
    setSalvando(false);
    toast[error ? "error" : "success"](error ? `Erro: ${error.message}` : `Salvo (v${novaVersao})`);
  };


  const config = (selecionado?.data as any)?.config ?? {};

  const paleta = useMemo(() => CATALOGO_RECURSOS, []);

  return (
    <div className="flex h-[calc(100vh-190px)] min-h-[520px] flex-col gap-3 lg:flex-row">
      {/* Paleta */}
      <aside className="w-full shrink-0 rounded-xl border border-border bg-card lg:w-64">
        <div className="border-b border-border p-3">
          <p className="text-sm font-semibold">Blocos</p>
        </div>
        <ScrollArea className="h-64 lg:h-[calc(100%-49px)]">
          <Accordion type="multiple" className="px-2">
            {paleta.map((cat) => (
              <AccordionItem key={cat.slug} value={cat.slug} className="border-none">
                <AccordionTrigger className="py-2 text-sm hover:no-underline">
                  <span className="flex items-center gap-2">
                    {cat.icone} {cat.nome}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="space-y-1">
                    {cat.itens.map((item) => (
                      <button
                        key={item.slug}
                        onClick={() => adicionarNo(cat.slug, item)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        <span>{item.icone}</span>
                        <span className="truncate">{item.nome}</span>
                      </button>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </ScrollArea>
      </aside>

      {/* Canvas */}
      <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-xl border border-border">
        <div className="absolute left-0 right-0 top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-background/90 p-2 backdrop-blur">
          <Button size="sm" variant="ghost" onClick={() => navigate("/ia-platform/workflows")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} className="h-8 max-w-[220px]" />
          <Badge variant="outline">v{versao}</Badge>
          <div className="ml-auto flex items-center gap-2">
            <FlowExportImportGeneric
              nodes={nodes}
              edges={edges}
              flowName={nome}
              onImport={(n, e, nomeImportado) => {
                setNodes(n);
                setEdges(e);
                if (nomeImportado) setNome(nomeImportado);
              }}
            />
            <WorkflowVersionsDialog
              workflowId={id && id !== "novo" ? id : undefined}
              versaoAtual={versao}
              onRestaurar={(n, e) => {
                setNodes(n);
                setEdges(e);
                setSelecionado(null);
              }}
            />

            <Button size="sm" onClick={salvar} disabled={salvando}>
              <Save className="mr-1 h-4 w-4" /> Salvar
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!id || id === "novo"}
              onClick={() => setExecutando(true)}
              title={!id || id === "novo" ? "Salve o workflow antes de executar" : "Executar workflow"}
            >
              <PlayCircle className="mr-1 h-4 w-4" /> Executar
            </Button>
          </div>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => setSelecionado(n)}
          onPaneClick={() => setSelecionado(null)}
          fitView
          className="pt-12"
        >
          <Background gap={16} />
          <Controls />
          <MiniMap pannable zoomable className="!bg-card" />
        </ReactFlow>
      </div>

      {/* Propriedades */}
      <aside className="w-full shrink-0 rounded-xl border border-border bg-card lg:w-72">
        <div className="border-b border-border p-3">
          <p className="text-sm font-semibold">Propriedades</p>
        </div>
        <ScrollArea className="h-72 lg:h-[calc(100%-49px)]">
          <div className="space-y-4 p-3">
            {!selecionado ? (
              <>
                <div className="space-y-2">
                  <Label>Descrição do workflow</Label>
                  <Textarea rows={4} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Selecione um bloco no canvas para configurar seus parâmetros.
                </p>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-medium">{String((selecionado.data as any).label)}</p>
                  <p className="text-xs text-muted-foreground">
                    {String((selecionado.data as any).categoria)} / {String((selecionado.data as any).slug)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Rótulo</Label>
                  <Input
                    value={String((selecionado.data as any).label ?? "")}
                    onChange={(e) => {
                      const label = e.target.value;
                      setNodes((ns) =>
                        ns.map((n) => (n.id === selecionado.id ? { ...n, data: { ...n.data, label } } : n)),
                      );
                      setSelecionado({ ...selecionado, data: { ...selecionado.data, label } } as Node);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prompt / instrução</Label>
                  <Textarea
                    rows={5}
                    value={String(config.prompt ?? "")}
                    onChange={(e) => atualizarConfig("prompt", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <Label>Tentativas automáticas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={Number((config.retry as any)?.tentativas ?? 1)}
                      onChange={(e) =>
                        atualizarConfig("retry", {
                          ...((config.retry as any) ?? {}),
                          tentativas: Math.max(1, Math.min(5, Number(e.target.value) || 1)),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Espera entre tentativas (ms)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={20000}
                      step={500}
                      value={Number((config.retry as any)?.delay_ms ?? 1500)}
                      onChange={(e) =>
                        atualizarConfig("retry", {
                          ...((config.retry as any) ?? {}),
                          delay_ms: Math.max(0, Math.min(20000, Number(e.target.value) || 0)),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tempo limite da etapa (segundos)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={600}
                    step={10}
                    value={Math.round(Number(config.timeout_ms ?? 120000) / 1000)}
                    onChange={(e) => {
                      const seg = Math.max(0, Math.min(600, Number(e.target.value) || 0));
                      atualizarConfig("timeout_ms", seg * 1000);
                    }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Em caso de falha, o bloco é repetido automaticamente (backoff exponencial). Se todas as
                  tentativas falharem, a execução para nesse ponto e pode ser reexecutada manualmente.
                  O tempo limite interrompe a etapa (0 = sem limite) e o motivo fica registrado no histórico.
                </p>

                <div className="space-y-2">
                  <Label>Parâmetros (JSON)</Label>
                  <Textarea
                    rows={6}
                    className="font-mono text-xs"
                    defaultValue={JSON.stringify(config.params ?? {}, null, 2)}
                    onChange={(e) => {
                      try {
                        atualizarConfig("params", e.target.value.trim() ? JSON.parse(e.target.value) : {});
                      } catch {
                        /* json parcial */
                      }
                    }}
                  />
                </div>
                <Button variant="outline" className="w-full" onClick={excluirNo}>
                  <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Remover bloco
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => navigate(`/ia-platform/playground?workflow=${id}`)}
              disabled={!id || id === "novo"}
            >
              <PlayCircle className="mr-2 h-4 w-4" /> Testar no playground
            </Button>
          </div>
        </ScrollArea>
      </aside>

      <WorkflowRunPanel
        open={executando}
        onOpenChange={setExecutando}
        workflowId={id && id !== "novo" ? id : undefined}
        nomeWorkflow={nome}
      />
    </div>
  );
}
