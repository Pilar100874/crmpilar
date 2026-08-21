import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, AlertTriangle, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function CompanyExpiredOverlay() {
  const { company, companyStatus, signOut, isSuperAdmin } = useAuth();

  // Super admin never sees this overlay
  if (isSuperAdmin || companyStatus !== "expired") {
    return null;
  }

  const expirationDate = company?.approved_until || company?.trial_ends_at;
  const formattedDate = expirationDate 
    ? format(new Date(expirationDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : null;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            
            <h2 className="text-2xl font-bold">Acesso Expirado</h2>
            
            {company?.approved_until ? (
              <p className="text-muted-foreground">
                O período de uso da sua empresa <strong>{company.name}</strong> expirou
                {formattedDate && ` em ${formattedDate}`}.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  O período de teste de <strong>5 dias</strong> da sua empresa <strong>{company?.name}</strong> expirou
                  {formattedDate && ` em ${formattedDate}`}.
                </p>
              </div>
            )}

            <div className="bg-muted rounded-lg p-4 text-left">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium">Entre em contato</p>
                  <p className="text-sm text-muted-foreground">
                    Para continuar utilizando o sistema, entre em contato com o suporte para liberação do acesso.
                  </p>
                  <a 
                    href="mailto:pilar@pilar.com.br" 
                    className="text-sm text-primary hover:underline mt-1 inline-block"
                  >
                    pilar@pilar.com.br
                  </a>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Aguardando liberação do administrador</span>
            </div>

            <Button variant="outline" onClick={signOut} className="w-full">
              Sair da conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
