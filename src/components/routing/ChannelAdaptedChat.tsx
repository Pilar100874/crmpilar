import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  sender: "user" | "bot" | "system";
  text: string;
  timestamp: Date;
}

interface ChannelAdaptedChatProps {
  messages: ChatMessage[];
  canal: string;
}

const channelStyles = {
  whatsapp: {
    container: "bg-[#0b141a]",
    header: "bg-[#202c33] border-[#2a3942]",
    chatArea: "bg-[#0b141a]",
    userBubble: "bg-[#005c4b] text-white",
    botBubble: "bg-[#202c33] text-white",
    userIcon: "bg-[#00a884]",
    botIcon: "bg-[#667781]",
    timestamp: "text-[#667781]",
    input: "bg-[#202c33] border-[#2a3942] text-white placeholder:text-[#667781]",
  },
  telegram: {
    container: "bg-white dark:bg-[#212121]",
    header: "bg-[#2481cc] dark:bg-[#1e88e5] border-[#2481cc]",
    chatArea: "bg-[#f4f4f5] dark:bg-[#0e0e0e]",
    userBubble: "bg-[#2481cc] text-white",
    botBubble: "bg-white dark:bg-[#212121] text-foreground border border-border",
    userIcon: "bg-[#2481cc]",
    botIcon: "bg-[#7e8c98]",
    timestamp: "text-muted-foreground",
    input: "bg-white dark:bg-[#212121] border-border",
  },
  instagram: {
    container: "bg-white dark:bg-black",
    header: "bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 border-transparent",
    chatArea: "bg-white dark:bg-black",
    userBubble: "bg-gradient-to-r from-purple-600 to-pink-600 text-white",
    botBubble: "bg-muted text-foreground",
    userIcon: "bg-gradient-to-r from-purple-600 to-pink-600",
    botIcon: "bg-muted-foreground",
    timestamp: "text-muted-foreground",
    input: "bg-muted border-border",
  },
  facebook: {
    container: "bg-white dark:bg-[#18191a]",
    header: "bg-[#0084ff] dark:bg-[#0a7cff] border-[#0084ff]",
    chatArea: "bg-[#f0f2f5] dark:bg-[#242526]",
    userBubble: "bg-[#0084ff] text-white",
    botBubble: "bg-[#e4e6eb] dark:bg-[#3a3b3c] text-foreground",
    userIcon: "bg-[#0084ff]",
    botIcon: "bg-[#65676b]",
    timestamp: "text-muted-foreground",
    input: "bg-white dark:bg-[#3a3b3c] border-border",
  },
  webchat: {
    container: "bg-background",
    header: "bg-primary border-primary",
    chatArea: "bg-background",
    userBubble: "bg-primary text-primary-foreground",
    botBubble: "bg-muted text-foreground",
    userIcon: "bg-primary",
    botIcon: "bg-muted-foreground",
    timestamp: "text-muted-foreground",
    input: "bg-background border-border",
  },
};

export default function ChannelAdaptedChat({ messages, canal }: ChannelAdaptedChatProps) {
  const style = channelStyles[canal as keyof typeof channelStyles] || channelStyles.webchat;

  const getChannelName = () => {
    const names: Record<string, string> = {
      whatsapp: "WhatsApp",
      telegram: "Telegram",
      instagram: "Instagram",
      facebook: "Facebook Messenger",
      webchat: "WebChat",
    };
    return names[canal] || "Chat";
  };

  return (
    <div className={cn("flex flex-col h-full rounded-lg overflow-hidden shadow-lg", style.container)}>
      {/* Header */}
      <div className={cn("px-4 py-3 border-b", style.header)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">{getChannelName()} Simulator</p>
            <p className="text-xs text-white/80">Online</p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn("flex-1 overflow-y-auto p-4 space-y-3", style.chatArea)}>
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              Envie uma mensagem para iniciar a conversa
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.sender === "user";
            const isSystem = msg.sender === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <Badge variant="outline" className="text-xs">
                    {msg.text}
                  </Badge>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-2 animate-in slide-in-from-bottom-2 duration-300",
                  isUser ? "justify-end" : "justify-start"
                )}
              >
                {!isUser && (
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", style.botIcon)}>
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}

                <div className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}>
                  <div
                    className={cn(
                      "px-3 py-2 rounded-lg max-w-xs break-words shadow-sm",
                      isUser ? style.userBubble : style.botBubble,
                      canal === "whatsapp" && (isUser ? "rounded-tr-none" : "rounded-tl-none"),
                      canal === "telegram" && "rounded-xl",
                      canal === "instagram" && "rounded-2xl"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                  </div>
                  <span className={cn("text-xs px-1", style.timestamp)}>
                    {format(msg.timestamp, "HH:mm")}
                  </span>
                </div>

                {isUser && (
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", style.userIcon)}>
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
