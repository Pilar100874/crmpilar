import { useEffect, useMemo, useState } from "react";
import { useAipTable, db, useEstabelecimento } from "@/lib/aip/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ApiKey {
  id: string;
  nome: string;
  prefixo: string | null;
  escopos: string[];
  ativo: boolean;
  ultimo_uso: string | null;
  created_at: string;
}

interface Limite {
  id: string;
  escopo: string;
  referencia_id: string | null;
  limite_custo_mes: number | null;
  limite_execucoes_dia: number | null;
  limite_tokens_mes: number | null;
  ativo: boolean;
}

export default function SegurancaPage() {
  const estabelecimentoId = useEstabelecimento();
  const { items: chaves, create: criarChave, remove: removerChave, refetch } =
    useAipTable<any>("aip_api_keys");
  const { items: limites, create: criarLimite, update: atualizarLimite, remove: removerLimite } =
    useAipTable<any>("aip_usage_limits");

  const [auditoria, setAuditoria] = useState<any[]>([]);
  const [novaChave, setNovaChave] = useState(false);
  const [nomeChave, setNomeChave] = useState("");
  const [chaveGerada, setChaveGerada] = useState<string | null>(null);
  const [excluirChave, setExcluirChave] = useState<ApiKey | null>(null);

  useEffect(() => {
    if (!estabelecimentoId) return;
    db.from("aip_audit_log")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: any) => setAuditoria(data ?? []));
  }, [estabelecimentoId, chaves.length]);

  const gerarChave = async () => {
    if (!nomeChave.trim()) return toast.error("Informe um nome para a chave");
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const valor = `aip_${token}`;
    const hashBuf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(valor));
    const hash = Array.from(new Uint8Array(hashBuf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const ok = await criarChave({
      nome: nomeChave,
      prefixo: valor.slice(0, 12),
      hash,
      escopos: ["execucao"],
      ativo: true,
    });
    if (ok) {
      setChaveGerada(valor);
      setNomeChave("");
      refetch();
    }
  };

  const limitesPorEscopo = useMemo(() => limites as Limite[], [limites]);

  return (
    <>
      <Tabs defaultValue="chaves">
        <TabsList>
          <TabsTrigger value="chaves">Chaves de API</TabsTrigger>
          <TabsTrigger value="limites">Limites de uso</TabsTrigger>
          <TabsTrigger value="auditoria">Auditoria</TabsTrigger>
        </TabsList>

        <TabsContent value="chaves" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4" /> Chaves de API
              </CardTitle>
              <Button size="sm" onClick={() => setNovaChave(true)}>
                <Plus className="mr-1 h-4 w-4" /> Nova chave
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {chaves.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma chave criada.</p>
              ) : (
                (chaves as ApiKey[]).map((k) => (
                  <div
                    key={k.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{k.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {k.prefixo}••••••• · criada em {new Date(k.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={k.ativo ? "default" : "secondary"}>{k.ativo ? "Ativa" : "Revogada"}</Badge>
                      <Button size="sm" variant="outline" onClick={() => setExcluirChave(k)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="limites" className="pt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldCheck className="h-4 w-4" /> Limites de uso
              </CardTitle>
              <Button
                size="sm"
                onClick={() =>
                  criarLimite({
                    escopo: "estabelecimento",
                    limite_custo_mes: 100,
                    limite_execucoes_dia: 200,
                    limite_tokens_mes: 1000000,
                    ativo: true,
                  })
                }
              >
                <Plus className="mr-1 h-4 w-4" /> Novo limite
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {limitesPorEscopo.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum limite configurado.</p>
              ) : (
                limitesPorEscopo.map((l) => (
                  <div key={l.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Escopo</Label>
                      <Badge variant="outline">{l.escopo}</Badge>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Custo/mês (R$)</Label>
                      <Input
                        type="number"
                        defaultValue={l.limite_custo_mes ?? 0}
                        onBlur={(e) => atualizarLimite(l.id, { limite_custo_mes: Number(e.target.value) })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Execuções/dia</Label>
                      <Input
                        type="number"
                        defaultValue={l.limite_execucoes_dia ?? 0}
                        onBlur={(e) => atualizarLimite(l.id, { limite_execucoes_dia: Number(e.target.value) })}
                      />
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Tokens/mês</Label>
                        <Input
                          type="number"
                          defaultValue={l.limite_tokens_mes ?? 0}
                          onBlur={(e) => atualizarLimite(l.id, { limite_tokens_mes: Number(e.target.value) })}
                        />
                      </div>
                      <Button size="sm" variant="outline" onClick={() => removerLimite(l.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria" className="pt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Últimas 100 ações</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[480px]">
                {auditoria.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum registro.</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {auditoria.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                        <span className="truncate">
                          <Badge variant="outline" className="mr-2">
                            {a.acao}
                          </Badge>
                          {a.recurso_tipo ?? "—"}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(a.created_at).toLocaleString("pt-BR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={novaChave}
        onOpenChange={(o) => {
          setNovaChave(o);
          if (!o) setChaveGerada(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova chave de API</DialogTitle>
          </DialogHeader>
          {chaveGerada ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Copie a chave agora — ela não será exibida novamente.
              </p>
              <code className="block break-all rounded-lg bg-muted p-3 text-xs">{chaveGerada}</code>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(chaveGerada);
                  toast.success("Chave copiada");
                }}
              >
                Copiar chave
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Nome da chave</Label>
              <Input value={nomeChave} onChange={(e) => setNomeChave(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setNovaChave(false);
                setChaveGerada(null);
              }}
            >
              Fechar
            </Button>
            {!chaveGerada && <Button onClick={gerarChave}>Gerar</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluirChave}
        onOpenChange={(o) => !o && setExcluirChave(null)}
        itemName={excluirChave?.nome}
        onConfirm={async () => {
          if (excluirChave) await removerChave(excluirChave.id);
          setExcluirChave(null);
        }}
      />
    </>
  );
}
