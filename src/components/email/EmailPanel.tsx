import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, 
  Star, 
  Search, 
  RefreshCw, 
  ChevronLeft, 
  Paperclip,
  Reply,
  Forward,
  Archive,
  Trash2,
  ChevronRight,
  Clock
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
}

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
}: EmailPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

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
      return format(date, "dd/MM", { locale: ptBR });
    }
  };

  const getPreviewText = (body: string) => {
    if (!body) return "";
    const text = body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    return text.length > 60 ? text.substring(0, 60) + "..." : text;
  };

  // Email detail view
  if (selectedEmailId && selectedEmailData) {
    return (
      <div className="flex-1 flex flex-col min-h-0 bg-background">
        {/* Header */}
        <div className="flex-shrink-0 border-b px-4 py-2.5 flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onEmailClose}
            className="gap-1.5 h-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Reply className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Forward className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Archive className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
            {showDetailsToggle && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onToggleDetails}
                className="h-8 w-8"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto p-6">
            {/* Subject */}
            <h1 className="text-lg font-semibold text-foreground mb-4">
              {selectedEmailData.subject || "(Sem assunto)"}
            </h1>

            {/* Sender Info */}
            <div className="flex items-center gap-3 mb-6 pb-4 border-b">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-medium">
                {getSenderInitial(selectedEmailData.from_email)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  {getSenderName(selectedEmailData.from_email)}
                </p>
                <p className="text-xs text-muted-foreground">
                  para {selectedEmailData.to_email}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {format(new Date(selectedEmailData.date), "dd MMM, HH:mm", { locale: ptBR })}
              </span>
            </div>

            {/* Body */}
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                {selectedEmailData.body}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Quick Reply */}
        <div className="flex-shrink-0 border-t p-3">
          <Button className="w-full gap-2" size="sm">
            <Reply className="w-4 h-4" />
            Responder
          </Button>
        </div>
      </div>
    );
  }

  // Email list view
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      {/* Toolbar */}
      <div className="flex-shrink-0 border-b px-3 py-2.5 flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="pl-8 h-8 text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Badge variant="secondary" className="text-xs">
          {filteredEmails.length}
        </Badge>
        
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          onClick={onRefresh}
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* List */}
      <ScrollArea className="flex-1">
        {filteredEmails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Mail className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Nenhum email</p>
            <p className="text-xs text-muted-foreground mt-1">
              Esta pasta está vazia
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                onClick={() => onEmailSelect(email.id, email)}
                className={cn(
                  "flex items-start gap-3 px-3 py-3 cursor-pointer transition-colors",
                  "hover:bg-muted/50",
                  !email.read && "bg-accent/30"
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium",
                  !email.read 
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}>
                  {getSenderInitial(email.from_email)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    {!email.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm truncate",
                      !email.read ? "font-semibold" : "font-medium text-muted-foreground"
                    )}>
                      {getSenderName(email.from_email)}
                    </span>
                    {email.starred && (
                      <Star className="w-3 h-3 fill-primary text-primary flex-shrink-0" />
                    )}
                    {email.hasAttachment && (
                      <Paperclip className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    )}
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {formatEmailDate(email.date)}
                    </span>
                  </div>
                  
                  <p className={cn(
                    "text-sm truncate mb-0.5",
                    !email.read ? "font-medium" : "text-muted-foreground"
                  )}>
                    {email.subject || "(Sem assunto)"}
                  </p>
                  
                  <p className="text-xs text-muted-foreground truncate">
                    {getPreviewText(email.body)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
