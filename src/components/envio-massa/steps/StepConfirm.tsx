import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, MessageSquare, Calendar, Loader2, 
  CheckCircle2, AlertCircle, Send, Mail, User,
  Image, Video, BookOpen, FileText, FileSpreadsheet,
  File, LinkIcon, Paperclip, ExternalLink
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
  const previewContact = selectedContacts[0] || {
    nome: 'João Silva',
    empresa: 'Empresa Exemplo',
    telefone: '(11) 99999-9999',
    email: 'joao@email.com'
  };

  const replaceVariables = (text: string) => {
    return text
      .replace(/\{\{contato\}\}/gi, previewContact.nome)
      .replace(/\{\{empresa\}\}/gi, previewContact.empresa || 'N/A')
      .replace(/\{\{whatsapp\}\}/gi, previewContact.telefone || 'N/A')
      .replace(/\{\{email\}\}/gi, previewContact.email || 'N/A');
  };

  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'pdf': return <FileText className="h-6 w-6 text-red-500" />;
      case 'excel': return <FileSpreadsheet className="h-6 w-6 text-green-500" />;
      case 'word': return <File className="h-6 w-6 text-blue-500" />;
      case 'link': return <LinkIcon className="h-6 w-6 text-blue-500" />;
      default: return <Paperclip className="h-6 w-6 text-muted-foreground" />;
    }
  };

  if (isSending) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-6">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Header Card */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium flex items-center gap-2">
                Confirmar Envio
                {canal && (
                  <Badge variant={canal === 'whatsapp' ? 'default' : 'secondary'} className={canal === 'whatsapp' ? 'bg-green-500' : 'bg-blue-500'}>
                    {canal === 'whatsapp' ? 'WhatsApp' : 'E-mail'}
                  </Badge>
                )}
              </h3>
              <p className="text-xs text-muted-foreground">Revise os dados antes de confirmar</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-bold">{selectedContacts.length}</p>
                <p className="text-[10px] text-muted-foreground">Contatos</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <MessageSquare className="h-5 w-5 text-primary" />
              <div>
                <p className="text-lg font-bold">{contentItems.length}</p>
                <p className="text-[10px] text-muted-foreground">Itens</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
              <Calendar className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{format(proximaDataContato, "dd/MM")}</p>
                <p className="text-[10px] text-muted-foreground">Retorno</p>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Preview do Conteúdo - Igual ao StepPreview */}
          <Card className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4" />
              Preview do Conteúdo
            </h4>
            <ScrollArea className="h-[250px]">
              <div className="space-y-2">
                {/* Preview contact header */}
                <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 mb-3">
                  <User className="h-6 w-6 p-1 rounded-full bg-primary/20 text-primary" />
                  <div>
                    <p className="font-medium text-xs">{previewContact.nome}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {canal === 'email' ? previewContact.email : previewContact.telefone}
                    </p>
                  </div>
                </div>

                {contentItems.map((item) => (
                  <div key={item.id} className="flex justify-end">
                    <Card className="max-w-[90%] p-2 bg-primary/10 border-primary/20">
                      {(item.type === 'text' || item.type === 'quick_reply') && (
                        <p className="text-xs whitespace-pre-wrap line-clamp-3">
                          {replaceVariables(item.content)}
                        </p>
                      )}
                      {item.type === 'image' && (
                        <div className="rounded overflow-hidden">
                          {item.mediaUrl ? (
                            <img src={item.mediaUrl} alt={item.content} className="max-w-full h-16 object-cover rounded" />
                          ) : (
                            <div className="flex items-center justify-center bg-muted p-2 rounded">
                              <Image className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      )}
                      {item.type === 'video' && (
                        <div className="flex items-center gap-2 p-2 bg-background/50 rounded">
                          <Video className="h-5 w-5 text-muted-foreground" />
                          <span className="text-xs">Vídeo</span>
                        </div>
                      )}
                      {item.type === 'catalog' && (
                        <div className="flex items-center gap-2 p-2 bg-background/50 rounded border">
                          {item.mediaUrl ? (
                            <img src={item.mediaUrl} alt={item.catalogName || 'Catálogo'} className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 flex items-center justify-center bg-primary/10 rounded">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">
                              <FileText className="h-2 w-2 mr-0.5" />PDF
                            </Badge>
                            <p className="text-xs font-medium truncate">{item.catalogName || 'Catálogo'}</p>
                          </div>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      {item.type === 'file' && (
                        <div className="flex items-center gap-2 p-2 bg-background/50 rounded border">
                          <div className="w-8 h-8 flex items-center justify-center bg-muted rounded">
                            {getFileIcon(item.fileType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="text-[10px]">
                              {item.fileType === 'link' ? 'Link' : 'Anexo'}
                            </Badge>
                            <p className="text-xs truncate">{item.content.replace('📎 ', '')}</p>
                          </div>
                        </div>
                      )}
                      <p className="text-[8px] text-muted-foreground mt-1 text-right">
                        {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </Card>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Destinatários */}
          <Card className="p-4">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" />
              Destinatários ({selectedContacts.length})
            </h4>
            <ScrollArea className="h-[250px]">
              <div className="space-y-1">
                {selectedContacts.slice(0, 30).map(contact => (
                  <div key={contact.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-medium text-primary">
                      {contact.nome.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs truncate flex-1">{contact.nome}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {canal === 'email' ? contact.email : contact.telefone}
                    </span>
                  </div>
                ))}
                {selectedContacts.length > 30 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    e mais {selectedContacts.length - 30} contatos...
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Warning */}
        <Card className="p-3 border-amber-200 bg-amber-50/50 dark:bg-amber-900/20 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Serão criadas tarefas no calendário para {format(proximaDataContato, "dd 'de' MMMM", { locale: ptBR })}.
                Esta ação não pode ser desfeita.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Footer - Always at bottom */}
      <div className="flex items-center justify-between pt-4 border-t mt-4 shrink-0">
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
