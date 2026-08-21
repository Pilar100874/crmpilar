import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Loader2, Lock, User, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEstablishment } from "@/hooks/useEstablishment";
import { useUserRole } from "@/hooks/useUserRole";
import { z } from "zod";

const createUserSchema = z.object({
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
  role: z.enum(["admin", "manager", "worker"]),
  sectorId: z.string().min(1, "Setor é obrigatório"),
  jobFunctionId: z.string().min(1, "Função é obrigatória"),
  shiftId: z.string().min(1, "Turno é obrigatório"),
});

interface CreateUserDialogProps {
  onUserCreated: () => void;
}

interface Sector {
  id: string;
  name: string;
  color: string;
}

interface JobFunction {
  id: string;
  name: string;
  sector_id: string | null;
}

interface Shift {
  id: string;
  name: string;
}

interface EstOption {
  id: string;
  name: string;
}

function generateInternalEmail(fullName: string): string {
  const normalized = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");
  
  const timestamp = Date.now().toString(36);
  return `${normalized}.${timestamp}@interno.cco`;
}

export function CreateUserDialog({ onUserCreated }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "worker">("worker");
  const [sectorId, setSectorId] = useState("");
  const [jobFunctionId, setJobFunctionId] = useState("");
  const [shiftId, setShiftId] = useState("");
  const [selectedEstablishments, setSelectedEstablishments] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdUser, setCreatedUser] = useState<{ name: string; login: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [establishments, setEstablishments] = useState<EstOption[]>([]);
  const { toast } = useToast();
  const { establishmentId, allEstablishments } = useEstablishment();
  const { isSuperAdmin, isAdmin } = useUserRole();

  useEffect(() => {
    if (open) fetchOptions();
  }, [open]);

  useEffect(() => {
    // Default: current establishment selected
    if (establishmentId && selectedEstablishments.length === 0) {
      setSelectedEstablishments([establishmentId]);
    }
  }, [establishmentId]);

  const fetchOptions = async () => {
    const [sectorsRes, functionsRes, shiftsRes, estRes] = await Promise.all([
      supabase.from("sectors").select("id, name, color").order("name"),
      supabase.from("job_functions").select("id, name, sector_id").order("name"),
      supabase.from("shifts").select("id, name").order("name"),
      (isSuperAdmin || isAdmin)
        ? supabase.from("establishments").select("id, name").eq("is_active", true).order("name")
        : Promise.resolve({ data: null }),
    ]);
    if (sectorsRes.data) setSectors(sectorsRes.data);
    if (functionsRes.data) setJobFunctions(functionsRes.data);
    if (shiftsRes.data) setShifts(shiftsRes.data);
    if (estRes.data) setEstablishments(estRes.data);
  };

  const filteredFunctions = jobFunctions.filter((f) => f.sector_id === sectorId);

  const toggleEstablishment = (estId: string) => {
    setSelectedEstablishments(prev =>
      prev.includes(estId) 
        ? prev.filter(id => id !== estId)
        : [...prev, estId]
    );
  };

  const validateForm = () => {
    try {
      createUserSchema.parse({ password, fullName, role, sectorId, jobFunctionId, shiftId });
      if (selectedEstablishments.length === 0) {
        setErrors(prev => ({ ...prev, establishments: "Selecione ao menos um estabelecimento" }));
        return false;
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const resetForm = () => {
    setPassword("");
    setFullName("");
    setRole("worker");
    setSectorId("");
    setJobFunctionId("");
    setShiftId("");
    setSelectedEstablishments(establishmentId ? [establishmentId] : []);
    setErrors({});
    setCreatedUser(null);
    setCopied(false);
  };

  const handleCopyCredentials = () => {
    if (createdUser) {
      const text = `Nome: ${createdUser.name}\nLogin: ${createdUser.login}\nSenha: ${createdUser.password}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      // Check for duplicate names
      const { data: existingUsers } = await supabase
        .from("profiles")
        .select("id")
        .ilike("full_name", fullName.trim());

      if (existingUsers && existingUsers.length > 0) {
        toast({
          title: "Nome já existe",
          description: "Já existe um colaborador com esse nome. Use um nome diferente.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const generatedEmail = generateInternalEmail(fullName);
      const primaryEstablishmentId = selectedEstablishments[0];

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: generatedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName,
            establishment_id: primaryEstablishmentId,
          },
        },
      });

      if (authError) {
        toast({
          title: "Erro ao criar usuário",
          description: authError.message,
          variant: "destructive",
        });
        return;
      }

      if (authData.user) {
        if (role !== "worker") {
          await supabase
            .from("user_roles")
            .update({ role })
            .eq("user_id", authData.user.id);
        }

        await supabase
          .from("profiles")
          .update({
            login_email: generatedEmail,
            job_function_id: jobFunctionId || null,
            shift_id: shiftId || null,
          })
          .eq("user_id", authData.user.id);

        // Insert into user_establishments (first one already created by trigger via profile)
        // Add additional establishments
        const additionalEsts = selectedEstablishments.filter(id => id !== primaryEstablishmentId);
        if (additionalEsts.length > 0) {
          await supabase
            .from("user_establishments")
            .insert(
              additionalEsts.map(estId => ({
                user_id: authData.user!.id,
                establishment_id: estId,
              }))
            );
        }

        // Ensure primary is also in user_establishments
        await supabase
          .from("user_establishments")
          .upsert({
            user_id: authData.user.id,
            establishment_id: primaryEstablishmentId,
          }, { onConflict: "user_id,establishment_id" });

        setCreatedUser({
          name: fullName,
          login: fullName,
          password: password,
        });

        toast({
          title: "Usuário criado!",
          description: `${fullName} foi adicionado ao sistema.`,
        });

        onUserCreated();
      }
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao criar o usuário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  // Show establishment selection for super_admin or if there are multiple
  const showEstablishments = (isSuperAdmin || isAdmin) && establishments.length > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Usuário
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {createdUser ? "Usuário Criado!" : "Criar Novo Usuário"}
          </DialogTitle>
        </DialogHeader>
        
        {createdUser ? (
          <div className="space-y-4 mt-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <p className="text-sm text-muted-foreground">
                Anote as credenciais de acesso do colaborador:
              </p>
              <div className="space-y-2">
                <div>
                  <span className="text-xs text-muted-foreground">Nome:</span>
                  <p className="font-medium">{createdUser.name}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Login (nome):</span>
                  <p className="font-medium">{createdUser.login}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Senha:</span>
                  <p className="font-mono">{createdUser.password}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleCopyCredentials}>
                {copied ? <><Check className="h-4 w-4 mr-2" />Copiado!</> : <><Copy className="h-4 w-4 mr-2" />Copiar</>}
              </Button>
              <Button className="flex-1" onClick={handleClose}>Fechar</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="create-fullName">Nome completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-fullName"
                  type="text"
                  placeholder="Nome do colaborador"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                />
              </div>
              {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="create-password">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="create-password"
                  type="text"
                  placeholder="Senha de acesso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres.</p>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select value={role} onValueChange={(value: "admin" | "manager" | "worker") => setRole(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="worker">Colaborador</SelectItem>
                  <SelectItem value="manager">Gestor</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showEstablishments && (
              <div className="space-y-2">
                <Label>Estabelecimentos *</Label>
                <div className="border border-border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
                  {establishments.map((est) => (
                    <label key={est.id} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedEstablishments.includes(est.id)}
                        onCheckedChange={() => toggleEstablishment(est.id)}
                      />
                      <span className="text-sm">{est.name}</span>
                    </label>
                  ))}
                </div>
                {errors.establishments && <p className="text-xs text-destructive">{errors.establishments}</p>}
                <p className="text-xs text-muted-foreground">
                  O primeiro selecionado será o estabelecimento principal.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Setor *</Label>
              <Select value={sectorId} onValueChange={(v) => {
                setSectorId(v);
                setJobFunctionId("");
              }}>
                <SelectTrigger className={!sectorId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {sectors.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.sectorId && <p className="text-xs text-destructive">{errors.sectorId}</p>}
            </div>

            <div className="space-y-2">
              <Label>Função *</Label>
              <Select
                value={jobFunctionId}
                onValueChange={setJobFunctionId}
                disabled={!sectorId}
              >
                <SelectTrigger className={!jobFunctionId ? "border-destructive" : ""}>
                  <SelectValue placeholder={sectorId ? "Selecione a função" : "Selecione o setor primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredFunctions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                  {filteredFunctions.length === 0 && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Nenhuma função neste setor
                    </div>
                  )}
                </SelectContent>
              </Select>
              {errors.jobFunctionId && <p className="text-xs text-destructive">{errors.jobFunctionId}</p>}
            </div>

            <div className="space-y-2">
              <Label>Turno *</Label>
              <Select value={shiftId || ""} onValueChange={setShiftId}>
                <SelectTrigger className={!shiftId ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.shiftId && <p className="text-xs text-destructive">{errors.shiftId}</p>}
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando...</> : "Criar Usuário"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
