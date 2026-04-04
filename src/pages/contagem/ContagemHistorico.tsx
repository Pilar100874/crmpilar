import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, AlertTriangle, CheckCircle, Package } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const tipoLabel: Record<string, string> = {
  pacotes_graficos: "Pacotes Gráficos",
  caixas: "Caixas",
  fardos: "Fardos",
  generico: "Genérico",
};

const ContagemHistorico = () => {
  const navigate = useNavigate();
  const [contagens, setContagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroBusca, setFiltroBusca] = useState("");
  const [filtroData, setFiltroData] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    const estabId = getEstabelecimentoId();
    if (!estabId) return;
    const { data } = await supabase
      .from("contagens")
      .select("*")
      .eq("estabelecimento_id", estabId)
      .order("created_at", { ascending: false });
    setContagens(data || []);
    setLoading(false);
  };

  const filtered = contagens.filter(c => {
    if (filtroTipo !== "todos" && c.tipo_objeto !== filtroTipo) return false;
    if (filtroData && !c.created_at.startsWith(filtroData)) return false;
    if (filtroBusca) {
      const search = filtroBusca.toLowerCase();
      return (
        (c.observacoes || "").toLowerCase().includes(search) ||
        (tipoLabel[c.tipo_objeto] || "").toLowerCase().includes(search) ||
        String(c.quantidade_detectada).includes(search)
      );
    }
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/contagem")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Histórico de Contagens</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={filtroBusca}
            onChange={e => setFiltroBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pacotes_graficos">Pacotes Gráficos</SelectItem>
            <SelectItem value="caixas">Caixas</SelectItem>
            <SelectItem value="fardos">Fardos</SelectItem>
            <SelectItem value="generico">Genérico</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filtroData}
          onChange={e => setFiltroData(e.target.value)}
          className="w-full sm:w-40"
        />
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map(c => (
          <Card
            key={c.id}
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(`/contagem/detalhe/${c.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {c.divergencia ? (
                    <div className="p-2 rounded-lg bg-orange-500/10"><AlertTriangle className="w-4 h-4 text-orange-500" /></div>
                  ) : (
                    <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="w-4 h-4 text-green-500" /></div>
                  )}
                  <div>
                    <p className="font-medium text-sm">{tipoLabel[c.tipo_objeto] || c.tipo_objeto}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                    {c.observacoes && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{c.observacoes}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">{c.quantidade_detectada}</p>
                  {c.quantidade_esperada != null && (
                    <p className="text-xs text-muted-foreground">Esperado: {c.quantidade_esperada}</p>
                  )}
                  {c.divergencia && <Badge variant="destructive" className="text-[10px]">Divergência</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Nenhuma contagem encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContagemHistorico;
