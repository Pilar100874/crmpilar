import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, Image, Video, Type, User, 
  Building2, Phone, ArrowRight, BookOpen, FileText,
  FileSpreadsheet, File, LinkIcon, Paperclip, ExternalLink
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

  const getFileIcon = (fileType?: string) => {
    switch (fileType) {
      case 'pdf': return <FileText className="h-8 w-8 text-red-500" />;
      case 'excel': return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
      case 'word': return <File className="h-8 w-8 text-blue-500" />;
      case 'link': return <LinkIcon className="h-8 w-8 text-blue-500" />;
      default: return <Paperclip className="h-8 w-8 text-muted-foreground" />;
    }
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
                        {item.mediaUrl ? (
                          <img
                            src={item.mediaUrl}
                            alt={item.content}
                            className="max-w-full h-auto rounded"
                          />
                        ) : (
                          <div className="flex items-center justify-center bg-muted p-4 rounded">
                            <Image className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
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
                    {item.type === 'catalog' && (
                      <div className="rounded overflow-hidden">
                        <div className="flex items-center gap-3 p-3 bg-background/50 rounded border">
                          {item.mediaUrl ? (
                            <img
                              src={item.mediaUrl}
                              alt={item.catalogName || 'Catálogo'}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : (
                            <div className="w-16 h-16 flex items-center justify-center bg-primary/10 rounded">
                              <BookOpen className="h-8 w-8 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <Badge className="mb-1 bg-red-100 text-red-700 border-red-200">
                              <FileText className="h-3 w-3 mr-1" />
                              PDF
                            </Badge>
                            <p className="text-sm font-medium truncate">
                              {item.catalogName || 'Catálogo'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Clique para abrir o catálogo
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </div>
                    )}
                    {item.type === 'file' && (
                      <div className="rounded overflow-hidden">
                        <div className="flex items-center gap-3 p-3 bg-background/50 rounded border">
                          <div className="w-12 h-12 flex items-center justify-center bg-muted rounded">
                            {getFileIcon(item.fileType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <Badge variant="outline" className="mb-1">
                              {item.fileType === 'link' ? 'Link' : 'Anexo'}
                            </Badge>
                            <p className="text-sm font-medium truncate">
                              {item.content.replace('📎 ', '')}
                            </p>
                          </div>
                          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
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
                  {contentItems.filter(i => i.type === 'catalog').length > 0 && (
                    <Badge variant="outline" className="gap-1 bg-primary/10 text-primary border-primary/30">
                      <BookOpen className="h-3 w-3" />
                      {contentItems.filter(i => i.type === 'catalog').length} catálogos
                    </Badge>
                  )}
                  {contentItems.filter(i => i.type === 'file').length > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Paperclip className="h-3 w-3" />
                      {contentItems.filter(i => i.type === 'file').length} anexos
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
