import { Mail, Inbox, Send, Archive, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailEmptyStateProps {
  folder: "inbox" | "sent" | "trash" | "archive";
}

const folderConfig = {
  inbox: {
    icon: Inbox,
    title: "Caixa de entrada vazia",
    description: "Não há emails para exibir. Novos emails aparecerão aqui.",
  },
  sent: {
    icon: Send,
    title: "Nenhum email enviado",
    description: "Os emails que você enviar aparecerão aqui.",
  },
  archive: {
    icon: Archive,
    title: "Arquivo vazio",
    description: "Os emails arquivados aparecerão aqui.",
  },
  trash: {
    icon: Trash2,
    title: "Lixeira vazia",
    description: "Os emails excluídos aparecerão aqui.",
  },
};

export function EmailEmptyState({ folder }: EmailEmptyStateProps) {
  const config = folderConfig[folder];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-medium mb-2">{config.title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        {config.description}
      </p>
    </div>
  );
}
