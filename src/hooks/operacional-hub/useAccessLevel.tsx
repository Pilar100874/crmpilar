import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface AccessLevel {
  id: string;
  name: string;
  base_role: string;
  allowed_menus: string[];
}

export function useAccessLevel() {
  const { user } = useAuth();
  const [accessLevel, setAccessLevel] = useState<AccessLevel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAccessLevel(null);
      setLoading(false);
      return;
    }

    const fetchAccessLevel = async () => {
      try {
        // Get the current user's own permission flags (server-side scoped)
        const { data: flags, error: profileError } = await supabase
          .rpc("op_get_my_profile_flags" as any)
          .maybeSingle();

        const accessLevelId = (flags as any)?.access_level_id as string | undefined;

        if (profileError || !accessLevelId) {
          setAccessLevel(null);
          setLoading(false);
          return;
        }


        // Fetch the access level details
        const { data: level, error: levelError } = await supabase
          .from("op_access_levels")
          .select("id, name, base_role, allowed_menus")
          .eq("id", accessLevelId)
          .single();

        if (levelError) {
          console.error("Error fetching access level:", levelError);
          setAccessLevel(null);
        } else {
          setAccessLevel(level as any);
        }
      } catch (error) {
        console.error("Error fetching access level:", error);
        setAccessLevel(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAccessLevel();
  }, [user]);

  return { accessLevel, loading };
}
