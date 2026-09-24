import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    .from("customer_empresas").select("empresa_id, customer_id, customers(id, name, ativo)")
    .in("empresa_id", empresaIds).neq("customer_id", contatoId);

  return vinc.map((v: any) => ({
    empresaId: v.empresa_id,
    empresaNome: v.empresas?.nome_fantasia || v.empresas?.nome || "Empresa",
    candidatos: (outros || [])
      .filter((o: any) => o.empresa_id === v.empresa_id && o.customers && o.customers.ativo !== false)
      .map((o: any) => ({ id: o.customers.id, name: o.customers.name })),
  }));
}

interface Props {
  open: boolean;
  contato: { id: string; name: string } | null;
  empresas: EmpresaSubstituicao[];
  modo?: 'inativar' | 'excluir';
  onCancel: () => void;
  onConfirm: (novoContato: { id: string; name: string } | null) => Promise<void>;
}

export function SubstituirContatoInativadoDialog({ open, contato, empresas, modo = 'inativar', onCancel, onConfirm }: Props) {
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { setEscolhas({}); }, [open]);

  const comCandidatos = empresas.filter(e => e.candidatos.length > 0);
  const completo = comCandidatos.every(e => escolhas[e.empresaId]);

  const confirmar = async () => {
    setSalvando(true);
    try {
      const primeira = comCandidatos[0];
      const id = primeira ? escolhas[primeira.empresaId] : undefined;
      const novo = id ? primeira.candidatos.find(c => c.id === id) || null : null;
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
            <div key={e.empresaId} className="space-y-1">
              <Label>{e.empresaNome}</Label>
              {e.candidatos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum outro contato ativo nesta empresa. Cadastre um novo contato antes, ou continue sem substituto (as tarefas não serão transferidas).</p>
              ) : (
                <Select value={escolhas[e.empresaId] || ""} onValueChange={(v) => setEscolhas(s => ({ ...s, [e.empresaId]: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o novo contato" /></SelectTrigger>
                  <SelectContent>
                    {e.candidatos.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
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
