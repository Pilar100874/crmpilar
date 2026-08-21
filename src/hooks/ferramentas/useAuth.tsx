import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase, Profile, UserRole, AppRole, Company } from "@/lib/ferramentas/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  company: Company | null;
  isLoading: boolean;
  isAdmin: boolean;
  isAlmoxarifado: boolean;
  isApproved: boolean;
  isSuperAdmin: boolean;
  isCompanyActive: boolean;
  companyStatus: "active" | "trial" | "expired" | "none";
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, cnpj: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);

  const fetchProfile = async (userId: string, authEmail?: string | null, nome?: string | null) => {
    setIsProfileLoading(true);
    try {
      let { data: profileData } = await supabase
        .from("ferr_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      // Provisiona automaticamente o perfil do usuário do CRM no módulo.
      if (!profileData) {
        const { data: criado } = await supabase
          .from("ferr_profiles")
          .upsert({
            id: userId,
            email: authEmail ?? "",
            full_name: nome || (authEmail ? authEmail.split("@")[0] : "Usuário"),
            is_approved: true,
            is_active: true,
            qr_code: crypto.randomUUID(),
          })
          .select("*")
          .maybeSingle();
        profileData = criado ?? null;
      }

      let { data: roleData } = await supabase
        .from("ferr_user_roles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!roleData) {
        const { data: criadoRole } = await supabase
          .from("ferr_user_roles")
          .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" })
          .select("*")
          .maybeSingle();
        roleData = criadoRole ?? null;
      }

      if (profileData) {
        setProfile(profileData as Profile);
        
        // Fetch company if user has one
        if (profileData.company_id) {
          const { data: companyData } = await supabase
            .from("ferr_companies")
            .select("*")
            .eq("id", profileData.company_id)
            .single();
          if (companyData) setCompany(companyData as Company);
        }
      }
      if (roleData) setRole((roleData as UserRole).role);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(
              session.user.id,
              session.user.email,
              (session.user.user_metadata as { full_name?: string } | null)?.full_name ?? null,
            );
          }, 0);
        } else {
          setProfile(null);
          setRole(null);
          setCompany(null);
        }
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(
          session.user.id,
          session.user.email,
          (session.user.user_metadata as { full_name?: string } | null)?.full_name ?? null,
        );
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, fullName: string, cnpj: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: fullName, cnpj: cnpj.replace(/\D/g, "") },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
    setCompany(null);
  };

  // Determine company status
  const getCompanyStatus = (): "active" | "trial" | "expired" | "none" => {
    if (!company) return "none";
    
    const now = new Date();
    
    // If approved_until is set and valid
    if (company.approved_until) {
      return new Date(company.approved_until) > now ? "active" : "expired";
    }
    
    // Otherwise check trial
    if (company.trial_ends_at) {
      return new Date(company.trial_ends_at) > now ? "trial" : "expired";
    }
    
    return "expired";
  };

  const companyStatus = getCompanyStatus();
  // No CRM o módulo é interno: não há bloqueio por assinatura de empresa.
  const isCompanyActive = true;

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    company,
    isLoading: isLoading || isProfileLoading,
    isAdmin: role === "admin",
    isAlmoxarifado: role === "almoxarifado",
    isApproved: profile?.is_approved ?? true,
    isSuperAdmin: role === "admin",
    isCompanyActive,
    companyStatus,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
