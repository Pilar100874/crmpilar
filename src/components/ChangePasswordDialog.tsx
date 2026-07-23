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
import { KeyRound, MessageSquare, Check } from "lucide-react";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "request" | "verify" | "change";

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [step, setStep] = useState<Step>("request");
  const [isLoading, setIsLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userPhone, setUserPhone] = useState("");

  const handleRequestCode = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      // Buscar telefone do usuário
      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("whatsapp")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (userError || !usuario?.whatsapp) {
        toast.error("WhatsApp não encontrado no cadastro");
        return;
      }

      setUserPhone(usuario.whatsapp);

      // Gerar código de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);

      // Enviar código via WhatsApp
      const { error: sendError } = await supabase.functions.invoke("enviar-codigo-verificacao", {
        body: {
          telefone: usuario.whatsapp,
          codigo: code,
        },
      });

      if (sendError) {
        console.error("Erro ao enviar código:", sendError);
        toast.error("Erro ao enviar código via WhatsApp");
        return;
      }

      toast.success("Código enviado para seu WhatsApp!");
      setStep("verify");
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao processar solicitação");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (inputCode === verificationCode) {
      toast.success("Código verificado!");
      setStep("change");
    } else {
      toast.error("Código inválido");
    }
  };

  const handleChangePassword = async () => {
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        toast.error("Erro ao alterar senha: " + error.message);
        return;
      }

      toast.success("Senha alterada com sucesso!");
      onOpenChange(false);
      
      // Reset states
      setStep("request");
      setVerificationCode("");
      setInputCode("");
      setNewPassword("");
      setConfirmPassword("");
      setUserPhone("");
    } catch (error) {
      console.error("Erro:", error);
      toast.error("Erro ao alterar senha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("request");
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
            Alterar Senha
          </DialogTitle>
          <DialogDescription>
            {step === "request" && "Enviaremos um código de verificação para seu WhatsApp"}
            {step === "verify" && `Código enviado para ${userPhone}`}
            {step === "change" && "Defina sua nova senha"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {step === "request" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Para garantir sua segurança, enviaremos um código de verificação para o WhatsApp
                cadastrado em seu perfil.
              </p>
              <Button
                onClick={handleRequestCode}
                disabled={isLoading}
                className="w-full"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                {isLoading ? "Enviando..." : "Enviar Código via WhatsApp"}
              </Button>
            </div>
          )}

          {step === "verify" && (
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
                onClick={handleRequestCode}
                disabled={isLoading}
                className="w-full"
              >
                Reenviar Código
              </Button>
            </div>
          )}

          {step === "change" && (
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
                onClick={handleChangePassword}
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
