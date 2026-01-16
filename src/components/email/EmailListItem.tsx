import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Star, Paperclip, Clock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Email {
  id: string;
  from_email: string;
  to_email: string;
  subject: string;
  body: string;
  date: string;
  read: boolean;
  starred: boolean;
  folder: "inbox" | "sent" | "trash" | "archive";
  hasAttachment?: boolean;
  tracking_id?: string;
  opened_at?: string | null;
  opened_count?: number;
}

interface EmailListItemProps {
  email: Email;
  isSelected: boolean;
  onSelect: () => void;
  onClick: () => void;
  onStar: () => void;
}

export function EmailListItem({
  email,
  isSelected,
  onSelect,
  onClick,
  onStar,
}: EmailListItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    if (date >= today) {
      return date.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (date >= yesterday) {
      return "Ontem";
    } else {
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
    }
  };

  const getSenderName = (email: string) => {
    const match = email.match(/^([^<]+)</);
    if (match) return match[1].trim();
    return email.split("@")[0];
  };

  const getPreviewText = (body: string) => {
    // Remove HTML tags and get first 100 chars
    const text = body.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    return text.length > 100 ? text.substring(0, 100) + "..." : text;
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 px-4 py-3 border-b transition-all duration-200",
        "hover:bg-accent/50 cursor-pointer",
        !email.read && "bg-primary/5",
        isSelected && "bg-accent"
      )}
    >
      {/* Selection checkbox */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="opacity-0 group-hover:opacity-100 data-[state=checked]:opacity-100 transition-opacity"
        />
      </div>

      {/* Star button */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          onStar();
        }}
      >
        <Star
          className={cn(
            "w-4 h-4 transition-colors",
            email.starred
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground hover:text-yellow-400"
          )}
        />
      </Button>

      {/* Main content */}
      <div className="flex-1 min-w-0" onClick={onClick}>
        <div className="flex items-center gap-2 mb-1">
          {/* Unread indicator */}
          {!email.read && (
            <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
          )}

          {/* Sender */}
          <span
            className={cn(
              "text-sm truncate",
              !email.read ? "font-semibold" : "font-medium"
            )}
          >
            {getSenderName(email.from_email)}
          </span>

          {/* Attachment icon */}
          {email.hasAttachment && (
            <Paperclip className="w-3 h-3 text-muted-foreground shrink-0" />
          )}

          {/* Email opened indicator - only for sent emails */}
          {email.folder === "sent" && email.tracking_id && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="shrink-0">
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
          <span className="text-xs text-muted-foreground ml-auto shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDate(email.date)}
          </span>
        </div>

        {/* Subject */}
        <div
          className={cn(
            "text-sm truncate mb-0.5",
            !email.read ? "font-medium" : "text-foreground"
          )}
        >
          {email.subject || "(Sem assunto)"}
        </div>

        {/* Preview */}
        <div className="text-xs text-muted-foreground truncate">
          {getPreviewText(email.body)}
        </div>
      </div>
    </div>
  );
}
