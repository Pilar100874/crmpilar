import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, MessageSquare, Calendar, Loader2, 
  CheckCircle2, AlertCircle, Send, Mail
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContentItem, ContactForBulkSend, CanalEnvio } from "../types";

interface StepConfirmProps {
  contentItems: ContentItem[];
  selectedContacts: ContactForBulkSend[];
  proximaDataContato: Date;
  isSending: boolean;
  progress: number;
  onBack: () => void;
  onConfirm: () => void;
  canal: CanalEnvio | null;
}

export function StepConfirm({
  contentItems,
  selectedContacts,
  proximaDataContato,
  isSending,
  progress,
  onBack,
  onConfirm,
  canal
}: StepConfirmProps) {
  if (isSending) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-6">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <div className="text-center">
          <h3 className="text-xl font-medium">Processando envio em massa...</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Aguarde enquanto registramos os atendimentos
          </p>
        </div>
        <div className="w-full max-w-md">
          <Progress value={progress} className="h-3" />
          <p className="text-center text-sm text-muted-foreground mt-2">
            {Math.round(progress)}% concluído
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-lg flex items-center gap-2">
              Confirmar Envio em Massa
              {canal && (
                <Badge variant={canal === 'whatsapp' ? 'default' : 'secondary'} className={canal === 'whatsapp' ? 'bg-green-500' : 'bg-blue-500'}>
                  {canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                </Badge>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">
              Revise os dados antes de confirmar
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{selectedContacts.length}</p>
                <p className="text-xs text-muted-foreground">Contatos</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <MessageSquare className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{contentItems.length}</p>
                <p className="text-xs text-muted-foreground">Mensagens</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">
                  {format(proximaDataContato, "dd/MM/yyyy")}
                </p>
                <p className="text-xs text-muted-foreground">Próximo contato</p>
              </div>
            </div>
          </Card>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Conteúdo a ser enviado
          </h4>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {contentItems.map((item, index) => (
                <div key={item.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  <Badge variant="secondary" className="shrink-0">{index + 1}</Badge>
                  <div className="min-w-0">
                    <Badge variant="outline" className="mb-1 text-xs">
                      {item.type === 'text' ? 'Texto' : 
                       item.type === 'quick_reply' ? 'Pronto' : 
                       item.type === 'image' ? 'Imagem' : 'Vídeo'}
                    </Badge>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.content}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Users className="h-4 w-4" />
            Destinatários
          </h4>
          <ScrollArea className="h-[200px]">
            <div className="space-y-1">
              {selectedContacts.slice(0, 20).map(contact => (
                <div key={contact.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    {contact.nome.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm truncate flex-1">{contact.nome}</span>
                  <span className="text-xs text-muted-foreground">
                    {canal === 'email' ? contact.email : contact.telefone}
                  </span>
                </div>
              ))}
              {selectedContacts.length > 20 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  e mais {selectedContacts.length - 20} contatos...
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <Card className="p-4 border-amber-200 bg-amber-50/50">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Atenção</h4>
            <p className="text-sm text-amber-700">
              Ao confirmar, serão criadas novas tarefas no calendário para cada contato 
              com a data de {format(proximaDataContato, "dd 'de' MMMM", { locale: ptBR })}.
              Esta ação não pode ser desfeita facilmente.
            </p>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onConfirm} className="gap-2">
          <Send className="h-4 w-4" />
          Confirmar Envio
        </Button>
      </div>
    </div>
  );
}
