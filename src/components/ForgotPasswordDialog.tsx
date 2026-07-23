import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { KeyRound, MessageSquare, Check, Mail } from "lucide-react";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "input-email" | "choose-method" | "verify-code" | "reset-password";
type RecoveryMethod = "whatsapp" | "email";

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const [step, setStep] = useState<Step>("input-email");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [recoveryMethod, setRecoveryMethod] = useState<RecoveryMethod | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userPhone, setUserPhone] = useState("");

  const handleSubmitEmail = async () => {
    if (!email) {
      toast.error("Digite seu e-mail");
      return;
    }

    setIsLoading(true);
    try {
      // Verificar se o usuário existe
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("whatsapp")
        .eq("email", email)
        .maybeSingle();

      if (userError || !usuario) {
        toast.error("E-mail não encontrado");
        return;
      }

      setUserPhone(usuario.whatsapp);
      setStep("choose-method");
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao processar solicitação");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendCode = async (method: RecoveryMethod) => {
    setRecoveryMethod(method);
    setIsLoading(true);
    
    try {
      // Gerar código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);

      if (method === "whatsapp") {
        // Enviar código via WhatsApp
        const { error: sendError } = await supabase.functions.invoke("enviar-codigo-verificacao", {
          body: {
            telefone: userPhone,
            codigo: code,
          },
        });

        if (sendError) {
          console.error("Erro ao enviar código:", sendError);
          toast.error("Erro ao enviar código via WhatsApp");
          return;
        }

        toast.success("Código enviado para seu WhatsApp!");
      } else {
        // Enviar código via e-mail (usando Supabase Auth)
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/`,
        });

        if (error) {
          toast.error("Erro ao enviar e-mail de recuperação");
          return;
        }

        toast.success("Link de recuperação enviado para seu e-mail!");
        handleClose();
        return;
      }

      setStep("verify-code");
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao enviar código");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (inputCode === verificationCode) {
      toast.success("Código verificado!");
      setStep("reset-password");
    } else {
      toast.error("Código inválido");
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setIsLoading(true);
    try {
      // Atualizar senha via Supabase admin (usando service role)
      // Como não temos acesso direto, vamos usar o auth do próprio usuário
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error("Erro ao alterar senha: " + error.message);
        return;
      }

      toast.success("Senha alterada com sucesso! Faça login com sua nova senha.");
      handleClose();
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao alterar senha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("input-email");
    setEmail("");
    setRecoveryMethod(null);
    setVerificationCode("");
    setInputCode("");
    setNewPassword("");
    setConfirmPassword("");
    setUserPhone("");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            Recuperar Senha
          </DialogTitle>
          <DialogDescription>
            {step === "input-email" && "Digite seu e-mail para recuperar sua senha"}
            {step === "choose-method" && "Escolha como deseja receber o código de verificação"}
            {step === "verify-code" && `Código enviado para ${recoveryMethod === "whatsapp" ? userPhone : email}`}
            {step === "reset-password" && "Defina sua nova senha"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === "input-email" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSubmitEmail()}
                />
              </div>
              <Button
                onClick={handleSubmitEmail}
                disabled={isLoading || !email}
                className="w-full"
              >
                {isLoading ? "Verificando..." : "Continuar"}
              </Button>
            </div>
          )}

          {step === "choose-method" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Como você deseja receber o código de recuperação?
              </p>
              
              {userPhone && (
                <Button
                  onClick={() => handleSendCode("whatsapp")}
                  disabled={isLoading}
                  variant="outline"
                  className="w-full justify-start"
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Via WhatsApp ({userPhone})
                </Button>
              )}
              
              <Button
                onClick={() => handleSendCode("email")}
                disabled={isLoading}
                variant="outline"
                className="w-full justify-start"
              >
                <Mail className="mr-2 h-4 w-4" />
                Via E-mail ({email})
              </Button>
            </div>
          )}

          {step === "verify-code" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código de Verificação</Label>
                <Input
                  id="code"
                  placeholder="Digite o código de 6 dígitos"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                />
              </div>
              <Button
                onClick={handleVerifyCode}
                disabled={inputCode.length !== 6}
                className="w-full"
              >
                <Check className="mr-2 h-4 w-4" />
                Verificar Código
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSendCode(recoveryMethod!)}
                disabled={isLoading}
                className="w-full"
              >
                Reenviar Código
              </Button>
            </div>
          )}

          {step === "reset-password" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirme sua nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <Button
                onClick={handleResetPassword}
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isLoading ? "Alterando..." : "Alterar Senha"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
