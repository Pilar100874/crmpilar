import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MessageSquare, Image, Video, Type, User, 
  ArrowRight, BookOpen, FileText,
  FileSpreadsheet, File, LinkIcon, Paperclip, ExternalLink
} from "lucide-react";
import { ContentItem, ContactForBulkSend } from "../types";
import { cn } from "@/lib/utils";

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
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState(0);

  // Get the contact for preview based on selection
  const previewContact = selectedContacts[selectedPreviewIndex] || selectedContacts[0] || {
    id: 'default',
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
    <div className="flex flex-col h-full">
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Preview da Mensagem */}
          <div className="border rounded-lg flex flex-col min-h-0">
            <div className="px-4 py-3 border-b bg-muted/30 shrink-0">
              <h3 className="font-medium text-sm">Preview da Mensagem</h3>
              <p className="text-xs text-muted-foreground">
                Clique em um contato para visualizar
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {/* Contato selecionado para preview */}
                <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-primary/5">
                  <User className="h-8 w-8 p-1 rounded-full bg-primary/20 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{previewContact.nome}</p>
                    <p className="text-xs text-muted-foreground">{previewContact.telefone || previewContact.email}</p>
                  </div>
                </div>

                {contentItems.map((item) => (
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
                                Clique para abrir
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

          {/* Resumo e Lista de Contatos */}
          <div className="space-y-4 min-h-0 flex flex-col">
            {/* Resumo */}
            <Card className="p-4 shrink-0">
              <h4 className="font-medium mb-3 text-sm">Resumo do Envio</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-xs text-muted-foreground">Contatos</span>
                  <Badge variant="secondary">{selectedContacts.length}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-xs text-muted-foreground">Itens</span>
                  <Badge variant="secondary">{contentItems.length}</Badge>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {contentItems.filter(i => i.type === 'text').length > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Type className="h-3 w-3" />
                    {contentItems.filter(i => i.type === 'text').length}
                  </Badge>
                )}
                {contentItems.filter(i => i.type === 'image').length > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Image className="h-3 w-3" />
                    {contentItems.filter(i => i.type === 'image').length}
                  </Badge>
                )}
                {contentItems.filter(i => i.type === 'video').length > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Video className="h-3 w-3" />
                    {contentItems.filter(i => i.type === 'video').length}
                  </Badge>
                )}
                {contentItems.filter(i => i.type === 'catalog').length > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs bg-primary/10 text-primary border-primary/30">
                    <BookOpen className="h-3 w-3" />
                    {contentItems.filter(i => i.type === 'catalog').length}
                  </Badge>
                )}
                {contentItems.filter(i => i.type === 'file').length > 0 && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Paperclip className="h-3 w-3" />
                    {contentItems.filter(i => i.type === 'file').length}
                  </Badge>
                )}
              </div>
            </Card>

            {/* Lista de Contatos - Clicável */}
            <Card className="p-4 flex-1 min-h-0 flex flex-col">
              <h4 className="font-medium mb-3 text-sm shrink-0">
                Contatos ({selectedContacts.length})
                <span className="text-xs font-normal text-muted-foreground ml-2">
                  Clique para visualizar
                </span>
              </h4>
              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {selectedContacts.slice(0, 20).map((contact, index) => (
                    <div 
                      key={contact.id} 
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                        selectedPreviewIndex === index 
                          ? "bg-primary/20 border border-primary/30" 
                          : "bg-muted/50 hover:bg-muted"
                      )}
                      onClick={() => setSelectedPreviewIndex(index)}
                    >
                      <User className={cn(
                        "h-6 w-6 p-1 rounded-full shrink-0",
                        selectedPreviewIndex === index 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary/20 text-primary"
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{contact.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.telefone || contact.email}
                        </p>
                      </div>
                      {selectedPreviewIndex === index && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          Visualizando
                        </Badge>
                      )}
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
        </div>
      </div>

      {/* Footer - Always at bottom */}
      <div className="flex items-center justify-between pt-4 border-t mt-4 shrink-0">
        <Button variant="outline" onClick={onBack}>
          Voltar
        </Button>
        <Button onClick={onNext}>
          Continuar
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
