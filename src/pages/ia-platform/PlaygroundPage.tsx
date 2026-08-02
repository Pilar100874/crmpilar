import { ModeloSelect } from "@/components/ia-platform/ModeloSelect";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAipTable, db, useEstabelecimento } from "@/lib/aip/db";
import { AipAgent, AipWorkflow, MODELOS_IA } from "@/lib/aip/types";
import { agentRunner, streamRun } from "@/lib/aip/runner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Square, TerminalSquare } from "lucide-react";
import { toast } from "sonner";

export default function PlaygroundPage() {
  const [params] = useSearchParams();
  const estabelecimentoId = useEstabelecimento();
  const { items: agentes } = useAipTable<AipAgent>("aip_agents");
  const { items: workflows } = useAipTable<AipWorkflow>("aip_workflows");

  const [agentId, setAgentId] = useState<string>("nenhum");
  const [workflowId, setWorkflowId] = useState<string>(params.get("workflow") ?? "nenhum");
  const [modelo, setModelo] = useState(MODELOS_IA[0]);
  const [prompt, setPrompt] = useState("");
  const [saida, setSaida] = useState("");
  const [rodando, setRodando] = useState(false);
  const [execucaoId, setExecucaoId] = useState<string | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

  /** Execução no servidor Claude Agent SDK (Railway). */
  const executarRemoto = async () => {
    const { data: auth } = await supabase.auth.getUser();
    const agente = agentes.find((a) => a.id === agentId) ?? null;
    const { data: exec, error } = await db
      .from("aip_executions")
      .insert({
        estabelecimento_id: estabelecimentoId,
        agent_id: agente?.id ?? null,
        workflow_id: workflowId === "nenhum" ? null : workflowId,
        origem: "playground",
        usuario_id: auth?.user?.id ?? null,
        status: "executando",
        modelo: agente?.modelo_ia ?? modelo,
        prompt,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    setExecucaoId(exec.id);

    await agentRunner.start({
      execution_id: exec.id,
      agent: agente as any,
      workflow: workflowId === "nenhum" ? null : { id: workflowId },
      modelo: agente?.modelo_ia ?? modelo,
      prompt,
    });

    const ac = new AbortController();
    setController(ac);
    await streamRun(exec.id, (txt) => setSaida((s) => s + txt), ac.signal);
  };

  const executar = async () => {
    if (!estabelecimentoId) return;
    if (!prompt.trim() && workflowId === "nenhum") return toast.error("Informe um prompt");
    setRodando(true);
    setSaida("");
    setExecucaoId(null);
    try {
      await executarRemoto();
    } catch (e: any) {
      setSaida((s) => `${s}\n\n[erro] ${e.message}`);
      toast.error(`Falha na execução: ${e.message}`);
    } finally {
      setRodando(false);
      setController(null);
    }
  };

  const parar = async () => {
    controller?.abort();
    if (execucaoId) {
      try {
        await agentRunner.cancel(execucaoId);
        await db.from("aip_executions").update({ status: "cancelada" }).eq("id", execucaoId);
      } catch {
        /* ignora */
      }
    }
    setRodando(false);
    toast.info("Execução interrompida");
  };


  return (
    <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="space-y-2">
            <Label>Agente</Label>
            <Select value={agentId} onValueChange={setAgentId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum (prompt direto)</SelectItem>
                {agentes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Workflow</Label>
            <Select value={workflowId} onValueChange={setWorkflowId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nenhum">Nenhum</SelectItem>
                {workflows.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Modelo</Label>
            <ModeloSelect value={modelo} onChange={setModelo} disabled={agentId !== "nenhum"} />

          </div>
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea rows={8} value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </div>
          {rodando ? (
            <Button className="w-full" variant="outline" onClick={parar}>
              <Square className="mr-2 h-4 w-4" /> Parar
            </Button>
          ) : (
            <Button className="w-full" onClick={executar}>
              <Send className="mr-2 h-4 w-4" /> Executar
            </Button>
          )}
        </CardContent>
      </Card>

      <Card className="min-h-[420px]">
        <CardContent className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center gap-2">
            <TerminalSquare className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium">Saída</p>
            {rodando && (
              <Badge variant="secondary" className="gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> executando
              </Badge>
            )}
            {execucaoId && <Badge variant="outline">#{execucaoId.slice(0, 8)}</Badge>}
          </div>
          <ScrollArea className="flex-1 rounded-lg border border-border bg-muted/40">
            <pre className="whitespace-pre-wrap p-3 text-sm">
              {saida || "A resposta do agente aparecerá aqui."}
            </pre>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
