import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/aip/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { History, RotateCcw, Lock } from "lucide-react";
import { toast } from "sonner";

type Versao = {
  id: string;
  versao: number;
  nota: string | null;
  created_at: string;
  flow_data: { nodes?: unknown[]; edges?: unknown[] } | null;
};

interface Props {
  workflowId?: string;
  versaoAtual: number;
  onRestaurar: (nodes: any[], edges: any[], versao: number) => void;
}

export function WorkflowVersionsDialog({ workflowId, versaoAtual, onRestaurar }: Props) {
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [versoes, setVersoes] = useState<Versao[]>([]);

  const carregar = useCallback(async () => {
    if (!workflowId) return;
    setCarregando(true);
    const { data, error } = await db
      .from("aip_workflow_versions")
      .select("id, versao, nota, created_at, flow_data")
      .eq("workflow_id", workflowId)
      .order("versao", { ascending: false });
    setCarregando(false);
    if (error) return toast.error(`Erro ao carregar versões: ${error.message}`);
    setVersoes((data ?? []) as Versao[]);
  }, [workflowId]);

  useEffect(() => {
    if (aberto) carregar();
  }, [aberto, carregar]);

  const restaurar = (v: Versao) => {
    onRestaurar((v.flow_data?.nodes as any[]) ?? [], (v.flow_data?.edges as any[]) ?? [], v.versao);
    setAberto(false);
    toast.success(`Conteúdo da v${v.versao} carregado. Salve para gerar uma nova versão.`);
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        disabled={!workflowId}
        onClick={() => setAberto(true)}
        title={workflowId ? "Histórico de versões" : "Salve o workflow para versionar"}
      >
        <History className="mr-1 h-4 w-4" /> Versões
      </Button>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Histórico de versões
            </DialogTitle>
            <DialogDescription>
              Cada salvamento gera uma versão imutável. Execuções guardam um snapshot da versão usada,
              garantindo reprodutibilidade.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-2">
            <div className="space-y-2">
              {carregando && <p className="text-sm text-muted-foreground">Carregando…</p>}
              {!carregando && versoes.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma versão registrada ainda.</p>
              )}
              {versoes.map((v) => (
                <div
                  key={v.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
                >
                  <Badge variant={v.versao === versaoAtual ? "default" : "outline"}>v{v.versao}</Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{v.nota || "Sem observação"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleString("pt-BR")} ·{" "}
                      {(v.flow_data?.nodes as any[] | undefined)?.length ?? 0} blocos
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" /> imutável
                  </span>
                  <Button size="sm" variant="secondary" onClick={() => restaurar(v)}>
                    <RotateCcw className="mr-1 h-4 w-4" /> Restaurar
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
