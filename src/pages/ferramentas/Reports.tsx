import { useEffect, useState } from "react";
import { MainLayout } from "@/components/ferramentas/layout/MainLayout";
import { PageHeader } from "@/components/ferramentas/ui/page-header";
import { EmptyState } from "@/components/ferramentas/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/ferramentas/useAuth";
import { supabase, Tool, Loan, Profile, Warehouse } from "@/lib/ferramentas/supabase";
import { ImageZoom } from "@/components/ferramentas/ui/image-zoom";
import { FileText, Wrench, Package, AlertTriangle, Camera, Calendar, User, Image, ArrowLeft, Filter, Download } from "lucide-react";
import { exportToPdf, exportToolsPdfWithPhotos } from "@/lib/ferramentas/exportPdf";
import { format, isPast, isWithinInterval, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoanWithDetails extends Loan {
  tools?: Tool;
  profiles?: Profile;
  warehouses?: Warehouse;
  returned_by_profile?: Profile;
}

type ReportType = "tools" | "active-loans" | "overdue-loans" | "photo-history" | null;

export default function ReportsPage() {
  const { isAdmin, isAlmoxarifado } = useAuth();
  const [reportType, setReportType] = useState<ReportType>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [loans, setLoans] = useState<LoanWithDetails[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPhotoPdf, setIsExportingPhotoPdf] = useState(false);

  // Filtros para Ferramentas
  const [toolNameFilter, setToolNameFilter] = useState("");
  const [toolTypeFilter, setToolTypeFilter] = useState<string>("all");
  const [toolWarehouseFilter, setToolWarehouseFilter] = useState<string>("all");
  const [toolStatusFilter, setToolStatusFilter] = useState<string>("all");
  const [toolShowPhoto, setToolShowPhoto] = useState<boolean>(false);
  // Filtros para Empréstimos Ativos
  const [activeLoanUserFilter, setActiveLoanUserFilter] = useState("");
  const [activeLoanWarehouseFilter, setActiveLoanWarehouseFilter] = useState<string>("all");
  const [activeLoanDateFrom, setActiveLoanDateFrom] = useState("");
  const [activeLoanDateTo, setActiveLoanDateTo] = useState("");

  // Filtros para Empréstimos Vencidos
  const [overdueLoanUserFilter, setOverdueLoanUserFilter] = useState("");
  const [overdueLoanWarehouseFilter, setOverdueLoanWarehouseFilter] = useState<string>("all");

  // Filtros para Histórico de Fotos
  const [photoHistoryToolFilter, setPhotoHistoryToolFilter] = useState<string>("all");
  const [photoHistoryUserFilter, setPhotoHistoryUserFilter] = useState("");
  const [photoHistoryDateFrom, setPhotoHistoryDateFrom] = useState("");
  const [photoHistoryDateTo, setPhotoHistoryDateTo] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [toolsRes, loansRes, warehousesRes] = await Promise.all([
        supabase.from("ferr_tools").select("*").order("name"),
        supabase
          .from("ferr_loans")
          .select("*, tools:ferr_tools(*), profiles:ferr_profiles!ferr_loans_user_id_fkey(*), warehouses:ferr_warehouses(*)")
          .order("created_at", { ascending: false }),
        supabase.from("ferr_warehouses").select("*").order("name"),
      ]);

      setTools((toolsRes.data as Tool[]) || []);
      setLoans((loansRes.data as LoanWithDetails[]) || []);
      setWarehouses((warehousesRes.data as Warehouse[]) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const canView = isAdmin || isAlmoxarifado;

  if (!canView) {
    return (
      <MainLayout>
        <EmptyState
          icon={FileText}
          title="Acesso Restrito"
          description="Apenas administradores e almoxarifados podem ver relatórios"
        />
      </MainLayout>
    );
  }

  const activeLoans = loans.filter((l) => l.status === "ativo");
  const overdueLoans = activeLoans.filter((l) => isPast(new Date(l.due_date)));
  
  // Ferramentas que exigem foto
  const toolsRequiringPhoto = tools.filter((t) => t.requires_return_photo);
  
  // Empréstimos devolvidos de ferramentas que exigem foto
  const photoHistoryLoans = loans.filter((loan) => {
    const tool = loan.tools;
    return tool?.requires_return_photo && loan.status === "devolvido";
  });

  // Aplicar filtros de ferramentas
  const filteredTools = tools.filter((tool) => {
    if (toolNameFilter && !tool.name.toLowerCase().includes(toolNameFilter.toLowerCase())) return false;
    if (toolTypeFilter !== "all" && tool.type !== toolTypeFilter) return false;
    if (toolWarehouseFilter !== "all" && tool.warehouse_id !== toolWarehouseFilter) return false;
    if (toolStatusFilter === "available" && tool.is_maintenance) return false;
    if (toolStatusFilter === "maintenance" && !tool.is_maintenance) return false;
    return true;
  });

  // Aplicar filtros de empréstimos ativos
  const filteredActiveLoans = activeLoans.filter((loan) => {
    if (activeLoanUserFilter && !loan.profiles?.full_name?.toLowerCase().includes(activeLoanUserFilter.toLowerCase())) return false;
    if (activeLoanWarehouseFilter !== "all" && loan.warehouse_id !== activeLoanWarehouseFilter) return false;
    if (activeLoanDateFrom) {
      const fromDate = startOfDay(parseISO(activeLoanDateFrom));
      if (new Date(loan.loan_date) < fromDate) return false;
    }
    if (activeLoanDateTo) {
      const toDate = endOfDay(parseISO(activeLoanDateTo));
      if (new Date(loan.loan_date) > toDate) return false;
    }
    return true;
  });

  // Aplicar filtros de empréstimos vencidos
  const filteredOverdueLoans = overdueLoans.filter((loan) => {
    if (overdueLoanUserFilter && !loan.profiles?.full_name?.toLowerCase().includes(overdueLoanUserFilter.toLowerCase())) return false;
    if (overdueLoanWarehouseFilter !== "all" && loan.warehouse_id !== overdueLoanWarehouseFilter) return false;
    return true;
  });

  // Aplicar filtros de histórico de fotos
  const filteredPhotoHistoryLoans = photoHistoryLoans.filter((loan) => {
    if (photoHistoryToolFilter !== "all" && loan.tool_id !== photoHistoryToolFilter) return false;
    if (photoHistoryUserFilter && !loan.profiles?.full_name?.toLowerCase().includes(photoHistoryUserFilter.toLowerCase())) return false;
    if (photoHistoryDateFrom && loan.return_date) {
      const fromDate = startOfDay(parseISO(photoHistoryDateFrom));
      if (new Date(loan.return_date) < fromDate) return false;
    }
    if (photoHistoryDateTo && loan.return_date) {
      const toDate = endOfDay(parseISO(photoHistoryDateTo));
      if (new Date(loan.return_date) > toDate) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setToolNameFilter("");
    setToolTypeFilter("all");
    setToolWarehouseFilter("all");
    setToolStatusFilter("all");
    setActiveLoanUserFilter("");
    setActiveLoanWarehouseFilter("all");
    setActiveLoanDateFrom("");
    setActiveLoanDateTo("");
    setOverdueLoanUserFilter("");
    setOverdueLoanWarehouseFilter("all");
    setPhotoHistoryToolFilter("all");
    setPhotoHistoryUserFilter("");
    setPhotoHistoryDateFrom("");
    setPhotoHistoryDateTo("");
  };

  const handleExportPdf = () => {
    switch (reportType) {
      case "tools":
        exportToPdf({
          title: "Relatório de Ferramentas Cadastradas",
          headers: ["Nome", "Tipo", "Almoxarifado", "Status", "Data Compra", "Valor"],
          rows: filteredTools.map((tool) => [
            tool.name,
            tool.type,
            warehouses.find((w) => w.id === tool.warehouse_id)?.name || "-",
            tool.is_maintenance ? "Manutenção" : "Disponível",
            tool.purchase_date
              ? format(new Date(tool.purchase_date), "dd/MM/yyyy", { locale: ptBR })
              : "-",
            tool.purchase_value ? `R$ ${tool.purchase_value.toFixed(2)}` : "-",
          ]),
          filename: "ferramentas",
          orientation: "landscape",
        });
        break;

      case "active-loans":
        exportToPdf({
          title: "Relatório de Empréstimos Ativos",
          headers: ["Ferramenta", "Usuário", "Almoxarifado", "Data Empréstimo", "Devolução Prevista", "Status"],
          rows: filteredActiveLoans.map((loan) => [
            loan.tools?.name || "-",
            loan.profiles?.full_name || "-",
            loan.warehouses?.name || "-",
            format(new Date(loan.loan_date), "dd/MM/yyyy", { locale: ptBR }),
            format(new Date(loan.due_date), "dd/MM/yyyy", { locale: ptBR }),
            isPast(new Date(loan.due_date)) ? "Vencido" : "No prazo",
          ]),
          filename: "emprestimos-ativos",
          orientation: "landscape",
        });
        break;

      case "overdue-loans":
        exportToPdf({
          title: "Relatório de Empréstimos Vencidos",
          headers: ["Ferramenta", "Usuário", "Telefone", "Data Prevista", "Dias Atrasado"],
          rows: filteredOverdueLoans.map((loan) => {
            const daysOverdue = Math.floor(
              (Date.now() - new Date(loan.due_date).getTime()) / (1000 * 60 * 60 * 24)
            );
            return [
              loan.tools?.name || "-",
              loan.profiles?.full_name || "-",
              loan.profiles?.phone || "-",
              format(new Date(loan.due_date), "dd/MM/yyyy", { locale: ptBR }),
              `${daysOverdue} dia(s)`,
            ];
          }),
          filename: "emprestimos-vencidos",
        });
        break;

      case "photo-history":
        exportToPdf({
          title: "Relatório de Histórico de Fotos",
          headers: ["Ferramenta", "Usuário", "Data Empréstimo", "Data Devolução", "Observações"],
          rows: filteredPhotoHistoryLoans.map((loan) => [
            loan.tools?.name || "-",
            loan.profiles?.full_name || "-",
            format(new Date(loan.loan_date), "dd/MM/yyyy", { locale: ptBR }),
            loan.return_date
              ? format(new Date(loan.return_date), "dd/MM/yyyy", { locale: ptBR })
              : "-",
            loan.notes || "-",
          ]),
          filename: "historico-fotos",
          orientation: "landscape",
        });
        break;
    }
  };

  const renderReportButtons = () => (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Button
        variant="outline"
        className="h-auto flex-col gap-3 p-6 hover:bg-primary/5 hover:border-primary"
        onClick={() => setReportType("tools")}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Wrench className="h-6 w-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="font-semibold">Ferramentas Cadastradas</p>
          <p className="text-sm text-muted-foreground">{tools.length} ferramentas</p>
        </div>
      </Button>

      <Button
        variant="outline"
        className="h-auto flex-col gap-3 p-6 hover:bg-info/5 hover:border-info"
        onClick={() => setReportType("active-loans")}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10">
          <Package className="h-6 w-6 text-info" />
        </div>
        <div className="text-center">
          <p className="font-semibold">Empréstimos Ativos</p>
          <p className="text-sm text-muted-foreground">{activeLoans.length} empréstimos</p>
        </div>
      </Button>

      <Button
        variant="outline"
        className="h-auto flex-col gap-3 p-6 hover:bg-destructive/5 hover:border-destructive"
        onClick={() => setReportType("overdue-loans")}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <div className="text-center">
          <p className="font-semibold">Empréstimos Vencidos</p>
          <p className="text-sm text-muted-foreground">{overdueLoans.length} vencidos</p>
        </div>
      </Button>

      <Button
        variant="outline"
        className="h-auto flex-col gap-3 p-6 hover:bg-warning/5 hover:border-warning"
        onClick={() => setReportType("photo-history")}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10">
          <Camera className="h-6 w-6 text-warning" />
        </div>
        <div className="text-center">
          <p className="font-semibold">Histórico de Fotos</p>
          <p className="text-sm text-muted-foreground">{toolsRequiringPhoto.length} ferramentas</p>
        </div>
      </Button>
    </div>
  );

  const renderFilters = () => {
    switch (reportType) {
      case "tools":
        return (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Buscar por nome..."
                    value={toolNameFilter}
                    onChange={(e) => setToolNameFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={toolTypeFilter} onValueChange={setToolTypeFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="eletrica">Elétrica</SelectItem>
                      <SelectItem value="pneumatica">Pneumática</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Almoxarifado</Label>
                  <Select value={toolWarehouseFilter} onValueChange={setToolWarehouseFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={toolStatusFilter} onValueChange={setToolStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="available">Disponível</SelectItem>
                      <SelectItem value="maintenance">Manutenção</SelectItem>
                    </SelectContent>
                   </Select>
                </div>
                <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={toolShowPhoto}
                      onChange={(e) => setToolShowPhoto(e.target.checked)}
                      className="rounded border-border"
                    />
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    Exibir foto da ferramenta
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "active-loans":
        return (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Input
                    placeholder="Buscar por nome..."
                    value={activeLoanUserFilter}
                    onChange={(e) => setActiveLoanUserFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Almoxarifado</Label>
                  <Select value={activeLoanWarehouseFilter} onValueChange={setActiveLoanWarehouseFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={activeLoanDateFrom}
                    onChange={(e) => setActiveLoanDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={activeLoanDateTo}
                    onChange={(e) => setActiveLoanDateTo(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "overdue-loans":
        return (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Input
                    placeholder="Buscar por nome..."
                    value={overdueLoanUserFilter}
                    onChange={(e) => setOverdueLoanUserFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Almoxarifado</Label>
                  <Select value={overdueLoanWarehouseFilter} onValueChange={setOverdueLoanWarehouseFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {warehouses.map((w) => (
                        <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        );

      case "photo-history":
        return (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="h-4 w-4" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Ferramenta</Label>
                  <Select value={photoHistoryToolFilter} onValueChange={setPhotoHistoryToolFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {toolsRequiringPhoto.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Usuário</Label>
                  <Input
                    placeholder="Buscar por nome..."
                    value={photoHistoryUserFilter}
                    onChange={(e) => setPhotoHistoryUserFilter(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Inicial</Label>
                  <Input
                    type="date"
                    value={photoHistoryDateFrom}
                    onChange={(e) => setPhotoHistoryDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Final</Label>
                  <Input
                    type="date"
                    value={photoHistoryDateTo}
                    onChange={(e) => setPhotoHistoryDateTo(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const renderReport = () => {
    switch (reportType) {
      case "tools":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Ferramentas Cadastradas ({filteredTools.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {/* Mobile Cards */}
              <div className="space-y-3 p-4 sm:hidden">
                {filteredTools.map((tool) => (
                  <div key={tool.id} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      {toolShowPhoto && (
                        <div className="shrink-0">
                          {tool.photo_url ? (
                            <ImageZoom
                              src={tool.photo_url}
                              alt={tool.name}
                              thumbnailClassName="w-16 h-16 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                              <Image className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate">{tool.name}</span>
                          <Badge variant={tool.is_maintenance ? "warning" : "success"}>
                            {tool.is_maintenance ? "Manutenção" : "Disponível"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm mt-1">
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>{" "}
                            <Badge variant="secondary" className="ml-1">{tool.type}</Badge>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Almox.:</span>{" "}
                            <span>{warehouses.find((w) => w.id === tool.warehouse_id)?.name || "-"}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Compra:</span>{" "}
                            <span>
                              {tool.purchase_date
                                ? format(new Date(tool.purchase_date), "dd/MM/yy", { locale: ptBR })
                                : "-"}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Valor:</span>{" "}
                            <span>{tool.purchase_value ? `R$ ${tool.purchase_value.toFixed(2)}` : "-"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {toolShowPhoto && <TableHead className="w-20">Foto</TableHead>}
                      <TableHead>Nome</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Almoxarifado</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data Compra</TableHead>
                      <TableHead>Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTools.map((tool) => (
                      <TableRow key={tool.id}>
                        {toolShowPhoto && (
                          <TableCell>
                            {tool.photo_url ? (
                              <ImageZoom
                                src={tool.photo_url}
                                alt={tool.name}
                                thumbnailClassName="w-14 h-14 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
                                <Image className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="font-medium">{tool.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{tool.type}</Badge>
                        </TableCell>
                        <TableCell>
                          {warehouses.find((w) => w.id === tool.warehouse_id)?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tool.is_maintenance ? "warning" : "success"}>
                            {tool.is_maintenance ? "Manutenção" : "Disponível"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {tool.purchase_date
                            ? format(new Date(tool.purchase_date), "dd/MM/yyyy", { locale: ptBR })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {tool.purchase_value
                            ? `R$ ${tool.purchase_value.toFixed(2)}`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        );

      case "active-loans":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Empréstimos Ativos ({filteredActiveLoans.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {filteredActiveLoans.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Nenhum empréstimo ativo encontrado
                </p>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="space-y-3 p-4 sm:hidden">
                    {filteredActiveLoans.map((loan) => {
                      const isOverdue = isPast(new Date(loan.due_date));
                      return (
                        <div key={loan.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{loan.tools?.name || "-"}</span>
                            <Badge variant={isOverdue ? "destructive" : "success"}>
                              {isOverdue ? "Vencido" : "No prazo"}
                            </Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{loan.profiles?.full_name || "-"}</span>
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {format(new Date(loan.loan_date), "dd/MM/yy", { locale: ptBR })}
                                {" → "}
                                {format(new Date(loan.due_date), "dd/MM/yy", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="text-muted-foreground">
                              Almox.: {loan.warehouses?.name || "-"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ferramenta</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Almoxarifado</TableHead>
                          <TableHead>Data Empréstimo</TableHead>
                          <TableHead>Devolução Prevista</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredActiveLoans.map((loan) => {
                          const isOverdue = isPast(new Date(loan.due_date));
                          return (
                            <TableRow key={loan.id}>
                              <TableCell className="font-medium">
                                {loan.tools?.name || "-"}
                              </TableCell>
                              <TableCell>{loan.profiles?.full_name || "-"}</TableCell>
                              <TableCell>{loan.warehouses?.name || "-"}</TableCell>
                              <TableCell>
                                {format(new Date(loan.loan_date), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                {format(new Date(loan.due_date), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <Badge variant={isOverdue ? "destructive" : "success"}>
                                  {isOverdue ? "Vencido" : "No prazo"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );

      case "overdue-loans":
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Empréstimos Vencidos ({filteredOverdueLoans.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {filteredOverdueLoans.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Nenhum empréstimo vencido encontrado
                </p>
              ) : (
                <>
                  {/* Mobile Cards */}
                  <div className="space-y-3 p-4 sm:hidden">
                    {filteredOverdueLoans.map((loan) => {
                      const daysOverdue = Math.floor(
                        (Date.now() - new Date(loan.due_date).getTime()) / (1000 * 60 * 60 * 24)
                      );
                      return (
                        <div key={loan.id} className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium truncate">{loan.tools?.name || "-"}</span>
                            <Badge variant="destructive">{daysOverdue} dia(s)</Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                              <span>{loan.profiles?.full_name || "-"}</span>
                            </div>
                            <div className="text-muted-foreground">
                              Tel.: {loan.profiles?.phone || "-"}
                            </div>
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>Previsto: {format(new Date(loan.due_date), "dd/MM/yy", { locale: ptBR })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ferramenta</TableHead>
                          <TableHead>Usuário</TableHead>
                          <TableHead>Telefone</TableHead>
                          <TableHead>Data Prevista</TableHead>
                          <TableHead>Dias Atrasado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOverdueLoans.map((loan) => {
                          const daysOverdue = Math.floor(
                            (Date.now() - new Date(loan.due_date).getTime()) / (1000 * 60 * 60 * 24)
                          );
                          return (
                            <TableRow key={loan.id}>
                              <TableCell className="font-medium">
                                {loan.tools?.name || "-"}
                              </TableCell>
                              <TableCell>{loan.profiles?.full_name || "-"}</TableCell>
                              <TableCell>{loan.profiles?.phone || "-"}</TableCell>
                              <TableCell>
                                {format(new Date(loan.due_date), "dd/MM/yyyy", { locale: ptBR })}
                              </TableCell>
                              <TableCell>
                                <Badge variant="destructive">{daysOverdue} dia(s)</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );

      case "photo-history":
        // Agrupa por ferramenta
        const groupedByTool = toolsRequiringPhoto
          .filter(tool => photoHistoryToolFilter === "all" || tool.id === photoHistoryToolFilter)
          .map((tool) => {
            const toolLoans = filteredPhotoHistoryLoans.filter((l) => l.tool_id === tool.id);
            return { tool, loans: toolLoans };
          })
          .filter(group => group.loans.length > 0 || photoHistoryToolFilter === "all");

        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Histórico de Fotos de Devolução ({filteredPhotoHistoryLoans.length} devoluções)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ferramentas que exigem foto na devolução e seu histórico de uso.
                </p>
              </CardContent>
            </Card>

            {groupedByTool.length === 0 ? (
              <EmptyState
                icon={Camera}
                title="Nenhum resultado encontrado"
                description="Ajuste os filtros para ver mais resultados"
              />
            ) : (
              groupedByTool.map(({ tool, loans: toolLoans }) => (
                <Card key={tool.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-primary" />
                        {tool.name}
                      </div>
                      <Badge variant="outline" className="gap-1">
                        <Camera className="h-3 w-3" />
                        {toolLoans.length} devolução(ões)
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {toolLoans.length === 0 ? (
                      <p className="py-4 text-center text-muted-foreground">
                        Nenhuma devolução registrada ainda
                      </p>
                    ) : (
                      <>
                        {/* Mobile Cards */}
                        <div className="space-y-4 md:hidden">
                          {toolLoans.map((loan) => (
                            <div key={loan.id} className="rounded-lg border p-4">
                              <div className="flex gap-4">
                                {loan.return_photo_url ? (
                                  <div className="shrink-0">
                                    <ImageZoom
                                      src={loan.return_photo_url}
                                      alt="Foto de devolução"
                                      thumbnailClassName="w-20 h-20 rounded-lg object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <Image className="h-8 w-8 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1 text-sm">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium truncate">
                                      {loan.profiles?.full_name || "-"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>
                                      {format(new Date(loan.loan_date), "dd/MM/yy", { locale: ptBR })}
                                      {" → "}
                                      {loan.return_date 
                                        ? format(new Date(loan.return_date), "dd/MM/yy", { locale: ptBR })
                                        : "-"
                                      }
                                    </span>
                                  </div>
                                  {loan.notes && (
                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                      {loan.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Desktop Table */}
                        <Table className="hidden md:table">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-24">Foto</TableHead>
                              <TableHead>Usuário</TableHead>
                              <TableHead>Data Empréstimo</TableHead>
                              <TableHead>Data Devolução</TableHead>
                              <TableHead>Observações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {toolLoans.map((loan) => (
                              <TableRow key={loan.id}>
                                <TableCell>
                                  {loan.return_photo_url ? (
                                    <ImageZoom
                                      src={loan.return_photo_url}
                                      alt="Foto de devolução"
                                      thumbnailClassName="w-16 h-16 rounded-lg object-cover"
                                    />
                                  ) : (
                                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                                      <Image className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {loan.profiles?.full_name || "-"}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(loan.loan_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  {loan.return_date 
                                    ? format(new Date(loan.return_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                                    : "-"
                                  }
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {loan.notes || "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainLayout>
      <PageHeader title="Relatórios" description="Visualize dados do sistema" />

      {reportType === null ? (
        <>
          {isLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          ) : (
            renderReportButtons()
          )}
        </>
      ) : (
        <>
          {/* Back button and filters */}
          <div className="mb-6 flex items-center justify-between gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setReportType(null);
                clearFilters();
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPdf()}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              {reportType === "tools" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setIsExportingPhotoPdf(true);
                    try {
                      await exportToolsPdfWithPhotos(
                        filteredTools.map((tool) => ({
                          name: tool.name,
                          type: tool.type,
                          warehouse: warehouses.find((w) => w.id === tool.warehouse_id)?.name || "-",
                          status: tool.is_maintenance ? "Manutenção" : "Disponível",
                          purchaseDate: tool.purchase_date
                            ? format(new Date(tool.purchase_date), "dd/MM/yyyy", { locale: ptBR })
                            : "-",
                          value: tool.purchase_value ? `R$ ${tool.purchase_value.toFixed(2)}` : "-",
                          photoUrl: tool.photo_url || null,
                        }))
                      );
                    } finally {
                      setIsExportingPhotoPdf(false);
                    }
                  }}
                  disabled={isExportingPhotoPdf}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {isExportingPhotoPdf ? "Gerando..." : "PDF com Foto"}
                </Button>
              )}
            </div>
          </div>

          {renderFilters()}

          {isLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-muted" />
          ) : (
            renderReport()
          )}
        </>
      )}
    </MainLayout>
  );
}
