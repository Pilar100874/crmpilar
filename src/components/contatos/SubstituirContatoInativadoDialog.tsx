import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export interface EmpresaSubstituicao {
  empresaId: string;
  empresaNome: string;
  candidatos: { id: string; name: string }[];
}

/** Verifica se a regra está ativa e retorna as empresas do contato com os possíveis substitutos. */
export async function carregarSubstituicaoContato(contatoId: string, estabelecimentoId: string | null): Promise<EmpresaSubstituicao[] | null> {
  if (!estabelecimentoId) return null;
  const { data: regra } = await (supabase as any)
    .from("calendario_regras").select("ativa")
    .eq("estabelecimento_id", estabelecimentoId).eq("tipo", "substituir_contato_inativado").maybeSingle();
  if (!regra?.ativa) return null;

  const { data: vinc } = await (supabase as any)
    .from("customer_empresas").select("empresa_id, empresas(nome_fantasia, nome)").eq("customer_id", contatoId);
  if (!vinc?.length) return null;

  const empresaIds = vinc.map((v: any) => v.empresa_id);
  const { data: outros } = await (supabase as any)
    .from("customer_empresas").select("empresa_id, customer_id, customers(id, nome, ativo)")
    .in("empresa_id", empresaIds).neq("customer_id", contatoId);

  return vinc.map((v: any) => ({
    empresaId: v.empresa_id,
    empresaNome: v.empresas?.nome_fantasia || v.empresas?.nome || "Empresa",
    candidatos: (outros || [])
      .filter((o: any) => o.empresa_id === v.empresa_id && o.customers && o.customers.ativo !== false)
      .map((o: any) => ({ id: o.customers.id, name: o.customers.nome })),
  }));
}

interface Props {
  open: boolean;
  contato: { id: string; name: string } | null;
  empresas: EmpresaSubstituicao[];
  estabelecimentoId: string | null;
  modo?: 'inativar' | 'excluir';
  onCancel: () => void;
  onConfirm: (novoContato: { id: string; name: string } | null) => Promise<void>;
}

export function SubstituirContatoInativadoDialog({ open, contato, empresas, estabelecimentoId, modo = 'inativar', onCancel, onConfirm }: Props) {
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [novos, setNovos] = useState<Record<string, { nome: string; telefone: string }>>({});
  const [criados, setCriados] = useState<Record<string, { id: string; name: string }>>({});
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { setEscolhas({}); setNovos({}); setCriados({}); }, [open]);

  // Toda empresa precisa ter um substituto: ou um contato existente escolhido, ou um novo cadastrado.
  const completo = empresas.every(e =>
    e.candidatos.length > 0 ? !!escolhas[e.empresaId] : !!criados[e.empresaId]
  );

  const cadastrarNovo = async (empresaId: string) => {
    const dados = novos[empresaId];
    if (!dados?.nome.trim()) { toast.error("Informe o nome do novo contato"); return; }
    if (!estabelecimentoId) { toast.error("Estabelecimento não identificado"); return; }
    setSalvando(true);
    try {
      const { data: novo, error: errC } = await (supabase as any)
        .from("customers")
        .insert({ nome: dados.nome.trim(), email: "", telefone: dados.telefone.trim() || null, estabelecimento_id: estabelecimentoId, ativo: true })
        .select("id, nome").single();
      if (errC) throw errC;
      const { error: errV } = await (supabase as any)
        .from("customer_empresas")
        .insert({ customer_id: novo.id, empresa_id: empresaId });
      if (errV) throw errV;
      setCriados(s => ({ ...s, [empresaId]: { id: novo.id, name: novo.nome } }));
      toast.success(`Contato ${novo.nome} cadastrado e vinculado à empresa`);
    } catch (e: any) {
      console.error('Erro ao cadastrar novo contato:', e);
      toast.error(e?.message || "Erro ao cadastrar novo contato");
    } finally { setSalvando(false); }
  };

  const confirmar = async () => {
    setSalvando(true);
    try {
      // As tarefas vão para o substituto da primeira empresa da lista.
      const primeira = empresas[0];
      let novo: { id: string; name: string } | null = null;
      if (primeira) {
        if (primeira.candidatos.length > 0) {
          const id = escolhas[primeira.empresaId];
          novo = primeira.candidatos.find(c => c.id === id) || null;
        } else {
          novo = criados[primeira.empresaId] || null;
        }
      }
      await onConfirm(novo);
    } finally { setSalvando(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Indicar novo contato da empresa</DialogTitle>
          <DialogDescription>
            O contato <strong>{contato?.name}</strong> está vinculado a empresa. Indique o novo contato — as tarefas do calendário serão transferidas para ele.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {empresas.map(e => (
            <div key={e.empresaId} className="space-y-2">
              <Label>{e.empresaNome}</Label>
              {e.candidatos.length > 0 ? (
                <Select value={escolhas[e.empresaId] || ""} onValueChange={(v) => setEscolhas(s => ({ ...s, [e.empresaId]: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o novo contato" /></SelectTrigger>
                  <SelectContent>
                    {e.candidatos.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : criados[e.empresaId] ? (
                <p className="text-sm text-green-600 dark:text-green-400">
                  Novo contato cadastrado: <strong>{criados[e.empresaId].name}</strong>
                </p>
              ) : (
                <div className="space-y-2 rounded-md border p-3">
                  <p className="text-sm text-muted-foreground">Nenhum outro contato ativo nesta empresa. Cadastre o novo contato para continuar:</p>
                  <Input
                    placeholder="Nome do novo contato *"
                    value={novos[e.empresaId]?.nome || ""}
                    onChange={(ev) => setNovos(s => ({ ...s, [e.empresaId]: { nome: ev.target.value, telefone: s[e.empresaId]?.telefone || "" } }))}
                  />
                  <Input
                    placeholder="Telefone (opcional)"
                    value={novos[e.empresaId]?.telefone || ""}
                    onChange={(ev) => setNovos(s => ({ ...s, [e.empresaId]: { nome: s[e.empresaId]?.nome || "", telefone: ev.target.value } }))}
                  />
                  <Button size="sm" variant="secondary" onClick={() => cadastrarNovo(e.empresaId)} disabled={salvando || !novos[e.empresaId]?.nome.trim()}>
                    Cadastrar e vincular
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!completo || salvando}>{modo === 'excluir' ? 'Excluir' : 'Inativar'} e transferir tarefas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
