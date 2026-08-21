import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";

interface Establishment {
  id: string;
  name: string;
}

interface EstablishmentContextType {
  establishmentId: string | null;
  establishmentName: string | null;
  loading: boolean;
  /** Establishments the current user belongs to */
  userEstablishments: Establishment[];
  /** All establishments (super_admin only) */
  allEstablishments: Establishment[];
  /** Switch active establishment */
  switchEstablishment: (id: string) => void;
}

const EstablishmentContext = createContext<EstablishmentContextType | undefined>(undefined);

export function EstablishmentProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { isSuperAdmin, loading: roleLoading } = useUserRole();
  const [establishmentId, setEstablishmentId] = useState<string | null>(null);
  const [establishmentName, setEstablishmentName] = useState<string | null>(null);
  const [userEstablishments, setUserEstablishments] = useState<Establishment[]>([]);
  const [allEstablishments, setAllEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || roleLoading) {
      setEstablishmentId(null);
      setEstablishmentName(null);
      setLoading(roleLoading);
      return;
    }

    const fetchEstablishment = async () => {
      try {
        // Get user's linked establishments
        const { data: userEsts } = await supabase
          .from("op_user_establishments")
          .select("establishment_id, establishments(id, name)")
          .eq("user_id", user.id);

        const mapped: Establishment[] = (userEsts || [])
          .map((ue: any) => ue.establishments)
          .filter(Boolean);

        setUserEstablishments(mapped);

        // Get the active one from profile
        const { data: profile } = await supabase
          .from("op_profiles")
          .select("establishment_id")
          .eq("user_id", user.id)
          .single();

        const activeId = profile?.establishment_id;
        if (activeId) {
          setEstablishmentId(activeId);
          const active = mapped.find(e => e.id === activeId);
          setEstablishmentName(active?.name || null);
        } else if (mapped.length > 0) {
          setEstablishmentId(mapped[0].id);
          setEstablishmentName(mapped[0].name);
        }

        // Super admin: fetch all establishments
        if (isSuperAdmin) {
          const { data: allEst } = await supabase
            .from("op_establishments")
            .select("id, name")
            .eq("is_active", true)
            .order("name");
          setAllEstablishments(allEst || []);
        }
      } catch (error) {
        console.error("Error fetching establishment:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstablishment();
  }, [user, isSuperAdmin, roleLoading]);

  const switchEstablishment = useCallback(async (id: string) => {
    // Find in user's list or all list
    const allOptions = isSuperAdmin ? allEstablishments : userEstablishments;
    const est = allOptions.find(e => e.id === id);
    if (est && user) {
      setEstablishmentId(est.id);
      setEstablishmentName(est.name);

      // Update profile's active establishment
      await supabase
        .from("op_profiles")
        .update({ establishment_id: est.id })
        .eq("user_id", user.id);
    }
  }, [userEstablishments, allEstablishments, isSuperAdmin, user]);

  return (
    <EstablishmentContext.Provider value={{
      establishmentId,
      establishmentName,
      loading,
      userEstablishments,
      allEstablishments,
      switchEstablishment,
    }}>
      {children}
    </EstablishmentContext.Provider>
  );
}

export function useEstablishment() {
  const context = useContext(EstablishmentContext);
  if (context === undefined) {
    throw new Error("useEstablishment must be used within an EstablishmentProvider");
  }
  return context;
}
