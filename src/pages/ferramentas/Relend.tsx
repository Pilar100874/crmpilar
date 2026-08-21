import { useState, useEffect } from "react";
import { MainLayout } from "@/components/ferramentas/layout/MainLayout";
import { PageHeader } from "@/components/ferramentas/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/ferramentas/useAuth";
import { supabase, Profile, Tool, Loan, Kit } from "@/lib/ferramentas/supabase";
import { EmptyState } from "@/components/ferramentas/ui/empty-state";
import { QRScanner } from "@/components/ferramentas/QRScanner";
import {
  User,
  Wrench,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CircleDot,
  Lock,
  Camera,
  QrCode,
  Search,
  RefreshCw,
  Ban,
  Package,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STEPS = [
  { id: 1, title: "Usuário", description: "Selecionar usuário" },
  { id: 2, title: "Ferramentas", description: "Escolher itens" },
  { id: 3, title: "Confirmar", description: "Autenticação" },
];

interface LoanWithTool extends Loan {
  tools?: Tool & { allow_relend?: boolean };
}

export default function RelendPage() {
  const { profile: currentUser, isAdmin, isAlmoxarifado } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Users with active loans
  const [usersWithLoans, setUsersWithLoans] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // User's active loans
  const [userLoans, setUserLoans] = useState<LoanWithTool[]>([]);
  const [selectedLoans, setSelectedLoans] = useState<Set<string>>(new Set());
  const [kits, setKits] = useState<Kit[]>([]);
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());
  const [kitTools, setKitTools] = useState<{ kit_id: string; tool_id: string }[]>([]);
  const [toolsWithIssues, setToolsWithIssues] = useState<Set<string>>(new Set());
  // New borrower
  const [newBorrowerSearch, setNewBorrowerSearch] = useState("");
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [newBorrower, setNewBorrower] = useState<Profile | null>(null);

  // Authentication state
  const [authMode, setAuthMode] = useState<"qr" | "password">("qr");
  const [authQrCode, setAuthQrCode] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAuthScanner, setShowAuthScanner] = useState(false);

  const canAccess = isAdmin || isAlmoxarifado;

  useEffect(() => {
    if (canAccess) {
      fetchUsersWithLoans();
      fetchAllUsers();
      fetchKitTools();
      fetchKits();
      fetchToolsWithIssues();
    }
  }, [canAccess]);

  const fetchKitTools = async () => {
    const { data } = await supabase.from("ferr_kit_tools").select("kit_id, tool_id");
    setKitTools(data || []);
  };

  const fetchKits = async () => {
    const { data } = await supabase.from("ferr_kits").select("*").eq("is_active", true);
    setKits((data as Kit[]) || []);
  };

  const fetchToolsWithIssues = async () => {
    const { data } = await supabase
      .from("ferr_return_issues")
      .select("tool_id")
      .eq("status", "pendente");
    const issueToolIds = new Set((data || []).map((item: any) => item.tool_id));
    setToolsWithIssues(issueToolIds);
  };

  const fetchUsersWithLoans = async () => {
    setIsLoading(true);
    try {
      const { data: loans } = await supabase
        .from("ferr_loans")
        .select("user_id")
        .in("status", ["ativo", "renovacao_solicitada"]);

      if (loans && loans.length > 0) {
        const userIds = [...new Set(loans.map((l) => l.user_id))];
        const { data: users } = await supabase
          .from("ferr_profiles")
          .select("*")
          .in("id", userIds)
          .order("full_name");

        setUsersWithLoans((users as Profile[]) || []);
      } else {
        setUsersWithLoans([]);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    const { data } = await supabase.from("ferr_profiles").select("*").order("full_name");
    setAllUsers((data as Profile[]) || []);
  };

  const fetchUserLoans = async (userId: string) => {
    const { data } = await supabase
      .from("ferr_loans")
      .select("*, tools(*)")
      .eq("user_id", userId)
      .in("status", ["ativo", "renovacao_solicitada"])
      .order("due_date", { ascending: true });

    setUserLoans((data as LoanWithTool[]) || []);
  };

  const resetFlow = () => {
    setCurrentStep(1);
    setSelectedUser(null);
    setUserLoans([]);
    setSelectedLoans(new Set());
    setExpandedKits(new Set());
    setNewBorrower(null);
    setNewBorrowerSearch("");
    setAuthQrCode("");
    setUserPassword("");
    setAuthMode("qr");
  };

  const handleSelectUser = async (user: Profile) => {
    setSelectedUser(user);
    await fetchUserLoans(user.id);
    setCurrentStep(2);
  };

  const toggleLoan = (loanId: string, canRelend: boolean, toolId: string) => {
    if (!canRelend) return;
    if (toolsWithIssues.has(toolId)) return; // Ferramenta com ocorrência pendente

    setSelectedLoans((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(loanId)) {
        newSet.delete(loanId);
      } else {
        newSet.add(loanId);
      }
      return newSet;
    });
  };

  // Toggle all kit loans together
  const toggleKit = (kitId: string) => {
    const kitToolIds = kitTools
      .filter(kt => kt.kit_id === kitId)
      .map(kt => kt.tool_id);
    
    // Só permite selecionar se allow_relend != false E não tem ocorrência pendente
    const kitLoansList = userLoans.filter(l => 
      kitToolIds.includes(l.tool_id) && 
      l.tools?.allow_relend !== false && 
      !toolsWithIssues.has(l.tool_id)
    );

    if (kitLoansList.length === 0) return;

    const allSelected = kitLoansList.every(l => selectedLoans.has(l.id));

    setSelectedLoans(prev => {
      const newSet = new Set(prev);
      kitLoansList.forEach(l => {
        if (allSelected) {
          newSet.delete(l.id);
        } else {
          newSet.add(l.id);
        }
      });
      return newSet;
    });
  };

  // Organize loans into kits and individual tools
  const organizedLoans = (() => {
    const kitLoansMap = new Map<string, LoanWithTool[]>();
    const individualLoans: LoanWithTool[] = [];

    userLoans.forEach(loan => {
      const kitToolEntry = kitTools.find(kt => kt.tool_id === loan.tool_id);
      if (kitToolEntry) {
        const existing = kitLoansMap.get(kitToolEntry.kit_id) || [];
        existing.push(loan);
        kitLoansMap.set(kitToolEntry.kit_id, existing);
      } else {
        individualLoans.push(loan);
      }
    });

    // Build kit groups with kit info
    const kitGroups = Array.from(kitLoansMap.entries()).map(([kitId, loans]) => {
      const kit = kits.find(k => k.id === kitId);
      return {
        kitId,
        kitName: kit?.name || "Kit",
        loans,
        allCanRelend: loans.every(l => l.tools?.allow_relend !== false && !toolsWithIssues.has(l.tool_id)),
        someCannotRelend: loans.some(l => l.tools?.allow_relend === false || toolsWithIssues.has(l.tool_id)),
        someHasIssue: loans.some(l => toolsWithIssues.has(l.tool_id)),
      };
    });

    return { kitGroups, individualLoans };
  })();

  const filteredUsersWithLoans = usersWithLoans.filter(
    (user) =>
      user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredNewBorrowers = allUsers.filter(
    (user) =>
      user.id !== selectedUser?.id &&
      (user.full_name.toLowerCase().includes(newBorrowerSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(newBorrowerSearch.toLowerCase()))
  );

  const verifyUserByQR = async (): Promise<boolean> => {
    if (!newBorrower) return false;

    const { data: users } = await supabase
      .from("ferr_profiles")
      .select("*")
      .eq("qr_code", authQrCode)
      .maybeSingle();

    if (!users) {
      toast({ variant: "destructive", title: "QR Code não encontrado" });
      return false;
    }

    if ((users as Profile).id !== newBorrower.id) {
      toast({
        variant: "destructive",
        title: "QR Code não pertence ao usuário que vai receber as ferramentas",
      });
      return false;
    }

    return true;
  };

  const verifyUserByPassword = async (): Promise<boolean> => {
    if (!newBorrower || !userPassword) return false;

    setIsVerifying(true);
    try {
      const response = await supabase.functions.invoke("verify-user-password", {
        body: {
          user_id: newBorrower.id,
          password: userPassword,
          allow_admin_override: true,
        },
      });

      if (response.error) {
        toast({ variant: "destructive", title: "Erro ao verificar senha" });
        return false;
      }

      if (!response.data?.valid) {
        toast({ variant: "destructive", title: response.data?.error || "Senha incorreta" });
        return false;
      }

      if (response.data?.verified_by === "admin") {
        toast({ title: "Verificado com senha de administrador" });
      }

      return true;
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro ao verificar senha" });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser || !newBorrower || selectedLoans.size === 0) {
      toast({ variant: "destructive", title: "Preencha todos os campos" });
      return;
    }

    // Verify original user identity
    const isVerified =
      authMode === "qr" ? await verifyUserByQR() : await verifyUserByPassword();

    if (!isVerified) return;

    setIsSubmitting(true);
    try {
      const selectedLoansList = userLoans.filter((l) => selectedLoans.has(l.id));
      const selectedLoanIds = selectedLoansList.map((l) => l.id);

      // Mark original loans as returned
      const returnPromises = selectedLoansList.map((loan) =>
        supabase
          .from("ferr_loans")
          .update({
            status: "devolvido",
            return_date: new Date().toISOString(),
            returned_by: currentUser?.id,
            notes: `${loan.notes || ""} [Reemprestado para ${newBorrower.full_name}]`.trim(),
          })
          .eq("id", loan.id)
      );

      // Create new loans for the new borrower
      const newLoans = selectedLoansList.map((loan) => ({
        tool_id: loan.tool_id,
        user_id: newBorrower.id,
        warehouse_id: loan.warehouse_id,
        registered_by: currentUser?.id,
        due_date: loan.due_date,
        notes: `Reempréstimo de ${selectedUser.full_name}`,
        status: "ativo" as const,
      }));

      // Execute all operations in parallel: delete renewals, update loans, insert new loans
      const [, , insertResult] = await Promise.all([
        // Delete pending renewal requests (non-blocking)
        supabase
          .from("ferr_loan_renewals")
          .delete()
          .in("loan_id", selectedLoanIds)
          .eq("status", "pendente"),
        // Update original loans
        Promise.all(returnPromises),
        // Insert new loans
        supabase.from("ferr_loans").insert(newLoans),
      ]);

      if (insertResult.error) throw insertResult.error;

      toast({
        title: "Reempréstimo realizado!",
        description: `${selectedLoansList.length} ferramenta(s) transferida(s) para ${newBorrower.full_name}`,
      });

      resetFlow();
      fetchUsersWithLoans();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedLoansList = userLoans.filter((l) => selectedLoans.has(l.id));
  const canSubmitAuth = authMode === "qr" ? authQrCode.length > 0 : userPassword.length >= 6;

  if (!canAccess) {
    return (
      <MainLayout>
        <EmptyState
          icon={RefreshCw}
          title="Acesso Restrito"
          description="Apenas administradores e almoxarifados podem realizar reempréstimos"
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Reempréstimo"
        description="Transfira ferramentas entre usuários"
      />

      {/* Stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    currentStep > step.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : currentStep === step.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-4 w-4" />
                  ) : currentStep === step.id ? (
                    <CircleDot className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <div className="mt-1 text-center hidden sm:block">
                  <p
                    className={`text-xs font-medium ${
                      currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    currentStep > step.id ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Selecionar Usuário */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar usuário com empréstimos ativos..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : filteredUsersWithLoans.length === 0 ? (
            <EmptyState
              icon={User}
              title="Nenhum usuário encontrado"
              description="Não há usuários com empréstimos ativos no momento"
            />
          ) : (
            <div className="space-y-2">
              {filteredUsersWithLoans.map((user) => (
                <Card
                  key={user.id}
                  className="cursor-pointer transition-colors hover:bg-accent/50"
                  onClick={() => handleSelectUser(user)}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold uppercase text-primary">
                      {user.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Selecionar Ferramentas */}
      {currentStep === 2 && selectedUser && (
        <div className="space-y-4">
          {/* User Info */}
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold uppercase text-primary">
                {selectedUser.full_name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{selectedUser.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {userLoans.length} ferramenta(s) emprestada(s)
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={resetFlow}>
                Trocar
              </Button>
            </CardContent>
          </Card>

          {/* Tools Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Selecione as ferramentas para reempréstimo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {/* Kits section */}
                {organizedLoans.kitGroups.map(({ kitId, kitName, loans, allCanRelend, someCannotRelend, someHasIssue }) => {
                  const isExpanded = expandedKits.has(kitId);
                  const allSelected = loans.filter(l => l.tools?.allow_relend !== false && !toolsWithIssues.has(l.tool_id)).every(l => selectedLoans.has(l.id));
                  const someSelected = loans.some(l => selectedLoans.has(l.id));

                  return (
                    <div key={kitId} className="rounded-lg border overflow-hidden">
                      <div
                        className={`flex items-center gap-3 p-3 transition-colors ${
                          !allCanRelend && someCannotRelend
                            ? "bg-amber-500/5"
                            : allSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox
                          checked={allSelected}
                          disabled={!allCanRelend}
                          onCheckedChange={() => toggleKit(kitId)}
                          className={someSelected && !allSelected ? "data-[state=checked]:bg-primary/50" : ""}
                        />
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="h-4 w-4" />
                        </div>
                        <div 
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => toggleKit(kitId)}
                        >
                          <p className="font-medium truncate">{kitName}</p>
                          <p className="text-xs text-muted-foreground">
                            {loans.length} ferramenta(s)
                            {someHasIssue && <span className="text-red-500 ml-1">(possui ocorrência)</span>}
                          </p>
                        </div>
                        <Collapsible open={isExpanded} onOpenChange={(open) => {
                          setExpandedKits(prev => {
                            const newSet = new Set(prev);
                            if (open) newSet.add(kitId);
                            else newSet.delete(kitId);
                            return newSet;
                          });
                        }}>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm">
                              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </Button>
                          </CollapsibleTrigger>
                        </Collapsible>
                      </div>
                      
                      <Collapsible open={isExpanded}>
                        <CollapsibleContent>
                          <div className="border-t bg-muted/30 p-2 space-y-1">
                            {loans.map(loan => {
                              const hasIssue = toolsWithIssues.has(loan.tool_id);
                              const canRelend = loan.tools?.allow_relend !== false && !hasIssue;
                              return (
                                <div key={loan.id} className="flex items-center gap-2 px-2 py-1 text-sm">
                                  {canRelend ? (
                                    <Wrench className="h-3 w-3 text-muted-foreground" />
                                  ) : (
                                    <Ban className="h-3 w-3 text-red-500" />
                                  )}
                                  <span className={!canRelend ? "text-red-600" : ""}>{loan.tools?.name}</span>
                                  {hasIssue && (
                                    <Badge variant="destructive" className="text-[10px] px-1 py-0">Ocorrência</Badge>
                                  )}
                                  {!hasIssue && loan.tools?.allow_relend === false && (
                                    <Badge variant="destructive" className="text-[10px] px-1 py-0">Bloqueada</Badge>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  );
                })}

                {/* Individual tools section */}
                {organizedLoans.individualLoans.map((loan) => {
                  const hasIssue = toolsWithIssues.has(loan.tool_id);
                  const canRelend = loan.tools?.allow_relend !== false && !hasIssue;
                  const isSelected = selectedLoans.has(loan.id);

                  return (
                    <div
                      key={loan.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                        !canRelend
                          ? "cursor-not-allowed border-red-500/30 bg-red-500/5 opacity-70"
                          : isSelected
                          ? "cursor-pointer border-primary bg-primary/5"
                          : "cursor-pointer hover:bg-muted/50"
                      }`}
                      onClick={() => toggleLoan(loan.id, canRelend, loan.tool_id)}
                    >
                      <Checkbox
                        checked={isSelected}
                        disabled={!canRelend}
                        onCheckedChange={() => toggleLoan(loan.id, canRelend, loan.tool_id)}
                      />
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                          !canRelend
                            ? "bg-red-500/20 text-red-600"
                            : "bg-muted"
                        }`}
                      >
                        {!canRelend ? (
                          <Ban className="h-4 w-4" />
                        ) : (
                          <Wrench className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{loan.tools?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Devolução: {format(new Date(loan.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                        {hasIssue && (
                          <p className="text-xs text-red-600 mt-1">
                            Esta ferramenta possui ocorrência pendente
                          </p>
                        )}
                        {!hasIssue && loan.tools?.allow_relend === false && (
                          <p className="text-xs text-red-600 mt-1">
                            Esta ferramenta não permite reempréstimo
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                {userLoans.length === 0 && (
                  <EmptyState
                    icon={Wrench}
                    title="Nenhum empréstimo ativo"
                    description="Este usuário não possui ferramentas emprestadas"
                  />
                )}
              </div>

              {/* New Borrower Selection */}
              {selectedLoans.size > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <Label>Novo responsável</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      className="pl-10"
                      value={newBorrowerSearch}
                      onChange={(e) => setNewBorrowerSearch(e.target.value)}
                    />
                  </div>

                  {newBorrower ? (
                    <div className="flex items-center gap-3 rounded-lg border border-primary bg-primary/5 p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold uppercase text-primary">
                        {newBorrower.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{newBorrower.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {newBorrower.email}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNewBorrower(null)}
                      >
                        Trocar
                      </Button>
                    </div>
                  ) : newBorrowerSearch.length >= 2 ? (
                    <ScrollArea className="h-40 rounded-lg border">
                      {filteredNewBorrowers.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          Nenhum usuário encontrado
                        </div>
                      ) : (
                        <div className="p-2">
                          {filteredNewBorrowers.slice(0, 5).map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setNewBorrower(user);
                                setNewBorrowerSearch("");
                              }}
                              className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted"
                            >
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold uppercase">
                                {user.full_name.charAt(0)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {user.full_name}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {user.email}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      Digite ao menos 2 caracteres para buscar
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={resetFlow}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => setCurrentStep(3)}
                  disabled={selectedLoans.size === 0 || !newBorrower}
                >
                  Continuar ({selectedLoans.size})
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Autenticação */}
      {currentStep === 3 && selectedUser && newBorrower && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Confirmar Reempréstimo</CardTitle>
              <p className="text-sm text-muted-foreground">
                O novo destinatário deve confirmar o recebimento das ferramentas
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Transfer Summary */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-red-500/5 p-3">
                  <p className="text-xs text-muted-foreground">De</p>
                  <p className="font-semibold">{selectedUser.full_name}</p>
                </div>
                <div className="rounded-lg border bg-green-500/5 p-3">
                  <p className="text-xs text-muted-foreground">Para</p>
                  <p className="font-semibold">{newBorrower.full_name}</p>
                </div>
              </div>

              {/* Tools */}
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  Ferramentas ({selectedLoansList.length})
                </p>
                <div className="space-y-1">
                  {selectedLoansList.map((loan) => (
                    <div key={loan.id} className="flex items-center gap-2">
                      <RefreshCw className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{loan.tools?.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Tabs
                value={authMode}
                onValueChange={(v) => {
                  setAuthMode(v as "qr" | "password");
                  setAuthQrCode("");
                  setUserPassword("");
                }}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="qr">
                    <QrCode className="mr-2 h-4 w-4" />
                    QR Code
                  </TabsTrigger>
                  <TabsTrigger value="password">
                    <Lock className="mr-2 h-4 w-4" />
                    Senha
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="qr" className="space-y-4 pt-4">
                  <div className="space-y-3">
                    <Label>Escaneie o QR Code de {newBorrower.full_name}</Label>
                    <Input
                      placeholder="Digite o código manualmente"
                      value={authQrCode}
                      onChange={(e) => setAuthQrCode(e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowAuthScanner(true)}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Abrir câmera
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="password" className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Senha do novo destinatário ou administrador</Label>
                    <Input
                      type="password"
                      placeholder="Digite a senha"
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground">
                      Use a senha de {newBorrower.full_name} ou de qualquer administrador
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={isSubmitting || isVerifying || !canSubmitAuth}
            >
              {isVerifying
                ? "Verificando..."
                : isSubmitting
                ? "Processando..."
                : "Confirmar Reempréstimo"}
              <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* QR Scanner Modal */}
      {showAuthScanner && (
        <QRScanner
          onScan={(result) => setAuthQrCode(result)}
          onClose={() => setShowAuthScanner(false)}
        />
      )}
    </MainLayout>
  );
}
