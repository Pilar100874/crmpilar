import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Protege rotas internas: exige sessão autenticada.
 * Rotas públicas (loja, portal, links por token) não usam este componente.
 */
export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<"loading" | "in" | "out">("loading");
  const location = useLocation();

  useEffect(() => {
    let ativo = true;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!ativo) return;
      if (event === "SIGNED_OUT") setStatus("out");
      else if (session) setStatus("in");
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setStatus(data.session ? "in" : "out");
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "out") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
