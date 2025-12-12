import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Mail, Phone } from "lucide-react";
import { validateEmail, validateWhatsApp } from "@/lib/validators";
import { maskWhatsApp } from "@/lib/masks";
import { toast } from "@/lib/toast-config";

interface VinculosContatoSectionProps {
  emailsVinculados: string[];
  whatsappsVinculados: string[];
  onEmailsChange: (emails: string[]) => void;
  onWhatsappsChange: (whatsapps: string[]) => void;
  disabled?: boolean;
}

export function VinculosContatoSection({
  emailsVinculados,
  whatsappsVinculados,
  onEmailsChange,
  onWhatsappsChange,
  disabled = false,
}: VinculosContatoSectionProps) {
  const [novoEmail, setNovoEmail] = useState("");
  const [novoWhatsapp, setNovoWhatsapp] = useState("");

  const handleAddEmail = () => {
    const email = novoEmail.trim().toLowerCase();
    if (!email) return;

    if (!validateEmail(email)) {
      toast.error("E-mail inválido");
      return;
    }

    if (emailsVinculados.includes(email)) {
      toast.error("Este e-mail já está vinculado");
      return;
    }

    onEmailsChange([...emailsVinculados, email]);
    setNovoEmail("");
    toast.success("E-mail vinculado!");
  };

  const handleRemoveEmail = (email: string) => {
    onEmailsChange(emailsVinculados.filter((e) => e !== email));
    toast.success("E-mail removido!");
  };

  const handleAddWhatsapp = () => {
    const whatsapp = novoWhatsapp.replace(/\D/g, "");
    if (!whatsapp) return;

    if (!validateWhatsApp(novoWhatsapp)) {
      toast.error("WhatsApp inválido");
      return;
    }

    if (whatsappsVinculados.some((w) => w.replace(/\D/g, "") === whatsapp)) {
      toast.error("Este WhatsApp já está vinculado");
      return;
    }

    onWhatsappsChange([...whatsappsVinculados, novoWhatsapp]);
    setNovoWhatsapp("");
    toast.success("WhatsApp vinculado!");
  };

  const handleRemoveWhatsapp = (whatsapp: string) => {
    onWhatsappsChange(whatsappsVinculados.filter((w) => w !== whatsapp));
    toast.success("WhatsApp removido!");
  };

  return (
    <div className="space-y-6">
      {/* Emails Vinculados */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-sm">E-mails Vinculados</h4>
          <Badge variant="secondary" className="text-xs">
            {emailsVinculados.length}
          </Badge>
        </div>

        {/* Lista de emails */}
        {emailsVinculados.length > 0 && (
          <div className="space-y-2 mb-4">
            {emailsVinculados.map((email, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
              >
                <span className="text-sm truncate flex-1">{email}</span>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemoveEmail(email)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Adicionar novo email */}
        {!disabled && (
          <div className="flex gap-2">
            <Input
              placeholder="Digite um e-mail..."
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddEmail()}
              className="h-9 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddEmail}
              className="shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      {/* WhatsApps Vinculados */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Phone className="w-4 h-4 text-primary" />
          <h4 className="font-medium text-sm">WhatsApps Vinculados</h4>
          <Badge variant="secondary" className="text-xs">
            {whatsappsVinculados.length}
          </Badge>
        </div>

        {/* Lista de whatsapps */}
        {whatsappsVinculados.length > 0 && (
          <div className="space-y-2 mb-4">
            {whatsappsVinculados.map((whatsapp, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
              >
                <span className="text-sm truncate flex-1">{whatsapp}</span>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleRemoveWhatsapp(whatsapp)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Adicionar novo whatsapp */}
        {!disabled && (
          <div className="flex gap-2">
            <Input
              placeholder="Digite um WhatsApp..."
              value={novoWhatsapp}
              onChange={(e) => setNovoWhatsapp(maskWhatsApp(e.target.value))}
              onKeyDown={(e) => e.key === "Enter" && handleAddWhatsapp()}
              className="h-9 text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddWhatsapp}
              className="shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
