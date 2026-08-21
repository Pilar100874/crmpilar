import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userAuthId: string;
  userName: string;
  currentJobFunctionId: string | null;
  currentShiftId: string | null;
  currentIsOnVacation: boolean;
  onUserUpdated: () => void;
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

interface AccessLevelOption {
  id: string;
  name: string;
  base_role: string;
}

export function EditUserDialog({
  open,
  onOpenChange,
  userId,
  userAuthId,
  userName,
  currentJobFunctionId,
  currentShiftId,
  currentIsOnVacation,
  onUserUpdated,
}: EditUserDialogProps) {
  const [fullName, setFullName] = useState(userName);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [establishments, setEstablishments] = useState<EstOption[]>([]);
  const [accessLevels, setAccessLevels] = useState<AccessLevelOption[]>([]);
  const [selectedAccessLevelId, setSelectedAccessLevelId] = useState<string>("none");
  const [selectedEstablishments, setSelectedEstablishments] = useState<string[]>([]);
  const [sectorId, setSectorId] = useState("");
  const [jobFunctionId, setJobFunctionId] = useState<string>("none");
  const [shiftId, setShiftId] = useState<string>("none");
  const [isOnVacation, setIsOnVacation] = useState(currentIsOnVacation);
  const [canApproveIrregularities, setCanApproveIrregularities] = useState(false);
  const [canDeleteIncidents, setCanDeleteIncidents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const { toast } = useToast();
  const { isSuperAdmin, isAdmin, loading: roleLoading } = useUserRole();

  useEffect(() => {
    if (open && !roleLoading) {
      fetchData();
    }
  }, [open, isSuperAdmin, isAdmin]);

  useEffect(() => {
    if (jobFunctions.length > 0 && currentJobFunctionId) {
      const fn = jobFunctions.find((f) => f.id === currentJobFunctionId);
      if (fn?.sector_id) setSectorId(fn.sector_id);
    }
    setJobFunctionId(currentJobFunctionId || "none");
    setShiftId(currentShiftId || "none");
    setIsOnVacation(currentIsOnVacation);
    setFullName(userName);
  }, [jobFunctions, currentJobFunctionId, currentShiftId, currentIsOnVacation]);

  const fetchData = async () => {
    setDataLoading(true);
    try {
      const [sectorsRes, functionsRes, shiftsRes, profileRes, userEstRes, accessLevelsRes] = await Promise.all([
        supabase.from("sectors").select("id, name, color").order("name"),
        supabase.from("job_functions").select("id, name, sector_id").order("name"),
        supabase.from("shifts").select("id, name").order("name"),
        supabase.rpc("get_profile_admin_details" as any, { p_profile_id: userId }).maybeSingle(),
        supabase.from("user_establishments").select("establishment_id").eq("user_id", userAuthId),
        supabase.from("access_levels").select("id, name, base_role").order("name"),
      ]);

      const estRes = await supabase.from("establishments").select("id, name").eq("is_active", true).order("name");

      if (sectorsRes.data) setSectors(sectorsRes.data);
      if (functionsRes.data) setJobFunctions(functionsRes.data);
      if (shiftsRes.data) setShifts(shiftsRes.data);
      if (profileRes.data) {
        setCanApproveIrregularities((profileRes.data as any).can_approve_irregularities || false);
        setCanDeleteIncidents((profileRes.data as any).can_delete_incidents || false);
        setSelectedAccessLevelId((profileRes.data as any).access_level_id || "none");
      }
      if (accessLevelsRes.data) setAccessLevels(accessLevelsRes.data as any);
      if (userEstRes.data) {
        setSelectedEstablishments(userEstRes.data.map((ue: any) => ue.establishment_id));
      }
      if (estRes?.data) {
        setEstablishments(estRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  const filteredFunctions = jobFunctions.filter((f) => f.sector_id === sectorId);

  const toggleEstablishment = (estId: string) => {
    setSelectedEstablishments(prev =>
      prev.includes(estId)
        ? prev.filter(id => id !== estId)
        : [...prev, estId]
    );
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!sectorId) {
      toast({ title: "Setor é obrigatório", variant: "destructive" });
      return;
    }
    if (!jobFunctionId || jobFunctionId === "none") {
      toast({ title: "Função é obrigatória", variant: "destructive" });
      return;
    }
    if (!shiftId || shiftId === "none") {
      toast({ title: "Turno é obrigatório", variant: "destructive" });
      return;
    }
    if ((isSuperAdmin || isAdmin) && selectedEstablishments.length === 0) {
      toast({ title: "Selecione ao menos um estabelecimento", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          job_function_id: jobFunctionId === "none" ? null : jobFunctionId,
          shift_id: shiftId === "none" ? null : shiftId,
          is_on_vacation: isOnVacation,
          can_approve_irregularities: canApproveIrregularities,
          can_delete_incidents: canDeleteIncidents,
          access_level_id: selectedAccessLevelId === "none" ? null : selectedAccessLevelId,
        } as any)
        .eq("id", userId);

      if (error) throw error;

      // Update user_establishments if super_admin
      if ((isSuperAdmin || isAdmin) && userAuthId) {
        // Delete existing
        await supabase
          .from("user_establishments")
          .delete()
          .eq("user_id", userAuthId);

        // Insert new
        if (selectedEstablishments.length > 0) {
          await supabase
            .from("user_establishments")
            .insert(
              selectedEstablishments.map(estId => ({
                user_id: userAuthId,
                establishment_id: estId,
              }))
            );
        }

        // Update profile's primary establishment
        await supabase
          .from("profiles")
          .update({ establishment_id: selectedEstablishments[0] })
          .eq("id", userId);
      }

      toast({ title: "Colaborador atualizado!" });
      onOpenChange(false);
      onUserUpdated();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const showEstablishments = (isSuperAdmin || isAdmin) && establishments.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {userName}</DialogTitle>
        </DialogHeader>

        {dataLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome do colaborador"
              />
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
                <p className="text-xs text-muted-foreground">
                  O primeiro selecionado será o estabelecimento principal.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nível de Acesso</Label>
              <Select value={selectedAccessLevelId} onValueChange={setSelectedAccessLevelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível de acesso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem nível (padrão por role)</SelectItem>
                  {accessLevels.map((al) => (
                    <SelectItem key={al.id} value={al.id}>
                      {al.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {accessLevels.length === 0
                  ? "Nenhum nível cadastrado. Crie em Níveis de Acesso."
                  : "Define quais menus o usuário pode visualizar"}
              </p>
            </div>

            <div className="space-y-2">
              <Select value={sectorId} onValueChange={(v) => {
                setSectorId(v);
                setJobFunctionId("none");
              }}>
                <SelectTrigger>
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
            </div>

            <div className="space-y-2">
              <Label>Função</Label>
              <Select value={jobFunctionId} onValueChange={setJobFunctionId} disabled={!sectorId}>
                <SelectTrigger className={(!jobFunctionId || jobFunctionId === "none") ? "border-destructive" : ""}>
                  <SelectValue placeholder={sectorId ? "Selecione a função *" : "Selecione o setor primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredFunctions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                  {filteredFunctions.length === 0 && sectorId && (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      Nenhuma função neste setor
                    </div>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tarefas serão atribuídas automaticamente com base na função
              </p>
            </div>

            <div className="space-y-2">
              <Label>Turno *</Label>
              <Select value={shiftId} onValueChange={setShiftId}>
                <SelectTrigger className={(!shiftId || shiftId === "none") ? "border-destructive" : ""}>
                  <SelectValue placeholder="Selecione o turno" />
                </SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <Label>Férias</Label>
                <p className="text-xs text-muted-foreground">
                  Tarefas serão redistribuídas automaticamente
                </p>
              </div>
              <Switch checked={isOnVacation} onCheckedChange={setIsOnVacation} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <Label>Aprovador de Irregularidades</Label>
                <p className="text-xs text-muted-foreground">
                  Pode auto-aprovar templates e aprovar de outros
                </p>
              </div>
              <Switch checked={canApproveIrregularities} onCheckedChange={setCanApproveIrregularities} />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div className="space-y-0.5">
                <Label>Pode Excluir Incidentes</Label>
                <p className="text-xs text-muted-foreground">
                  Permite deletar incidentes operacionais
                </p>
              </div>
              <Switch checked={canDeleteIncidents} onCheckedChange={setCanDeleteIncidents} />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Salvando...</> : "Salvar"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
