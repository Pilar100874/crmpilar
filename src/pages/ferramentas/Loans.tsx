import { useEffect, useMemo, useState } from "react";
import { MainLayout } from "@/components/ferramentas/layout/MainLayout";
import { PageHeader } from "@/components/ferramentas/ui/page-header";
import { EmptyState } from "@/components/ferramentas/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/ferramentas/supabase";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Loader2, RefreshCw, Search, Warehouse, X } from "lucide-react";

interface LoanRow {
  id: string;
  status: string;
  loan_date: string;
  due_date: string | null;
  return_date: string | null;
  notes: string | null;
  tools?: { name: string | null; serial_number: string | null } | null;
  profiles?: { id: string; full_name: string | null; email: string | null } | null;
  warehouses?: { name: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = {
  ativo: "Ativo",
  devolvido: "Devolvido",
  vencido: "Vencido",
  renovacao_solicitada: "Prorrogação solicitada",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "warning" | "success"> = {
  ativo: "default",
  devolvido: "success",
  vencido: "destructive",
  renovacao_solicitada: "warning",
};

function formatarData(valor?: string | null) {
  if (!valor) return "—";
  try {
    return format(new Date(valor), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
}

export default function FerrLoans() {
  const { toast } = useToast();
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [status, setStatus] = useState<string>("todos");
  const [clienteId, setClienteId] = useState<string>("todos");

  const carregar = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("ferr_loans")
        .select(
          "*, tools:ferr_tools(name, serial_number), profiles:ferr_profiles!ferr_loans_user_id_fkey(id, full_name, email), warehouses:ferr_warehouses(name)",
        )
        .order("loan_date", { ascending: false })
        .limit(500);

      if (error) throw error;
      setLoans((data as unknown as LoanRow[]) || []);
    } catch (err: any) {
      console.error("Erro ao carregar registros:", err);
      toast({
        variant: "destructive",
        title: "Não foi possível carregar os registros",
        description: err?.message || "Tente novamente em instantes.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clientes = useMemo(() => {
    const mapa = new Map<string, string>();
    loans.forEach((l) => {
      if (l.profiles?.id) mapa.set(l.profiles.id, l.profiles.full_name || l.profiles.email || "Sem nome");
    });
    return Array.from(mapa, ([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [loans]);

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return loans.filter((l) => {
      if (status !== "todos" && l.status !== status) return false;
      if (clienteId !== "todos" && l.profiles?.id !== clienteId) return false;
      if (!termo) return true;
      const alvo = [
        l.tools?.name,
        l.tools?.serial_number,
        l.profiles?.full_name,
        l.profiles?.email,
        l.warehouses?.name,
        l.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return alvo.includes(termo);
    });
  }, [loans, busca, status, clienteId]);

  const temFiltro = busca !== "" || status !== "todos" || clienteId !== "todos";

  const limpar = () => {
    setBusca("");
    setStatus("todos");
    setClienteId("todos");
  };

  return (
    <MainLayout>
      <PageHeader
        title="Registros"
        description="Busque e filtre todos os empréstimos por status e colaborador"
        action={
          <Button variant="outline" onClick={carregar} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        }
      />

      <Card className="mb-6">
        <CardContent className="grid gap-4 p-4 md:grid-cols-3">
          <div className="space-y-1.5 md:col-span-1">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Ferramenta, série, colaborador..."
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {Object.entries(STATUS_LABEL).map(([valor, rotulo]) => (
                  <SelectItem key={valor} value={valor}>
                    {rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Colaborador</Label>
            <Select value={clienteId} onValueChange={setClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os colaboradores</SelectItem>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {temFiltro && (
            <div className="md:col-span-3">
              <Button variant="ghost" size="sm" onClick={limpar}>
                <X className="mr-2 h-4 w-4" />
                Limpar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Carregando registros...
        </div>
      ) : filtrados.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhum registro encontrado"
          description={
            temFiltro
              ? "Ajuste a busca ou os filtros para encontrar o que procura."
              : "Ainda não há empréstimos registrados."
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {filtrados.length} registro(s) encontrado(s)
          </p>

          {/* Cards no mobile */}
          <div className="grid gap-3 md:hidden">
            {filtrados.map((l) => (
              <Card key={l.id}>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{l.tools?.name || "Ferramenta removida"}</p>
                    <Badge variant={STATUS_VARIANT[l.status] || "secondary"}>
                      {STATUS_LABEL[l.status] || l.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {l.profiles?.full_name || l.profiles?.email || "Sem colaborador"}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <p>Saída: {formatarData(l.loan_date)}</p>
                    <p>Prazo: {formatarData(l.due_date)}</p>
                    <p>Devolução: {formatarData(l.return_date)}</p>
                  </div>
                  {l.warehouses?.name && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Warehouse className="h-3 w-3" />
                      {l.warehouses.name}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabela no desktop */}
          <Card className="hidden md:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50 text-left">
                    <tr>
                      <th className="px-4 py-3 font-medium">Ferramenta</th>
                      <th className="px-4 py-3 font-medium">Colaborador</th>
                      <th className="px-4 py-3 font-medium">Almoxarifado</th>
                      <th className="px-4 py-3 font-medium">Saída</th>
                      <th className="px-4 py-3 font-medium">Prazo</th>
                      <th className="px-4 py-3 font-medium">Devolução</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((l) => (
                      <tr key={l.id} className="border-b transition-colors last:border-0 hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <p className="font-medium">{l.tools?.name || "Ferramenta removida"}</p>
                          {l.tools?.serial_number && (
                            <p className="text-xs text-muted-foreground">{l.tools.serial_number}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {l.profiles?.full_name || l.profiles?.email || "—"}
                        </td>
                        <td className="px-4 py-3">{l.warehouses?.name || "—"}</td>
                        <td className="px-4 py-3">{formatarData(l.loan_date)}</td>
                        <td className="px-4 py-3">{formatarData(l.due_date)}</td>
                        <td className="px-4 py-3">{formatarData(l.return_date)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={STATUS_VARIANT[l.status] || "secondary"}>
                            {STATUS_LABEL[l.status] || l.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </MainLayout>
  );
}
