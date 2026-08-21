import { useEstablishment } from "@/hooks/operacional-hub/useEstablishment";
import { useUserRole } from "@/hooks/operacional-hub/useUserRole";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";

export function EstablishmentSelector() {
  const { isSuperAdmin } = useUserRole();
  const { establishmentId, userEstablishments, allEstablishments, switchEstablishment } = useEstablishment();

  // Super admin sees all, regular users see only their linked establishments
  const options = isSuperAdmin ? allEstablishments : userEstablishments;

  // Don't show if user only has one establishment
  if (options.length <= 1) return null;

  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-2 text-xs text-sidebar-foreground/50 mb-1.5 px-1">
        <Building2 className="h-3 w-3" />
        <span>Estabelecimento</span>
      </div>
      <Select value={establishmentId || ""} onValueChange={switchEstablishment}>
        <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-foreground text-sm h-9">
          <SelectValue placeholder="Selecione..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((est) => (
            <SelectItem key={est.id} value={est.id}>
              {est.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
