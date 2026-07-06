import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  empresaId: string;
}

export const EmpresaVisitasTab: React.FC<Props> = ({ empresaId }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: custs } = await supabase.from("customers").select("id").eq("empresa_id", empresaId);
    const customerIds = (custs || []).map((c: any) => c.id);
    if (customerIds.length === 0) { setRows([]); setLoading(false); return; }
    const { data: progs } = await supabase.from("visita_programacoes")
      .select("id, cliente_nome, endereco").in("customer_id", customerIds);
    const progMap = new Map((progs || []).map((p: any) => [p.id, p]));
    const progIds = Array.from(progMap.keys());
    if (progIds.length === 0) { setRows([]); setLoading(false); return; }
    const { data: ocorr } = await supabase.from("visita_ocorrencias")
      .select("id, data_prevista, janela_inicio, janela_fim, status, hora_chegada, hora_saida, duracao_min, origem, fonte_deteccao, programacao_id")
      .in("programacao_id", progIds)
      .order("data_prevista", { ascending: false })
      .limit(200);
    setRows((ocorr || []).map((o: any) => ({ ...o, prog: progMap.get(o.programacao_id) })));
    setLoading(false);
  }, [empresaId]);

  useEffect(() => { if (empresaId) load(); }, [empresaId, load]);

  function statusBadge(s: string) {
    const map: Record<string, { label: string; variant: any }> = {
      verificada: { label: "Verificada", variant: "default" },
      pendente: { label: "Pendente", variant: "secondary" },
      nao_verificada: { label: "Não verificada", variant: "destructive" },
      espontanea: { label: "Espontânea", variant: "outline" },
    };
    const m = map[s] || { label: s, variant: "secondary" };
    return <Badge variant={m.variant} className="text-[10px]">{m.label}</Badge>;
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-medium flex items-center gap-2"><Calendar className="h-4 w-4" /> Visitas</h3>
        <p className="text-xs text-muted-foreground">Histórico de visitas programadas e realizadas.</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Carregando...</div>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          Nenhuma visita registrada para este cliente.
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map(r => (
            <Card key={r.id}>
              <CardContent className="p-3 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    {format(new Date(r.data_prevista + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                    <span className="text-muted-foreground font-normal">
                      {r.janela_inicio?.slice(0, 5)} - {r.janela_fim?.slice(0, 5)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.origem === "espontanea" && <Badge variant="outline" className="text-[10px]">Espontânea</Badge>}
                    {statusBadge(r.status)}
                  </div>
                </div>
                {(r.hora_chegada || r.hora_saida) && (
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {r.hora_chegada && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Chegada: {format(new Date(r.hora_chegada), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    )}
                    {r.hora_saida && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Saída: {format(new Date(r.hora_saida), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    )}
                    {r.duracao_min != null && <span>Duração: {r.duracao_min} min</span>}
                  </div>
                )}
                {r.prog?.endereco && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {r.prog.endereco}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

/** Utilitário: retorna a data/hora da última visita realizada de um cliente (empresa) */
export async function fetchUltimaVisitaEmpresa(empresaId: string): Promise<Date | null> {
  const { data: custs } = await supabase.from("customers").select("id").eq("empresa_id", empresaId);
  const customerIds = (custs || []).map((c: any) => c.id);
  if (customerIds.length === 0) return null;
  const { data: progs } = await supabase.from("visita_programacoes").select("id").in("customer_id", customerIds);
  const progIds = (progs || []).map((p: any) => p.id);
  if (progIds.length === 0) return null;
  const { data: ocorr } = await supabase.from("visita_ocorrencias")
    .select("hora_chegada, data_prevista, status")
    .in("programacao_id", progIds)
    .not("hora_chegada", "is", null)
    .order("hora_chegada", { ascending: false })
    .limit(1);
  const row = ocorr?.[0];
  if (!row) return null;
  return row.hora_chegada ? new Date(row.hora_chegada) : null;
}
