import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Camera, Trash2, Eye, Loader2, Package, CalendarIcon, Crop } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { cn } from "@/lib/utils";

const ContagemDashboard = () => {
  const navigate = useNavigate();
  const [contagens, setContagens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [showDateDelete, setShowDateDelete] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [deletingRange, setDeletingRange] = useState(false);
  const [confirmRangeDelete, setConfirmRangeDelete] = useState(false);

  const load = async () => {
    const estabId = await getEstabelecimentoId();
    if (!estabId) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("contagens")
      .select("*")
      .eq("estabelecimento_id", estabId)
      .order("created_at", { ascending: false });

    setContagens(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from("contagens").delete().eq("id", deleteId);
      if (error) throw error;
      setContagens(prev => prev.filter(c => c.id !== deleteId));
      toast.success("Contagem excluída");
    } catch {
      toast.error("Erro ao excluir contagem");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const rangeCount = dateFrom && dateTo
    ? contagens.filter(c => {
        const d = new Date(c.created_at);
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        return d >= from && d <= to;
      }).length
    : 0;

  const handleDeleteRange = async () => {
    if (!dateFrom || !dateTo) return;
    setDeletingRange(true);
    try {
      const estabId = await getEstabelecimentoId();
      if (!estabId) throw new Error("Estabelecimento não encontrado");
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);

      const { error } = await supabase
        .from("contagens")
        .delete()
        .eq("estabelecimento_id", estabId)
        .gte("created_at", from.toISOString())
        .lte("created_at", to.toISOString());

      if (error) throw error;
      toast.success(`${rangeCount} contagem(ns) excluída(s)`);
      setShowDateDelete(false);
      setConfirmRangeDelete(false);
      setDateFrom(undefined);
      setDateTo(undefined);
      await load();
    } catch {
      toast.error("Erro ao excluir contagens");
    } finally {
      setDeletingRange(false);
    }
  };

  const handleEditOriginal = (contagem: any) => {
    if (!contagem.imagem_url) {
      toast.error("Imagem original não disponível");
      return;
    }

    navigate("/contagem/nova", {
      state: {
        editFrom: contagem.id,
        imageUrl: contagem.imagem_url,
        descricao: contagem.tipo_objeto,
        quantidadeEsperada: contagem.quantidade_esperada,
        observacoes: contagem.observacoes,
      },
    });
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contagem Inteligente</h1>
          <p className="text-muted-foreground text-sm">Contagem automática de volumes por IA</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setShowDateDelete(!showDateDelete); setConfirmRangeDelete(false); }} className="gap-1 text-destructive hover:text-destructive">
            <Trash2 className="w-4 h-4" /> Por Data
          </Button>
          <Button onClick={() => navigate("/contagem/nova")} className="gap-2">
            <Camera className="w-4 h-4" /> Nova Contagem
          </Button>
        </div>
      </div>

      {showDateDelete && (
        <Card className="border-destructive/30">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-medium">Excluir contagens por faixa de data</p>
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Data início</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Data fim</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                      <CalendarIcon className="w-4 h-4 mr-1" />
                      {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} locale={ptBR} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              {dateFrom && dateTo && (
                <p className="text-sm"><span className="font-bold text-destructive">{rangeCount}</span> contagem(ns) encontrada(s)</p>
              )}
            </div>
            {!confirmRangeDelete ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowDateDelete(false)}>Cancelar</Button>
                <Button variant="destructive" size="sm" disabled={!dateFrom || !dateTo || rangeCount === 0} onClick={() => setConfirmRangeDelete(true)}>
                  Excluir {rangeCount} contagem(ns)
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                <p className="text-sm flex-1">Confirma exclusão de <strong>{rangeCount}</strong> contagem(ns)?</p>
                <Button variant="outline" size="sm" onClick={() => setConfirmRangeDelete(false)} disabled={deletingRange}>Não</Button>
                <Button variant="destructive" size="sm" onClick={handleDeleteRange} disabled={deletingRange}>
                  {deletingRange ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sim, excluir"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : contagens.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhuma contagem realizada</p>
            <Button onClick={() => navigate("/contagem/nova")} className="mt-4 gap-2">
              <Camera className="w-4 h-4" /> Iniciar Primeira Contagem
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contagens.map((c: any) => (
            <Card key={c.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-3 sm:p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {c.imagem_url && (
                    <img
                      src={c.imagem_url}
                      alt="Contagem"
                      className="w-14 h-14 rounded-lg object-cover shrink-0 hidden sm:block"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {c.tipo_objeto || "Contagem"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </p>
                    {c.observacoes && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{c.observacoes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">{c.quantidade_detectada ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">detectados</p>
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleEditOriginal(c)}
                    disabled={!c.imagem_url}
                  >
                    <Crop className="w-4 h-4" /> Editar original
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigate(`/contagem/resultado/${c.id}`)}
                    title="Ver resultado"
                    aria-label="Ver resultado"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(c.id)}
                    title="Excluir contagem"
                    aria-label="Excluir contagem"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir contagem"
        description="Tem certeza que deseja excluir esta contagem? Esta ação não pode ser desfeita."
        isLoading={deleting}
      />
    </div>
  );
};

export default ContagemDashboard;
