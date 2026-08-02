import { useMemo, useState } from "react";
import { useAipTable, db, useEstabelecimento } from "@/lib/aip/db";
import { AipWizard, AipWizardStep, AipWorkflow } from "@/lib/aip/types";
import { AipToolbar } from "@/components/ia-platform/AipToolbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Pencil, Play, Plus, Trash2, Wand2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { agentRunner } from "@/lib/aip/runner";

const novoPasso = (): AipWizardStep => ({
  id: crypto.randomUUID(),
  titulo: "Nova etapa",
  descricao: "",
  tipo: "campos",
  campos: [{ nome: "campo1", label: "Campo 1", tipo: "texto", obrigatorio: true }],
});

const vazio: Partial<AipWizard> = {
  nome: "",
  descricao: "",
  icone: "🪄",
  etapas: [novoPasso()],
  workflow_id: null,
  entrega: {},
  ativo: true,
};

export default function WizardsPage() {
  const { items, loading, create, update, remove } = useAipTable<AipWizard>("aip_wizards");
  const { items: workflows } = useAipTable<AipWorkflow>("aip_workflows");
  const estabelecimentoId = useEstabelecimento();

  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState<AipWizard | null>(null);
  const [form, setForm] = useState<Partial<AipWizard>>(vazio);
  const [excluir, setExcluir] = useState<AipWizard | null>(null);

  const [executando, setExecutando] = useState<AipWizard | null>(null);
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [enviando, setEnviando] = useState(false);

  const filtrados = useMemo(
    () => items.filter((w) => `${w.nome} ${w.descricao ?? ""}`.toLowerCase().includes(busca.toLowerCase())),
    [items, busca],
  );

  const salvar = async () => {
    if (!form.nome?.trim()) return toast.error("Informe o nome do wizard");
    const ok = editando ? await update(editando.id, form) : await create(form);
    if (ok) setAberto(false);
  };

  const atualizarEtapa = (idx: number, patch: Partial<AipWizardStep>) => {
    const etapas = [...(form.etapas ?? [])];
    etapas[idx] = { ...etapas[idx], ...patch };
    setForm({ ...form, etapas });
  };

  const iniciarExecucao = async () => {
    if (!executando || !estabelecimentoId) return;
    setEnviando(true);
    try {
      const { data: auth } = await (await import("@/integrations/supabase/client")).supabase.auth.getUser();
      const { data: exec, error } = await db
        .from("aip_executions")
        .insert({
          estabelecimento_id: estabelecimentoId,
          wizard_id: executando.id,
          workflow_id: executando.workflow_id,
          origem: "wizard",
          usuario_id: auth?.user?.id ?? null,
          status: "pendente",
          input: respostas,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      await agentRunner.start({
        execution_id: exec.id,
        workflow: executando.workflow_id ? { id: executando.workflow_id } : null,
        input: respostas,
      });
      toast.success("Execução iniciada");
      setExecutando(null);
      setRespostas({});
      setPasso(0);
    } catch (e: any) {
      toast.error(`Falha ao iniciar: ${e.message}`);
    } finally {
      setEnviando(false);
    }
  };

  const etapaAtual = executando?.etapas?.[passo];

  return (
    <>
      <AipToolbar
        busca={busca}
        onBusca={setBusca}
        onNovo={() => {
          setEditando(null);
          setForm({ ...vazio, etapas: [novoPasso()] });
          setAberto(true);
        }}
        novoLabel="Novo wizard"
        loading={loading}
        vazio={filtrados.length === 0}
        vazioTexto="Nenhum wizard criado."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((w) => (
            <Card key={w.id} className="transition-all hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-2xl">{w.icone ?? "🪄"}</span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{w.nome}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {w.etapas?.length ?? 0} etapa(s)
                      </p>
                    </div>
                  </div>
                  <Badge variant={w.ativo ? "default" : "secondary"}>{w.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">{w.descricao || "—"}</p>
                <div className="flex flex-nowrap gap-1">
                  <Button
                    size="sm"
                    onClick={() => {
                      setExecutando(w);
                      setPasso(0);
                      setRespostas({});
                    }}
                  >
                    <Play className="mr-1 h-3.5 w-3.5" /> Executar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditando(w);
                      setForm({ ...w });
                      setAberto(true);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setExcluir(w)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </AipToolbar>

      {/* Editor */}
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar wizard" : "Novo wizard"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[80px_1fr]">
              <div className="space-y-2">
                <Label>Ícone</Label>
                <Input value={form.icone ?? ""} onChange={(e) => setForm({ ...form, icone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={form.descricao ?? ""}
                onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Workflow executado</Label>
              <Select
                value={form.workflow_id ?? "nenhum"}
                onValueChange={(v) => setForm({ ...form, workflow_id: v === "nenhum" ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Etapas</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setForm({ ...form, etapas: [...(form.etapas ?? []), novoPasso()] })}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar etapa
                </Button>
              </div>
              {(form.etapas ?? []).map((etapa, idx) => (
                <div key={etapa.id} className="space-y-3 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{idx + 1}</Badge>
                    <Input
                      value={etapa.titulo}
                      onChange={(e) => atualizarEtapa(idx, { titulo: e.target.value })}
                      className="h-8"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setForm({ ...form, etapas: (form.etapas ?? []).filter((_, i) => i !== idx) })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <Textarea
                    rows={2}
                    placeholder="Descrição da etapa"
                    value={etapa.descricao ?? ""}
                    onChange={(e) => atualizarEtapa(idx, { descricao: e.target.value })}
                  />
                  <div className="space-y-2">
                    <Label className="text-xs">Campos (um por linha: nome|rótulo)</Label>
                    <Textarea
                      rows={3}
                      className="font-mono text-xs"
                      value={(etapa.campos ?? []).map((c) => `${c.nome}|${c.label}`).join("\n")}
                      onChange={(e) =>
                        atualizarEtapa(idx, {
                          campos: e.target.value
                            .split("\n")
                            .map((l) => l.trim())
                            .filter(Boolean)
                            .map((l) => {
                              const [nome, label] = l.split("|");
                              return {
                                nome: nome?.trim() || "campo",
                                label: label?.trim() || nome?.trim() || "Campo",
                                tipo: "texto" as const,
                                obrigatorio: false,
                              };
                            }),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Execução guiada */}
      <Dialog open={!!executando} onOpenChange={(o) => !o && setExecutando(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              {executando?.nome}
            </DialogTitle>
          </DialogHeader>
          {etapaAtual && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {(executando?.etapas ?? []).map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i <= passo ? "bg-primary" : "bg-muted"}`}
                  />
                ))}
              </div>
              <div>
                <p className="font-medium">{etapaAtual.titulo}</p>
                {etapaAtual.descricao && (
                  <p className="text-sm text-muted-foreground">{etapaAtual.descricao}</p>
                )}
              </div>
              {(etapaAtual.campos ?? []).map((campo) => (
                <div key={campo.nome} className="space-y-2">
                  <Label>{campo.label}</Label>
                  <Textarea
                    rows={2}
                    value={respostas[campo.nome] ?? ""}
                    onChange={(e) => setRespostas({ ...respostas, [campo.nome]: e.target.value })}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={passo === 0} onClick={() => setPasso((p) => p - 1)}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
            </Button>
            {passo < (executando?.etapas?.length ?? 1) - 1 ? (
              <Button onClick={() => setPasso((p) => p + 1)}>
                Avançar <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={iniciarExecucao} disabled={enviando}>
                <Play className="mr-1 h-4 w-4" /> Executar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        itemName={excluir?.nome}
        onConfirm={async () => {
          if (excluir) await remove(excluir.id);
          setExcluir(null);
        }}
      />
    </>
  );
}
