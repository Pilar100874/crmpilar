import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, Image, Video, Type, User, 
  Building2, Phone, ArrowRight
} from "lucide-react";
import { ContentItem, ContactForBulkSend } from "../types";

interface StepPreviewProps {
  contentItems: ContentItem[];
  selectedContacts: ContactForBulkSend[];
  onBack: () => void;
  onNext: () => void;
}

export function StepPreview({
  contentItems,
  selectedContacts,
  onBack,
  onNext
}: StepPreviewProps) {
  // Simular substituição de variáveis para preview
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Preview da Mensagem */}
        <div className="border rounded-lg">
          <div className="px-4 py-3 border-b bg-muted/30">
            <h3 className="font-medium">Preview da Mensagem</h3>
            <p className="text-xs text-muted-foreground">
              Como a mensagem aparecerá para os contatos
            </p>
          </div>
          <ScrollArea className="h-[400px]">
            <div className="p-4 space-y-3">
              {/* Simular conversa WhatsApp */}
              <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-primary/5">
                <User className="h-8 w-8 p-1 rounded-full bg-primary/20 text-primary" />
                <div>
                  <p className="font-medium text-sm">{previewContact.nome}</p>
                  <p className="text-xs text-muted-foreground">{previewContact.telefone}</p>
                </div>
              </div>

              {contentItems.map((item, index) => (
                <div key={item.id} className="flex justify-end">
                  <Card className="max-w-[85%] p-3 bg-primary/10 border-primary/20">
                    {item.type === 'text' && (
                      <p className="text-sm whitespace-pre-wrap">
                        {replaceVariables(item.content)}
                      </p>
                    )}
                    {item.type === 'quick_reply' && (
                      <p className="text-sm whitespace-pre-wrap">
                        {replaceVariables(item.content)}
                      </p>
                    )}
                    {item.type === 'image' && (
                      <div className="rounded overflow-hidden">
                        <img
                          src={item.mediaUrl}
                          alt={item.content}
                          className="max-w-full h-auto"
                        />
                      </div>
                    )}
                    {item.type === 'video' && (
                      <div className="rounded overflow-hidden">
                        <video
                          src={item.mediaUrl}
                          controls
                          className="max-w-full h-auto"
                        />
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">
                      {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </Card>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Resumo */}
        <div className="space-y-4">
          <Card className="p-4">
            <h4 className="font-medium mb-3">Resumo do Envio</h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Contatos selecionados</span>
                <Badge variant="secondary">{selectedContacts.length}</Badge>
              </div>
              
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-muted-foreground">Itens na sequência</span>
                <Badge variant="secondary">{contentItems.length}</Badge>
              </div>

              <div className="py-2">
                <span className="text-sm text-muted-foreground">Composição:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {contentItems.filter(i => i.type === 'text').length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Type className="h-3 w-3" />
                      {contentItems.filter(i => i.type === 'text').length} textos
                    </Badge>
                  )}
                  {contentItems.filter(i => i.type === 'quick_reply').length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {contentItems.filter(i => i.type === 'quick_reply').length} prontos
                    </Badge>
                  )}
                  {contentItems.filter(i => i.type === 'image').length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Image className="h-3 w-3" />
                      {contentItems.filter(i => i.type === 'image').length} imagens
                    </Badge>
                  )}
                  {contentItems.filter(i => i.type === 'video').length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Video className="h-3 w-3" />
                      {contentItems.filter(i => i.type === 'video').length} vídeos
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium mb-3">Amostra de Contatos</h4>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {selectedContacts.slice(0, 10).map(contact => (
                  <div key={contact.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <User className="h-6 w-6 p-1 rounded-full bg-primary/20 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{contact.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{contact.telefone}</p>
                    </div>
                  </div>
                ))}
                {selectedContacts.length > 10 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    e mais {selectedContacts.length - 10} contatos...
                  </p>
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext}>
          Agendar Próximo Contato
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
