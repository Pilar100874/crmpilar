import { Message } from "@/pages/ChatWebhook";
import { Badge } from "@/components/ui/badge";
import { User, Webhook, Music, Image as ImageIcon, File, Variable } from "lucide-react";
import { format } from "date-fns";

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  const renderContent = () => {
    switch (message.contentType) {
      case "audio":
        return (
          <div className="space-y-2">
            {message.fileUrl && (
              <audio controls className="w-full max-w-md">
                <source src={message.fileUrl} type="audio/webm" />
                Seu navegador não suporta o elemento de áudio.
              </audio>
            )}
            {message.content && <p className="text-sm text-muted-foreground">{message.content}</p>}
          </div>
        );

      case "image":
        return (
          <div className="space-y-2">
            {message.fileUrl && (
              <img
                src={message.fileUrl}
                alt={message.fileName || "Imagem"}
                className="max-w-md rounded-lg border border-border shadow-sm"
              />
            )}
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        );

      case "file":
        return (
          <div className="space-y-2">
            {message.fileUrl && (
              <a
                href={message.fileUrl}
                download={message.fileName}
                className="flex items-center gap-2 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
              >
                <File className="h-5 w-5 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{message.fileName || "Arquivo"}</p>
                  <p className="text-xs text-muted-foreground">Clique para baixar</p>
                </div>
              </a>
            )}
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        );

      case "variable":
        return (
          <div className="space-y-2">
            {message.variables && (
              <div className="bg-muted p-3 rounded-lg space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Variáveis:</p>
                {Object.entries(message.variables).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm font-mono">
                    <span className="text-primary font-semibold">{key}:</span>
                    <span>{value}</span>
                  </div>
                ))}
              </div>
            )}
            {message.content && <p className="text-sm">{message.content}</p>}
          </div>
        );

      default:
        return <p className="text-sm whitespace-pre-wrap">{message.content}</p>;
    }
  };

  const getIcon = () => {
    if (isUser) return <User className="h-4 w-4" />;
    return <Webhook className="h-4 w-4" />;
  };

  const getTypeIcon = () => {
    switch (message.contentType) {
      case "audio":
        return <Music className="h-3 w-3" />;
      case "image":
        return <ImageIcon className="h-3 w-3" />;
      case "file":
        return <File className="h-3 w-3" />;
      case "variable":
        return <Variable className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div className={`flex gap-3 animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          {getIcon()}
        </div>
      )}
      
      <div className={`flex flex-col gap-1 max-w-[70%] ${isUser ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2">
          <Badge variant={isUser ? "default" : "secondary"} className="text-xs">
            {isUser ? "Você" : "Assistente"}
          </Badge>
          {message.contentType !== "text" && (
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              {getTypeIcon()}
              {message.contentType}
            </Badge>
          )}
        </div>
        
        <div
          className={`p-3 rounded-lg ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          }`}
        >
          {renderContent()}
        </div>
        
        <span className="text-xs text-muted-foreground">
          {format(message.timestamp, "HH:mm")}
        </span>
      </div>
      
      {isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          {getIcon()}
        </div>
      )}
    </div>
  );
}
