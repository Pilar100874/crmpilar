import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Mail, 
  Star, 
  Send, 
  Archive, 
  Trash2, 
  FileText, 
  Inbox, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  Paperclip,
  Reply,
  Forward,
  MoreHorizontal,
  Clock,
  Eye,
  EyeOff
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Email {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: string;
  hasAttachment?: boolean;
  tracking_id?: string;
  opened_at?: string | null;
  opened_count?: number;
  customer?: {
    id?: string;
    nome?: string;
    telefone?: string;
    email?: string;
  };
}

interface EmailPanelProps {
  emails: Email[];
  selectedEmailId: string | null;
  selectedEmailData: Email | null;
  emailFolder: string;
  onFolderChange: (folder: string) => void;
  onEmailSelect: (id: string, data: Email) => void;
  onEmailClose: () => void;
  onComposeClick: () => void;
  onRefresh: () => void;
  onToggleDetails?: () => void;
  showDetailsToggle?: boolean;
  onReply?: (email: Email) => void;
  onForward?: (email: Email) => void;
  toolsSlot?: React.ReactNode;
  hideToolbar?: boolean;
}

const folders = [
  { id: "inbox", label: "Entrada", icon: Inbox, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { id: "starred", label: "Favoritos", icon: Star, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
  { id: "sent", label: "Enviados", icon: Send, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { id: "drafts", label: "Rascunhos", icon: FileText, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30" },
  { id: "archive", label: "Arquivo", icon: Archive, color: "text-foreground/70 dark:text-muted-foreground", bg: "bg-muted dark:bg-foreground/30" },
  { id: "trash", label: "Lixeira", icon: Trash2, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
];

export function EmailPanel({
  emails,
  selectedEmailId,
  selectedEmailData,
  emailFolder,
  onFolderChange,
  onEmailSelect,
  onEmailClose,
  onComposeClick,
  onRefresh,
  onToggleDetails,
  showDetailsToggle,
  onReply,
  onForward,
  toolsSlot,
  hideToolbar = false,
}: EmailPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const getUnreadCount = (folderId: string) => {
    if (folderId === "starred") {
      return emails.filter(e => e.starred).length;
    }
    return emails.filter(e => e.folder === folderId && !e.read).length;
  };

  const getFilteredEmails = () => {
    let filtered = emails;
    
    if (emailFolder === "starred") {
      filtered = emails.filter(e => e.starred);
    } else {
      filtered = emails.filter(e => e.folder === emailFolder);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e => 
        e.subject?.toLowerCase().includes(term) ||
        e.from_email?.toLowerCase().includes(term) ||
        e.body?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const filteredEmails = getFilteredEmails();

  const getSenderInitial = (email: string) => {
    if (!email) return "?";
    const name = email.match(/^([^<@]+)/)?.[1]?.trim();
    return (name || email).charAt(0).toUpperCase();
  };

  const getSenderName = (email: string) => {
    if (!email) return "Desconhecido";
    const match = email.match(/^([^<]+)</);
    if (match) return match[1].trim();
    return email.split("@")[0];
  };

  const formatEmailDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (date >= today) {
      return format(date, "HH:mm", { locale: ptBR });
    } else if (date >= yesterday) {
      return "Ontem";
    } else {
      return format(date, "dd MMM", { locale: ptBR });
    }
  };

  const getPreviewText = (body: string) => {
    if (!body) return "";
    const text = body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    return text.length > 80 ? text.substring(0, 80) + "..." : text;
  };

  const currentFolder = folders.find(f => f.id === emailFolder) || folders[0];

  // Email Detail View
  if (selectedEmailId && selectedEmailData) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {/* Email Header */}
        <div className="flex-shrink-0 border-b bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-2 px-4 py-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onEmailClose}
              className="gap-2 hover:bg-orange-50 dark:hover:bg-orange-950/30"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Voltar</span>
            </Button>
            
            <div className="flex-1" />
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                onClick={() => onReply?.(selectedEmailData)}
              >
                <Reply className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-9 w-9 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                onClick={() => onForward?.(selectedEmailData)}
              >
                <Forward className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-orange-50 dark:hover:bg-orange-950/30">
                <Archive className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-red-50 dark:hover:bg-red-950/30 text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
              {toolsSlot}
              {showDetailsToggle && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={onToggleDetails}
                  className="h-9 w-9 hover:bg-orange-50 dark:hover:bg-orange-950/30"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Email Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-4xl mx-auto">
            {/* Subject */}
            <div className="px-6 pt-6 pb-4 border-b">
              <h1 className="text-xl font-semibold text-foreground mb-2">
                {selectedEmailData.subject || "(Sem assunto)"}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                {format(new Date(selectedEmailData.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </div>
            </div>

            {/* Sender Info */}
            <div className="px-6 py-4 border-b bg-muted/30">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-orange-500/20">
                  {getSenderInitial(selectedEmailData.from_email)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">
                    {getSenderName(selectedEmailData.from_email)}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedEmailData.from_email}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Para:</span>
                <span className="text-foreground">{selectedEmailData.to_email}</span>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-6">
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {selectedEmailData.body}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Quick Reply */}
        <div className="flex-shrink-0 border-t bg-card/80 backdrop-blur-sm p-4">
          <Button 
            className="w-full gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 rounded-xl shadow-lg shadow-orange-500/20"
            onClick={() => onReply?.(selectedEmailData)}
          >
            <Reply className="w-4 h-4" />
            Responder
          </Button>
        </div>
      </div>
    );
  }

  // Email List View
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Toolbar - hide when hideToolbar is true */}
      {!hideToolbar && (
        <div className="flex-shrink-0 border-b bg-gradient-to-r from-orange-50/80 to-white dark:from-orange-950/20 dark:to-background px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Current Folder Indicator */}
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg",
              currentFolder.bg
            )}>
              <currentFolder.icon className={cn("w-4 h-4", currentFolder.color)} />
              <span className={cn("font-semibold text-sm", currentFolder.color)}>
                {currentFolder.label}
              </span>
            </div>
            
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar emails..."
                className="pl-10 h-10 rounded-xl bg-white dark:bg-background border-orange-100 dark:border-orange-900/30 focus:border-orange-300 focus:ring-2 focus:ring-orange-100 dark:focus:ring-orange-900/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300 border-0 px-3 py-1">
              {filteredEmails.length} {filteredEmails.length === 1 ? 'email' : 'emails'}
            </Badge>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-10 w-10 hover:bg-orange-50 dark:hover:bg-orange-950/30"
              onClick={onRefresh}
            >
              <RefreshCw className="w-4 h-4 text-orange-600" />
            </Button>
          </div>
        </div>
      )}

      {/* Email List */}
      <ScrollArea className="flex-1">
        {filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/50 dark:to-orange-950/30 flex items-center justify-center mb-4">
              <Mail className="w-10 h-10 text-orange-400" />
            </div>
            <p className="font-semibold text-foreground">Nenhum email</p>
            <p className="text-sm text-muted-foreground mt-1 text-center">
              {emailFolder === "inbox" 
                ? "Sua caixa de entrada está vazia" 
                : `Nenhum email em ${currentFolder.label}`
              }
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => onEmailSelect(email.id, email)}
                className={cn(
                  "group flex items-start gap-4 px-4 py-4 cursor-pointer transition-all duration-200",
                  "hover:bg-orange-50/50 dark:hover:bg-orange-950/20",
                  !email.read && "bg-orange-50/30 dark:bg-orange-950/10",
                  email.starred && "bg-amber-50/20 dark:bg-amber-950/10"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 font-semibold text-sm shadow-sm transition-all",
                  !email.read 
                    ? "bg-gradient-to-br from-orange-500 to-orange-600 text-white"
                    : "bg-gradient-to-br from-muted to-slate-200 dark:from-slate-700 dark:to-foreground/80 text-foreground/70 dark:text-muted-foreground/60"
                )}>
                  {getSenderInitial(email.from_email)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Unread dot */}
                    {!email.read && (
                      <div className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0 animate-pulse" />
                    )}
                    
                    {/* Sender */}
                    <span className={cn(
                      "text-sm truncate",
                      !email.read ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                    )}>
                      {getSenderName(email.from_email)}
                    </span>
                    
                    {/* Star */}
                    {email.starred && (
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />
                    )}
                    
                    {/* Attachment */}
                    {email.hasAttachment && (
                      <Paperclip className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    
                    {/* Email opened indicator - only for sent emails */}
                    {email.folder === "sent" && email.tracking_id && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex-shrink-0">
                              {email.opened_at ? (
                                <Eye className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {email.opened_at ? (
                              <div className="text-xs">
                                <p className="font-medium text-green-600">Email aberto</p>
                                <p>
                                  Primeira abertura: {new Date(email.opened_at).toLocaleDateString("pt-BR", {
                                    day: "2-digit",
                                    month: "short",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })}
                                </p>
                                {email.opened_count && email.opened_count > 1 && (
                                  <p>Total de aberturas: {email.opened_count}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs">Email ainda não foi aberto</p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    
                    {/* Date */}
                    <span className="text-xs text-muted-foreground ml-auto flex-shrink-0 bg-muted/80 dark:bg-foreground/80/80 px-2 py-0.5 rounded-full">
                      {formatEmailDate(email.date)}
                    </span>
                  </div>
                  
                  {/* Subject */}
                  <p className={cn(
                    "text-sm truncate mb-1",
                    !email.read ? "font-medium text-foreground" : "text-muted-foreground"
                  )}>
                    {email.subject || "(Sem assunto)"}
                  </p>
                  
                  {/* Preview */}
                  <p className="text-xs text-muted-foreground/80 truncate">
                    {getPreviewText(email.body)}
                  </p>
                </div>

                {/* Hover actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Toggle star
                    }}
                  >
                    <Star className={cn(
                      "w-4 h-4",
                      email.starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground"
                    )} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Archive
                    }}
                  >
                    <Archive className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}