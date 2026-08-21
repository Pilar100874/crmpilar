import { ReactNode, useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/hooks/ferramentas/useAuth";
import { Navigate } from "react-router-dom";
import { Wrench, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PushNotificationPrompt } from "@/components/ferramentas/PushNotificationPrompt";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, isLoading, isApproved, isAdmin, signOut } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/ferramentas/auth" replace />;
  }

  // Block unapproved users (except admins)
  if (!isApproved && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-6">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Aguardando Aprovação</h1>
            <p className="text-muted-foreground">
              Seu cadastro foi realizado com sucesso! Um administrador irá revisar e aprovar seu acesso em breve.
            </p>
          </div>
          <div className="pt-4">
            <Button variant="outline" onClick={() => signOut()}>
              Sair
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile Header */}
        <header className="flex h-14 items-center gap-4 border-b px-4 md:hidden">
          <MobileNav />
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Wrench className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">Pilar Ferramentas</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto" style={{ overflowX: 'clip' }}>
          <div className="w-full max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-8">
            {children}
          </div>
        </main>
        <PushNotificationPrompt />
      </div>
    </div>
  );
}
