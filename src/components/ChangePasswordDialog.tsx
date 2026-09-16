import { useMemo, useState } from "react";
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
import { validarSenhaForte } from "@/lib/validarSenhaForte";
import { KeyRound, Eye, EyeOff, Check, X } from "lucide-react";

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REQUISITOS: { label: string; testa: (s: string) => boolean }[] = [
  { label: "Mínimo de 8 caracteres", testa: (s) => s.length >= 8 },
  { label: "Pelo menos uma letra", testa: (s) => /[A-Za-z]/.test(s) },
  { label: "Pelo menos um número", testa: (s) => /[0-9]/.test(s) },
  { label: "Pelo menos um símbolo (ex.: @ # ! $)", testa: (s) => /[^A-Za-z0-9]/.test(s) },
];

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [verAtual, setVerAtual] = useState(false);
  const [verNova, setVerNova] = useState(false);
  const [verConfirmar, setVerConfirmar] = useState(false);

  const erroSenha = useMemo(
    () => (novaSenha ? validarSenhaForte(novaSenha) : null),
    [novaSenha]
  );
  const confirmacaoDivergente = confirmarSenha.length > 0 && novaSenha !== confirmarSenha;
  const podeSalvar =
    !!senhaAtual && !!novaSenha && !!confirmarSenha && !erroSenha && !confirmacaoDivergente;

  const limpar = () => {
    setSenhaAtual("");
    setNovaSenha("");
    setConfirmarSenha("");
    setVerAtual(false);
    setVerNova(false);
    setVerConfirmar(false);
  };

  const handleClose = (aberto: boolean) => {
    if (!aberto) limpar();
    onOpenChange(aberto);
  };

  const handleSubmit = async () => {
    if (!podeSalvar) return;
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("Usuário não autenticado");
        return;
      }

      if (senhaAtual === novaSenha) {
        toast.error("A nova senha deve ser diferente da senha atual");
        return;
      }

      // Confere a senha atual
      const { error: erroLogin } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senhaAtual,
      });

      if (erroLogin) {
        toast.error("Senha atual incorreta");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) {
        toast.error("Erro ao alterar senha: " + error.message);
        return;
      }

      toast.success("Senha alterada com sucesso!");
      limpar();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao alterar senha:", error);
      toast.error("Erro ao alterar senha");
    } finally {
      setIsLoading(false);
    }
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
            Informe sua senha atual e defina a nova senha duas vezes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="senhaAtual">Senha Atual</Label>
            <div className="relative">
              <Input
                id="senhaAtual"
                type={verAtual ? "text" : "password"}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Digite sua senha atual"
                autoComplete="current-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setVerAtual(!verAtual)}
              >
                {verAtual ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="novaSenha">Nova Senha</Label>
            <div className="relative">
              <Input
                id="novaSenha"
                type={verNova ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Digite a nova senha"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setVerNova(!verNova)}
              >
                {verNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>

            <ul className="space-y-1 pt-1">
              {REQUISITOS.map((req) => {
                const ok = req.testa(novaSenha);
                return (
                  <li
                    key={req.label}
                    className={`flex items-center gap-2 text-xs ${
                      ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"
                    }`}
                  >
                    {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {req.label}
                  </li>
                );
              })}
            </ul>
            {erroSenha && !REQUISITOS.some((r) => !r.testa(novaSenha)) && (
              <p className="text-xs text-destructive">{erroSenha}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmarSenha">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="confirmarSenha"
                type={verConfirmar ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Digite a nova senha novamente"
                autoComplete="new-password"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setVerConfirmar(!verConfirmar)}
              >
                {verConfirmar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {confirmacaoDivergente && (
              <p className="text-xs text-destructive">As senhas não coincidem.</p>
            )}
          </div>

          <Button onClick={handleSubmit} disabled={isLoading || !podeSalvar} className="w-full">
            {isLoading ? "Alterando..." : "Alterar Senha"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
