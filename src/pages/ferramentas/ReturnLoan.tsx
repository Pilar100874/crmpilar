import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase, Profile, Tool, Loan, ReturnIssueType } from "@/lib/supabase";
import { EmptyState } from "@/components/ui/empty-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QRScanner } from "@/components/QRScanner";
import { ReturnIssueDialog } from "@/components/ReturnIssueDialog";
import { ReturnPhotoRecognition } from "@/components/ReturnPhotoRecognition";
import { ReturnPhotoCaptureCard } from "@/components/ReturnPhotoCaptureCard";
import {
  QrCode,
  Scan,
  User,
  Wrench,
  CheckCircle,
  PackageCheck,
  Camera,
  AlertTriangle,
  X,
  Search,
  Lock,
  ArrowLeft,
  ArrowRight,
  Check,
  ImageIcon,
  AlertCircle,
  ClipboardCheck,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LoanWithDetails extends Loan {
  tools?: Tool & { kits?: { name: string } | null };
}

interface PhotoCapture {
  loanId: string;
  toolName: string;
  kitName?: string;
  photo: string | null;
}

interface LoanIssue {
  loanId: string;
  toolId: string;
  toolName: string;
  issueType: ReturnIssueType;
  description: string;
  requiresDiscount: boolean;
}

const STEPS = [
  { id: 1, title: "Usuário", description: "Identifique quem está devolvendo" },
  { id: 2, title: "Ferramentas", description: "Selecione os itens a devolver" },
  { id: 3, title: "Fotos", description: "Registre fotos obrigatórias" },
  { id: 4, title: "Conferência", description: "Verifique as informações" },
  { id: 5, title: "Confirmar", description: "Autenticação do usuário" },
];

export default function ReturnLoanPage() {
  const { profile: currentUser, isAdmin, isAlmoxarifado } = useAuth();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [qrInput, setQrInput] = useState("");
  const [nameSearch, setNameSearch] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [scannedUser, setScannedUser] = useState<Profile | null>(null);
  const [activeLoans, setActiveLoans] = useState<LoanWithDetails[]>([]);
  const [selectedLoanIds, setSelectedLoanIds] = useState<Set<string>>(new Set());
  const [kitTools, setKitTools] = useState<{ kit_id: string; tool_id: string }[]>([]);
  
  // Photos state - one per tool that requires it
  const [photoCaptures, setPhotoCaptures] = useState<PhotoCapture[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  
  // For name search
  const [allUsersWithLoans, setAllUsersWithLoans] = useState<Profile[]>([]);

  // Authentication state
  const [authMode, setAuthMode] = useState<"qr" | "password">("qr");
  const [authQrCode, setAuthQrCode] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  // QR Scanner state
  const [showUserScanner, setShowUserScanner] = useState(false);
  const [showAuthScanner, setShowAuthScanner] = useState(false);

  // Issue reporting state
  const [loanIssues, setLoanIssues] = useState<LoanIssue[]>([]);
  const [issueDialogOpen, setIssueDialogOpen] = useState(false);
  const [selectedLoanForIssue, setSelectedLoanForIssue] = useState<LoanWithDetails | null>(null);

  // Description check state
  const [checkedDescriptions, setCheckedDescriptions] = useState<Set<string>>(new Set());

  // Photo recognition state
  const [showPhotoRecognition, setShowPhotoRecognition] = useState(false);

  const canAccess = isAdmin || isAlmoxarifado;

  useEffect(() => {
    if (canAccess) {
      fetchUsersWithActiveLoans();
      fetchKitTools();
    }
  }, [canAccess]);

  const fetchKitTools = async () => {
    const { data } = await supabase.from("kit_tools").select("kit_id, tool_id");
    setKitTools(data || []);
  };

  const fetchUsersWithActiveLoans = async () => {
    const { data: loans } = await supabase
      .from("loans")
      .select("user_id")
      .in("status", ["ativo", "renovacao_solicitada"]);

    if (loans && loans.length > 0) {
      const userIds = [...new Set(loans.map(l => l.user_id))];
      const { data: users } = await supabase
        .from("profiles")
        .select("*")
        .in("id", userIds)
        .order("full_name");
      
      setAllUsersWithLoans((users as Profile[]) || []);
    } else {
      setAllUsersWithLoans([]);
    }
  };


  const handleScanUser = async (scannedCode?: string) => {
    const codeToSearch = scannedCode || qrInput.trim();
    
    if (!codeToSearch) {
      toast({ variant: "destructive", title: "Digite ou escaneie o QR Code do usuário" });
      return;
    }

    setIsSearching(true);
    try {
      const { data: user, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("qr_code", codeToSearch)
        .maybeSingle();

      if (error || !user) {
        toast({ variant: "destructive", title: "Usuário não encontrado" });
        return;
      }

      await loadUserLoans(user as Profile);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao buscar usuário" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectUserByName = async (user: Profile) => {
    setIsSearching(true);
    try {
      await loadUserLoans(user);
    } finally {
      setIsSearching(false);
    }
  };

  const loadUserLoans = async (user: Profile) => {
    const { data: loans } = await supabase
      .from("loans")
      .select("*, tools(*, kits(name))")
      .eq("user_id", user.id)
      .in("status", ["ativo", "renovacao_solicitada"])
      .order("due_date", { ascending: true });

    if (!loans || loans.length === 0) {
      toast({ title: "Este usuário não possui empréstimos ativos" });
      return;
    }

    setScannedUser(user);
    setActiveLoans(loans as LoanWithDetails[]);
    setSelectedLoanIds(new Set(loans.map(l => l.id))); // Select all by default
    setCurrentStep(2);
    setQrInput("");
    setNameSearch("");
  };

  const toggleLoanSelection = (loanId: string) => {
    const loan = activeLoans.find(l => l.id === loanId);
    if (!loan) return;

    // Verificar se a ferramenta faz parte de um kit
    const kitToolEntry = kitTools.find(kt => kt.tool_id === loan.tool_id);
    
    if (kitToolEntry) {
      // Encontrar todos os empréstimos de ferramentas deste kit
      const kitToolIds = kitTools
        .filter(kt => kt.kit_id === kitToolEntry.kit_id)
        .map(kt => kt.tool_id);
      
      const kitLoanIds = activeLoans
        .filter(l => kitToolIds.includes(l.tool_id))
        .map(l => l.id);

      // Capturar estado atual antes de atualizar
      const isCurrentlySelected = selectedLoanIds.has(loanId);

      setSelectedLoanIds(prev => {
        const newSet = new Set(prev);
        
        // Selecionar ou desmarcar todas as ferramentas do kit juntas
        kitLoanIds.forEach(id => {
          if (isCurrentlySelected) {
            newSet.delete(id);
          } else {
            newSet.add(id);
          }
        });
        
        return newSet;
      });

      // Mostrar toast apenas ao selecionar (não ao desmarcar)
      if (!isCurrentlySelected && kitLoanIds.length > 1) {
        toast({
          title: "Kit selecionado",
          description: "Todas as ferramentas do kit foram selecionadas juntas",
        });
      } else if (isCurrentlySelected && kitLoanIds.length > 1) {
        toast({
          title: "Kit desmarcado",
          description: "Todas as ferramentas do kit foram desmarcadas juntas",
        });
      }
    } else {
      // Ferramenta avulsa - comportamento normal
      setSelectedLoanIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(loanId)) {
          newSet.delete(loanId);
        } else {
          newSet.add(loanId);
        }
        return newSet;
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedLoanIds.size === activeLoans.length) {
      setSelectedLoanIds(new Set());
    } else {
      setSelectedLoanIds(new Set(activeLoans.map(l => l.id)));
    }
  };

  const selectLoansByIds = (loanIds: string[]) => {
    // Expandir para kits completos
    const allLoanIdsToSelect = new Set<string>(loanIds);
    let kitsExpanded = 0;

    for (const loanId of loanIds) {
      const loan = activeLoans.find((l) => l.id === loanId);
      if (!loan) continue;

      // Verificar se a ferramenta pertence a um kit via kit_tools
      const kitToolEntry = kitTools.find((kt) => kt.tool_id === loan.tool_id);
      if (kitToolEntry) {
        // Encontrar todos os empréstimos de ferramentas deste kit
        const kitToolIds = kitTools
          .filter((kt) => kt.kit_id === kitToolEntry.kit_id)
          .map((kt) => kt.tool_id);
        
        const kitLoanIds = activeLoans
          .filter((l) => kitToolIds.includes(l.tool_id))
          .map((l) => l.id);

        const newLoans = kitLoanIds.filter((id) => !allLoanIdsToSelect.has(id));
        if (newLoans.length > 0) {
          kitsExpanded++;
          newLoans.forEach((id) => allLoanIdsToSelect.add(id));
        }
      }
    }

    setSelectedLoanIds(allLoanIdsToSelect);
    setShowPhotoRecognition(false);

    if (kitsExpanded > 0) {
      toast({
        title: "Kit(s) expandido(s)",
        description: `${kitsExpanded} kit(s) foram selecionados por completo`,
      });
    }
  };

  const proceedToPhotos = () => {
    // Find selected loans that require photos, excluding lost items
    const selectedLoans = activeLoans.filter(l => selectedLoanIds.has(l.id));
    const lostToolIds = loanIssues.filter(i => i.issueType === "perdida").map(i => i.loanId);
    
    // Tools requiring photos, but lost tools skip the photo requirement
    const loansRequiringPhotos = selectedLoans.filter(
      l => l.tools?.requires_return_photo && !lostToolIds.includes(l.id)
    );
    
    if (loansRequiringPhotos.length > 0) {
      setPhotoCaptures(loansRequiringPhotos.map(l => ({
        loanId: l.id,
        toolName: l.tools?.name || "Ferramenta",
        kitName: l.tools?.kits?.name || undefined,
        photo: null,
      })));
      setCurrentPhotoIndex(0);
      setCurrentStep(3);
    } else {
      // Skip photos, go to description check or auth
      proceedToDescriptionCheck();
    }
  };

  const proceedToDescriptionCheck = () => {
    const selectedLoans = activeLoans.filter(l => selectedLoanIds.has(l.id));
    const loansWithDescription = selectedLoans.filter(l => l.tools?.description?.trim());
    
    if (loansWithDescription.length > 0) {
      setCheckedDescriptions(new Set());
      setCurrentStep(4);
    } else {
      // Skip to auth
      setCurrentStep(5);
    }
  };

  const getLoansWithDescription = () => {
    return activeLoans
      .filter(l => selectedLoanIds.has(l.id))
      .filter(l => l.tools?.description?.trim());
  };

  const toggleDescriptionCheck = (loanId: string) => {
    setCheckedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(loanId)) {
        newSet.delete(loanId);
      } else {
        newSet.add(loanId);
      }
      return newSet;
    });
  };

  const canProceedFromDescriptionCheck = () => {
    const loansWithDescription = getLoansWithDescription();
    return loansWithDescription.every(l => checkedDescriptions.has(l.id));
  };

  const handleReportIssue = (loan: LoanWithDetails) => {
    setSelectedLoanForIssue(loan);
    setIssueDialogOpen(true);
  };

  const handleConfirmIssue = (data: {
    issueType: ReturnIssueType;
    description: string;
    requiresDiscount: boolean;
  }) => {
    if (!selectedLoanForIssue) return;

    // Remove any existing issue for this loan
    const filteredIssues = loanIssues.filter(i => i.loanId !== selectedLoanForIssue.id);
    
    // Add new issue
    setLoanIssues([
      ...filteredIssues,
      {
        loanId: selectedLoanForIssue.id,
        toolId: selectedLoanForIssue.tool_id,
        toolName: selectedLoanForIssue.tools?.name || "Ferramenta",
        issueType: data.issueType,
        description: data.description,
        requiresDiscount: data.requiresDiscount,
      },
    ]);

    setIssueDialogOpen(false);
    setSelectedLoanForIssue(null);
    
    toast({
      title: "Ocorrência registrada",
      description: `${selectedLoanForIssue.tools?.name} marcada como ${
        data.issueType === "manutencao" ? "para manutenção" :
        data.issueType === "danificada" ? "danificada" : "perdida"
      }`,
    });
  };

  const removeIssue = (loanId: string) => {
    setLoanIssues(prev => prev.filter(i => i.loanId !== loanId));
  };

  const getLoanIssue = (loanId: string) => {
    return loanIssues.find(i => i.loanId === loanId);
  };

  const handlePhotoUpdate = useCallback((index: number, photo: string) => {
    setPhotoCaptures(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        photo: photo,
      };
      return updated;
    });
  }, []);

  const handlePhotoRemove = useCallback((index: number) => {
    setPhotoCaptures(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        photo: null,
      };
      return updated;
    });
  }, []);

  const canProceedFromPhotos = () => {
    return photoCaptures.every(p => p.photo !== null);
  };

  const verifyUserByQR = async (): Promise<boolean> => {
    if (!scannedUser) return false;

    const { data: users } = await supabase
      .from("profiles")
      .select("*")
      .eq("qr_code", authQrCode)
      .maybeSingle();

    if (!users) {
      toast({ variant: "destructive", title: "QR Code não encontrado" });
      return false;
    }

    if ((users as Profile).id !== scannedUser.id) {
      toast({ variant: "destructive", title: "QR Code não pertence ao usuário selecionado" });
      return false;
    }

    return true;
  };

  const verifyUserByPassword = async (): Promise<boolean> => {
    if (!scannedUser || !userPassword) return false;

    setIsVerifying(true);
    try {
      const response = await supabase.functions.invoke("verify-user-password", {
        body: {
          user_id: scannedUser.id,
          password: userPassword,
          allow_admin_override: true, // Allow admin password to verify any return
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

      // Show who verified
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

  const handleReturn = async () => {
    if (!scannedUser || selectedLoanIds.size === 0 || !currentUser) return;

    // Verify user identity
    const isVerified = authMode === "qr" 
      ? await verifyUserByQR() 
      : await verifyUserByPassword();

    if (!isVerified) return;

    setIsSubmitting(true);
    try {
      const selectedLoansList = Array.from(selectedLoanIds).map(id => activeLoans.find(l => l.id === id)).filter(Boolean) as LoanWithDetails[];
      
      // Prepare all uploads in parallel
      const uploadPromises = selectedLoansList.map(async (loan) => {
        const photoCapture = photoCaptures.find(pc => pc.loanId === loan.id);
        if (!photoCapture?.photo) return { loanId: loan.id, url: null };

        try {
          const base64Data = photoCapture.photo.split(',')[1];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'image/jpeg' });
          
          const fileName = `${loan.id}_${Date.now()}.jpg`;
          const filePath = `return-photos/${fileName}`;
          
          const { error: uploadError } = await supabase.storage
            .from('loan-photos')
            .upload(filePath, blob, { contentType: 'image/jpeg' });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            return { loanId: loan.id, url: null };
          }
          
          const { data: urlData } = supabase.storage
            .from('loan-photos')
            .getPublicUrl(filePath);
          return { loanId: loan.id, url: urlData.publicUrl };
        } catch (err) {
          console.error('Error uploading photo:', err);
          return { loanId: loan.id, url: null };
        }
      });

      // Wait for all uploads
      const uploadResults = await Promise.all(uploadPromises);
      const photoUrlMap = new Map(uploadResults.map(r => [r.loanId, r.url]));

      // Prepare all loan updates in parallel
      const loanUpdatePromises = selectedLoansList.map((loan) =>
        supabase
          .from("loans")
          .update({
            status: "devolvido",
            return_date: new Date().toISOString(),
            returned_by: currentUser.id,
            return_photo_url: photoUrlMap.get(loan.id) || null,
          })
          .eq("id", loan.id)
      );

      // Prepare issue insertions
      const issueInserts = selectedLoansList
        .filter(loan => getLoanIssue(loan.id))
        .map(loan => {
          const issue = getLoanIssue(loan.id)!;
          return {
            loan_id: loan.id,
            tool_id: loan.tool_id,
            user_id: scannedUser.id,
            reported_by: currentUser.id,
            issue_type: issue.issueType,
            description: issue.description || null,
            requires_discount: issue.requiresDiscount,
          };
        });

      // Prepare tool maintenance updates
      const maintenanceToolIds = selectedLoansList
        .filter(loan => {
          const issue = getLoanIssue(loan.id);
          return issue?.issueType === "manutencao";
        })
        .map(loan => loan.tool_id);

      // Execute all updates in parallel
      await Promise.all([
        ...loanUpdatePromises,
        issueInserts.length > 0 ? supabase.from("return_issues").insert(issueInserts) : Promise.resolve(),
        maintenanceToolIds.length > 0 
          ? supabase.from("tools").update({ is_maintenance: true }).in("id", maintenanceToolIds)
          : Promise.resolve(),
      ]);

      // Handle discount notifications in background (non-blocking)
      const discountIssues = loanIssues.filter(i => i.requiresDiscount);
      if (discountIssues.length > 0) {
        supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .then(({ data: adminRoles }) => {
            if (adminRoles && adminRoles.length > 0) {
              const notifications = discountIssues.flatMap(issue => {
                const loan = selectedLoansList.find(l => l.id === issue.loanId);
                return adminRoles.map(role => ({
                  user_id: role.user_id,
                  title: issue.issueType === "perdida" 
                    ? "Ferramenta Perdida - Desconto Pendente"
                    : "Ferramenta Danificada - Desconto Pendente",
                  message: `${scannedUser.full_name} ${issue.issueType === "perdida" ? "perdeu" : "danificou"} a ferramenta "${loan?.tools?.name}". ${issue.description || ""}`.trim(),
                  type: "warning",
                }));
              });
              supabase.from("notifications").insert(notifications);
            }
          });
      }

      toast({ 
        title: "Devolução registrada!", 
        description: `${selectedLoanIds.size} ferramenta(s) devolvida(s) com sucesso` 
      });

      // Reset form
      resetFlow();
      // Refresh user list
      fetchUsersWithActiveLoans();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    setScannedUser(null);
    setActiveLoans([]);
    setSelectedLoanIds(new Set());
    setPhotoCaptures([]);
    setCurrentPhotoIndex(0);
    setAuthQrCode("");
    setUserPassword("");
    setAuthMode("qr");
    setLoanIssues([]);
    setCheckedDescriptions(new Set());
    setCurrentStep(1);
  };

  const goBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 4) {
      // From description check, go back to photos or tools
      const lostToolIds = loanIssues.filter(i => i.issueType === "perdida").map(i => i.loanId);
      const hasPhotosRequired = activeLoans
        .filter(l => selectedLoanIds.has(l.id))
        .filter(l => !lostToolIds.includes(l.id))
        .some(l => l.tools?.requires_return_photo);
      setCurrentStep(hasPhotosRequired ? 3 : 2);
    } else if (currentStep === 5) {
      // From auth, go back to description check or photos or tools
      const loansWithDescription = getLoansWithDescription();
      if (loansWithDescription.length > 0) {
        setCurrentStep(4);
      } else {
        const lostToolIds = loanIssues.filter(i => i.issueType === "perdida").map(i => i.loanId);
        const hasPhotosRequired = activeLoans
          .filter(l => selectedLoanIds.has(l.id))
          .filter(l => !lostToolIds.includes(l.id))
          .some(l => l.tools?.requires_return_photo);
        setCurrentStep(hasPhotosRequired ? 3 : 2);
      }
    }
  };

  if (!canAccess) {
    return (
      <MainLayout>
        <EmptyState
          icon={PackageCheck}
          title="Acesso Restrito"
          description="Apenas administradores e almoxarifados podem registrar devoluções"
        />
      </MainLayout>
    );
  }

  const selectedLoans = activeLoans.filter(l => selectedLoanIds.has(l.id));
  const canSubmitAuth = authMode === "qr" ? authQrCode.length > 0 : userPassword.length >= 6;
  const progressValue = (currentStep / STEPS.length) * 100;

  return (
    <MainLayout>
      <PageHeader
        title="Devolução de Ferramentas"
        description={STEPS[currentStep - 1]?.description || ""}
      />

      {/* Progress Steps */}
      <div className="mb-6">
        <div className="flex justify-between mb-2">
          {STEPS.map((step) => (
            <div
              key={step.id}
              className={`flex items-center gap-2 text-sm ${
                step.id === currentStep
                  ? "text-primary font-medium"
                  : step.id < currentStep
                  ? "text-muted-foreground"
                  : "text-muted-foreground/50"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                  step.id < currentStep
                    ? "bg-primary text-primary-foreground"
                    : step.id === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {step.id < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
              </div>
              <span className="hidden lg:inline truncate">{step.title}</span>
            </div>
          ))}
        </div>
        <Progress value={progressValue} className="h-2" />
      </div>

      {/* Step 1: Identify User */}
      {currentStep === 1 && (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Users with active loans */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Usuários com Empréstimos Ativos
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Selecione quem está devolvendo
              </p>
            </CardHeader>
            <CardContent>
              {/* Search filter */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por nome..."
                  value={nameSearch}
                  onChange={(e) => setNameSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {allUsersWithLoans.length === 0 ? (
                <div className="text-center py-8">
                  <PackageCheck className="mx-auto h-12 w-12 text-muted-foreground/30" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Nenhum usuário com empréstimos ativos
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2 pr-4">
                    {allUsersWithLoans
                      .filter(u => 
                        !nameSearch || 
                        u.full_name.toLowerCase().includes(nameSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(nameSearch.toLowerCase())
                      )
                      .map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleSelectUserByName(user)}
                          className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold uppercase text-primary shrink-0">
                            {user.full_name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{user.full_name}</p>
                            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Select Tools */}
      {currentStep === 2 && scannedUser && (
        <div className="space-y-4 max-w-2xl mx-auto">
          {/* User Info */}
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold uppercase text-primary">
                {scannedUser.full_name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{scannedUser.full_name}</p>
                <p className="text-sm text-muted-foreground">{scannedUser.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(1)}>
                Trocar
              </Button>
            </CardContent>
          </Card>

          {/* Photo Recognition */}
          {showPhotoRecognition ? (
            <ReturnPhotoRecognition
              loans={activeLoans}
              selectedLoanIds={selectedLoanIds}
              kitTools={kitTools}
              onSelectLoans={selectLoansByIds}
              onClose={() => setShowPhotoRecognition(false)}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full h-14 border-dashed"
              onClick={() => setShowPhotoRecognition(true)}
            >
              <Sparkles className="mr-2 h-5 w-5 text-primary" />
              Identificar ferramentas por foto (IA)
            </Button>
          )}

          {/* Tool Selection */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <PackageCheck className="h-5 w-5" />
                  Selecione as Ferramentas
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                  {selectedLoanIds.size === activeLoans.length ? "Desmarcar Todos" : "Marcar Todos"}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {selectedLoanIds.size} de {activeLoans.length} selecionada(s)
              </p>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[350px]">
                <div className="space-y-2 pr-4">
                  {activeLoans.map((loan) => {
                    const isOverdue = new Date(loan.due_date) < new Date();
                    const isSelected = selectedLoanIds.has(loan.id);
                    const issue = getLoanIssue(loan.id);
                    
                    return (
                      <div
                        key={loan.id}
                        className={`rounded-lg border p-4 transition-colors ${
                          issue 
                            ? issue.issueType === "perdida" 
                              ? "border-destructive/50 bg-destructive/5"
                              : issue.issueType === "danificada"
                              ? "border-warning/50 bg-warning/5"
                              : "border-amber-500/50 bg-amber-500/5"
                            : isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                        }`}
                      >
                        <div 
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => toggleLoanSelection(loan.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleLoanSelection(loan.id)}
                            className="mt-1"
                          />
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                            <Wrench className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug break-words">{loan.tools?.name || "Ferramenta"}</p>
                            {loan.tools?.kits?.name && (
                              <span className="text-xs text-primary/70">{loan.tools.kits.name}</span>
                            )}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap mt-1">
                              <span>Devolução: {format(new Date(loan.due_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                              {isOverdue && !issue && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                                  Atrasado
                                </Badge>
                              )}
                              {loan.tools?.requires_return_photo && !issue?.issueType && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  <Camera className="mr-0.5 h-2.5 w-2.5" />
                                  Foto
                                </Badge>
                              )}
                              {loan.tools?.description?.trim() && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                  <ClipboardCheck className="mr-0.5 h-2.5 w-2.5" />
                                  Conferir
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Issue badge or report button */}
                        <div className="mt-2 flex items-center justify-between">
                          {issue ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge 
                                variant={issue.issueType === "perdida" ? "destructive" : "warning"}
                                className="gap-1"
                              >
                                <AlertCircle className="h-3 w-3" />
                                {issue.issueType === "manutencao" && "Manutenção"}
                                {issue.issueType === "danificada" && "Danificada"}
                                {issue.issueType === "perdida" && "Perdida"}
                              </Badge>
                              {issue.requiresDiscount && (
                                <Badge variant="destructive" className="text-xs">
                                  Desconto
                                </Badge>
                              )}
                              {issue.issueType === "perdida" && loan.tools?.requires_return_photo && (
                                <span className="text-xs text-muted-foreground">
                                  (foto dispensada)
                                </span>
                              )}
                            </div>
                          ) : (
                            <div />
                          )}
                          <Button
                            type="button"
                            variant={issue ? "outline" : "ghost"}
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (issue) {
                                removeIssue(loan.id);
                              } else {
                                handleReportIssue(loan);
                              }
                            }}
                          >
                            {issue ? (
                              <>
                                <X className="mr-1 h-3 w-3" />
                                Remover
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Reportar Problema
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

        </div>
      )}

      {/* Step 3: Photo Capture */}
      {currentStep === 3 && photoCaptures.length > 0 && (
        <ReturnPhotoCaptureCard
          photoCaptures={photoCaptures}
          currentPhotoIndex={currentPhotoIndex}
          onPhotoUpdate={handlePhotoUpdate}
          onPhotoRemove={handlePhotoRemove}
          onIndexChange={setCurrentPhotoIndex}
          onBack={goBack}
          onContinue={proceedToDescriptionCheck}
          canProceed={canProceedFromPhotos()}
        />
      )}

      {/* Step 4: Description Check */}
      {currentStep === 4 && scannedUser && (
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10">
              <ClipboardCheck className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle>Conferência das Ferramentas</CardTitle>
            <p className="text-sm text-muted-foreground">
              Verifique as informações de cada ferramenta
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-[400px]">
              <div className="space-y-3 pr-4">
                {getLoansWithDescription().map((loan) => (
                  <div
                    key={loan.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      checkedDescriptions.has(loan.id)
                        ? "border-green-500 bg-green-500/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`check-${loan.id}`}
                        checked={checkedDescriptions.has(loan.id)}
                        onCheckedChange={() => toggleDescriptionCheck(loan.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        {loan.tools?.kits?.name && (
                          <span className="text-xs text-primary font-medium">
                            Kit: {loan.tools.kits.name}
                          </span>
                        )}
                        <Label
                          htmlFor={`check-${loan.id}`}
                          className="text-sm font-medium cursor-pointer block"
                        >
                          {loan.tools?.name}
                        </Label>
                        <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
                          {loan.tools?.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

          </CardContent>
        </Card>
      )}

      {/* Step 5: Authentication */}
      {currentStep === 5 && scannedUser && (
        <Card className="mx-auto max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Confirmar Devolução</CardTitle>
            <p className="text-sm text-muted-foreground">
              O usuário deve confirmar sua identidade
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground">Usuário</p>
              <p className="font-semibold">{scannedUser.full_name}</p>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-2">Ferramentas a devolver</p>
              <div className="space-y-1">
                {selectedLoans.map(loan => (
                  <div key={loan.id} className="flex items-center gap-2 text-sm">
                    <Wrench className="h-3 w-3 text-muted-foreground" />
                    <span>{loan.tools?.name}</span>
                    {photoCaptures.find(p => p.loanId === loan.id)?.photo && (
                      <Badge variant="secondary" className="text-[10px] px-1.5">
                        <Camera className="h-2.5 w-2.5 mr-0.5" />
                        Foto
                      </Badge>
                    )}
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
                  <Label>Escaneie o QR Code do usuário</Label>
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
                  <Label>Senha do usuário ou administrador</Label>
                  <Input
                    type="password"
                    placeholder="Digite a senha"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Use a senha do próprio usuário ou de qualquer administrador
                  </p>
                </div>
              </TabsContent>
            </Tabs>

          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons - Sticky (hidden on step 3 which has its own nav) */}
      {currentStep !== 3 && (
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t pt-3 pb-3 mt-6 z-50">
          <div className="flex justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => {
                if (currentStep === 1) {
                  // No back on step 1, could navigate away
                } else {
                  goBack();
                }
              }}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>

            {currentStep === 5 ? (
              <Button
                onClick={handleReturn}
                disabled={isSubmitting || isVerifying || !canSubmitAuth}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {isVerifying ? "Verificando..." : isSubmitting ? "Registrando..." : "Confirmar Devolução"}
              </Button>
            ) : currentStep === 4 ? (
              <Button
                onClick={() => setCurrentStep(5)}
                disabled={!canProceedFromDescriptionCheck()}
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : currentStep === 2 ? (
              <Button
                onClick={proceedToPhotos}
                disabled={selectedLoanIds.size === 0}
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>
      )}

      {/* QR Scanner Modals */}
      {showUserScanner && (
        <QRScanner
          onScan={(result) => {
            setShowUserScanner(false);
            handleScanUser(result);
          }}
          onClose={() => setShowUserScanner(false)}
        />
      )}

      {showAuthScanner && (
        <QRScanner
          onScan={(result) => setAuthQrCode(result)}
          onClose={() => setShowAuthScanner(false)}
        />
      )}

      {/* Issue Report Dialog */}
      <ReturnIssueDialog
        open={issueDialogOpen}
        onOpenChange={setIssueDialogOpen}
        toolName={selectedLoanForIssue?.tools?.name || "Ferramenta"}
        onConfirm={handleConfirmIssue}
      />
    </MainLayout>
  );
}
