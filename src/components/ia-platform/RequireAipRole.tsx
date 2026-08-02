import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, ShieldAlert, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppRole, carregarAcessoAip, temAlgumaRole } from "@/lib/aip/rbac";

interface Props {
  /** Roles autorizadas. */
  roles: AppRole[];
  children: React.ReactNode;
}

/**
 * Guarda de rota da Plataforma de Agentes IA: exige sessão válida e uma das
 * roles informadas (RBAC). A checagem definitiva continua sendo feita no
 * backend (Edge Function `aip-run-proxy`).
 */
export default function RequireAipRole({ roles, children }: Props) {
  const [estado, setEstado] = useState<"carregando" | "ok" | "sem-login" | "sem-permissao">(
    "carregando",
  );

  useEffect(() => {
    let ativo = true;
    carregarAcessoAip()
      .then((acesso) => {
        if (!ativo) return;
        if (!acesso.autenticado) return setEstado("sem-login");
        setEstado(temAlgumaRole(acesso.roles, roles) ? "ok" : "sem-permissao");
      })
      .catch(() => ativo && setEstado("sem-permissao"));
    return () => {
      ativo = false;
    };
  }, [roles]);

  if (estado === "carregando") {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Verificando permissões…
      </div>
    );
  }

  if (estado === "ok") return <>{children}</>;

  const semLogin = estado === "sem-login";

  return (
    <div className="flex min-h-[240px] items-center justify-center p-4">
      <Card className="max-w-md">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <CardTitle>{semLogin ? "Faça login para continuar" : "Acesso restrito"}</CardTitle>
          <CardDescription>
            {semLogin
              ? "Esta área exige uma sessão ativa no sistema."
              : "Somente usuários com perfil Administrador ou Gestor podem acessar o monitor e atualizar o servidor."}
          </CardDescription>
        </CardHeader>
        {semLogin && (
          <CardContent className="flex justify-center">
            <Button asChild>
              <Link to="/login">
                <LogIn className="mr-2 h-4 w-4" />
                Entrar
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
